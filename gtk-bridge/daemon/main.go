package main

import (
	"bufio"
	"encoding/binary"
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/gorilla/websocket"
)

const (
	SocketPath = "/tmp/gtk-bridge.sock"
	WSAddr     = "127.0.0.1:8765"
	MaxFrame   = 64 * 1024 * 1024 // 64 МБ — с запасом на base64-иконки
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// ---------- hub -----------------------------------------------------------

type Hub struct {
	mu      sync.RWMutex
	clients map[*websocket.Conn]struct{}
}

func NewHub() *Hub { return &Hub{clients: map[*websocket.Conn]struct{}{}} }

func (h *Hub) Add(c *websocket.Conn) {
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
}

func (h *Hub) Remove(c *websocket.Conn) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()
}

func (h *Hub) Broadcast(data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		_ = c.WriteMessage(websocket.TextMessage, data)
	}
}

// ---------- websocket -----------------------------------------------------

func startWS(hub *Hub) {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("[ws] upgrade: %v", err)
			return
		}
		log.Printf("[ws] client connected")
		hub.Add(c)
		defer func() {
			hub.Remove(c)
			c.Close()
			log.Printf("[ws] client disconnected")
		}()
		for {
			if _, _, err := c.ReadMessage(); err != nil {
				return
			}
		}
	})
	log.Printf("[ws] listening on ws://%s", WSAddr)
	if err := http.ListenAndServe(WSAddr, mux); err != nil {
		log.Fatalf("[ws] server error: %v", err)
	}
}

// ---------- unix socket ---------------------------------------------------

func startSocket(hub *Hub) {
	os.Remove(SocketPath)
	ln, err := net.Listen("unix", SocketPath)
	if err != nil {
		log.Fatalf("[ipc] listen: %v", err)
	}
	_ = os.Chmod(SocketPath, 0o666)
	log.Printf("[ipc] listening on %s", SocketPath)

	var mu sync.Mutex
	var nextSession int

	for {
		conn, err := ln.Accept()
		if err != nil {
			log.Printf("[ipc] accept: %v", err)
			continue
		}
		mu.Lock()
		nextSession++
		session := nextSession
		mu.Unlock()
		go handleHook(conn, session, hub)
	}
}

func handleHook(conn net.Conn, session int, hub *Hub) {
	defer conn.Close()

	log.Printf("[ipc] hook #%d connected", session)

	// При старте сессии — говорим клиентам, что сессия открыта
	{
		openMsg, _ := json.Marshal(map[string]any{
			"type":      "session-started",
			"sessionId": session,
		})
		hub.Broadcast(openMsg)
	}

	// При выходе из этой функции — говорим клиентам, что сессия закрыта.
	// Это ключевое: любой оверлей этой сессии должен быть закрыт.
	defer func() {
		endMsg, _ := json.Marshal(map[string]any{
			"type":      "session-ended",
			"sessionId": session,
		})
		hub.Broadcast(endMsg)
		log.Printf("[ipc] hook #%d disconnected (broadcast session-ended)", session)
	}()

	r := bufio.NewReader(conn)
	received := 0

	for {
		var hdr [4]byte
		if _, err := io.ReadFull(r, hdr[:]); err != nil {
			if err != io.EOF {
				log.Printf("[ipc] hook #%d: read hdr: %v", session, err)
			}
			return
		}
		length := binary.LittleEndian.Uint32(hdr[:])
		if length == 0 || length > MaxFrame {
			log.Printf("[ipc] hook #%d: bad length %d", session, length)
			return
		}

		payload := make([]byte, length)
		if _, err := io.ReadFull(r, payload); err != nil {
			log.Printf("[ipc] hook #%d: read payload (%d bytes): %v", session, length, err)
			return
		}
		received++

		var msg map[string]any
		if err := json.Unmarshal(payload, &msg); err != nil {
			preview := payload
			if len(preview) > 300 {
				preview = preview[:300]
			}
			log.Printf("[ipc] hook #%d: bad JSON (%d bytes): %v | preview: %q",
				session, len(payload), err, string(preview))
			continue
		}

		if received <= 3 {
			title, _ := msg["title"].(string)
			typ, _ := msg["type"].(string)
			frame, _ := msg["frame"].(float64)
			log.Printf("[ipc] hook #%d %s frame #%v '%s' (%d bytes)",
				session, typ, frame, title, length)
		}

		msg["sessionId"] = session
		out, _ := json.Marshal(msg)
		hub.Broadcast(out)
	}
}

// ---------- main ----------------------------------------------------------

func main() {
	log.SetFlags(log.Ltime)
	hub := NewHub()

	go startWS(hub)
	go startSocket(hub)

	// Ждём сигнал завершения
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig

	log.Printf("shutting down")
	os.Remove(SocketPath)

	// Сообщаем всем клиентам, что демон уходит
	bye, _ := json.Marshal(map[string]any{"type": "daemon-shutdown"})
	hub.Broadcast(bye)
}