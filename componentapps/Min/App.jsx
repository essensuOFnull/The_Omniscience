import React, { useState, useEffect, useCallback } from 'react';
import {
  AppBar, Toolbar, Typography, Box, Button, IconButton,
  Menu, MenuItem, Avatar, Snackbar, Alert
} from '@mui/material';
import { Phone, ScreenShare, Stop } from '@mui/icons-material';
import ConnectionPanel from './components/ConnectionPanel';
import MessageList from './components/MessageList';
import InputPanel from './components/InputPanel';
import CallPanel from './components/CallPanel';
import IncomingCallDialog from './components/IncomingCallDialog';
import { generateId } from './utils/helpers';
import portholeService from './services/portholeService';
import webrtcService from './services/webrtcService';

const App = () => {
  const [connected, setConnected] = useState(false);
  const [activePort, setActivePort] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newText, setNewText] = useState('');
  const [downloadStates, setDownloadStates] = useState({});
  const [typingUser, setTypingUser] = useState(null);
  const [participants, setParticipants] = useState({});

  // WebRTC states
  const [inCall, setInCall] = useState(false);
  const [callPeerId, setCallPeerId] = useState(null);
  const [screenShareMode, setScreenShareMode] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  // Ошибки для отображения в Snackbar
  const [error, setError] = useState(null);

  // Подписка на сообщения и сигналы
  useEffect(() => {
    if (!connected) return;

    const unsubMessage = portholeService.onMessage((msg) => {
      setMessages(prev => [...prev, {
        id: generateId(),
        sender: msg.sender,
        senderName: msg.nickname,
        type: 'text',
        text: msg.text,
        timestamp: msg.timestamp,
      }]);
    });

    const unsubFile = portholeService.onFile((fileData) => {
      const newMsg = {
        id: generateId(),
        sender: fileData.sender,
        senderName: fileData.nickname,
        type: 'file',
        file: fileData.file,
        timestamp: fileData.timestamp,
        downloadedUrl: fileData.downloadedUrl || null,
      };
      if (fileData.downloadedUrl) {
        setDownloadStates(prev => ({ ...prev, [newMsg.id]: { downloading: false, progress: 100, downloadedUrl: fileData.downloadedUrl } }));
      }
      setMessages(prev => [...prev, newMsg]);
    });

    const unsubTyping = portholeService.onTyping((sender, isTyping) => {
      setTypingUser(isTyping ? sender : null);
    });

    const unsubSignal = portholeService.onSignal((senderPeerId, payload) => {
      if (payload.sdp && payload.sdp.type === 'offer' && !inCall) {
        const nickname = portholeService.getParticipants()[senderPeerId] || 'Неизвестный';
        setIncomingCall({ from: senderPeerId, sdp: payload.sdp, nickname });
      } else {
        webrtcService.handleSignal(senderPeerId, payload);
      }
    });

    const interval = setInterval(() => {
      setParticipants(portholeService.getParticipants());
    }, 1000);

    return () => {
      unsubMessage();
      unsubFile();
      unsubTyping();
      unsubSignal();
      clearInterval(interval);
    };
  }, [connected, inCall]);

  // Подписка на ошибки соединения (для обрыва)
  useEffect(() => {
    portholeService.onConnectionError = (err) => {
      setError('Потеря связи с сервером');
    };
    return () => {
      portholeService.onConnectionError = null;
    };
  }, []);

  // Обработчики подключений
  const handleCreateServer = useCallback((port) => {
    portholeService.createServer(port)
      .then(() => {
        setActivePort(port);
        setConnected(true);
      })
      .catch(err => {
        setError(`Не удалось создать сервер: ${err.message}`);
      });
  }, []);

  const handleJoinServer = useCallback((port) => {
    portholeService.joinServer(port)
      .then(() => {
        setActivePort(port);
        setConnected(true);
      })
      .catch(err => {
        setError(`Не удалось подключиться: ${err.message}`);
      });
  }, []);

  const handleDisconnect = useCallback(() => {
    webrtcService.closeAll();
    setInCall(false);
    setScreenShareMode(false);
    portholeService.disconnect();
    setConnected(false);
    setActivePort(null);
    setMessages([]);
    setDownloadStates({});
    setTypingUser(null);
    setParticipants({});
  }, []);

  // Звонок
  const startCall = useCallback(async (remotePeerId) => {
    setCallPeerId(remotePeerId);
    setScreenShareMode(false);
    await webrtcService.startCamera();
    setLocalStream(webrtcService.localStream);
    webrtcService.onRemoteStream = (peerId, stream) => {
      setRemoteStream(stream);
      setInCall(true);
    };
    webrtcService.call(remotePeerId);
    setInCall(true);
  }, []);

  const startScreenShare = useCallback(async () => {
    setScreenShareMode(true);
    await webrtcService.startScreenShare();
    setLocalStream(webrtcService.localStream);
    setInCall(true);
  }, []);

  const watchStream = useCallback(async () => {
    const hostPeerId = Object.keys(participants).find(id => id !== portholeService.peerId);
    if (!hostPeerId) return;
    await startCall(hostPeerId);
  }, [participants, startCall]);

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return;
    const { from, sdp } = incomingCall;
    setIncomingCall(null);
    await webrtcService.startCamera();
    setLocalStream(webrtcService.localStream);
    webrtcService.onRemoteStream = (peerId, stream) => {
      setRemoteStream(stream);
      setInCall(true);
    };
    await webrtcService.acceptCall(from, sdp);
    setCallPeerId(from);
    setInCall(true);
  }, [incomingCall]);

  const hangUp = useCallback(() => {
    webrtcService.closeAll();
    setInCall(false);
    setCallPeerId(null);
    setScreenShareMode(false);
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  // Отправка сообщений и файлов
  const handleSendText = useCallback(() => {
    if (!newText.trim() || !connected) return;
    const sentMsg = portholeService.sendText(newText.trim());
    setMessages(prev => [...prev, { ...sentMsg, id: generateId() }]);
    setNewText('');
  }, [newText, connected]);

  const handleFileSend = useCallback(async (file) => {
    if (!connected) return;
    const sent = await portholeService.sendFile(file);
    setMessages(prev => [...prev, { ...sent, id: generateId() }]);
  }, [connected]);

  const handleDropFile = useCallback((file) => { handleFileSend(file); }, [handleFileSend]);

  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="static" color="inherit" elevation={1}>
        <Toolbar variant="dense" sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Min</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <ConnectionPanel
              connected={connected}
              activePort={activePort}
              onCreateServer={handleCreateServer}
              onJoinServer={handleJoinServer}
              onDisconnect={handleDisconnect}
            />
            {connected && !inCall && (
              <>
                <IconButton color="primary" onClick={(e) => setAnchorEl(e.currentTarget)} title="Звонок">
                  <Phone />
                </IconButton>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                  {Object.entries(participants).filter(([id]) => id !== portholeService.peerId).map(([id, name]) => (
                    <MenuItem key={id} onClick={() => { setAnchorEl(null); startCall(id); }}>
                      <Avatar sx={{ width: 20, height: 20, mr: 1 }}>{name[0]}</Avatar>
                      {name}
                    </MenuItem>
                  ))}
                </Menu>
                {portholeService.isHost ? (
                  <Button variant="outlined" size="small" startIcon={<ScreenShare />} onClick={startScreenShare}>
                    Стрим
                  </Button>
                ) : (
                  <Button variant="outlined" size="small" startIcon={<ScreenShare />} onClick={watchStream}>
                    Смотреть стрим
                  </Button>
                )}
              </>
            )}
            {inCall && (
              <Button variant="contained" color="error" startIcon={<Stop />} onClick={hangUp}>
                Завершить
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {inCall && (
        <Box sx={{ p: 1, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'primary.main' }}>
          <CallPanel
            localStream={localStream}
            remoteStream={remoteStream}
            onHangup={hangUp}
            isScreenShare={screenShareMode}
          />
        </Box>
      )}

      <MessageList
        messages={messages}
        downloadStates={downloadStates}
        onDownload={() => {}}
        typingUser={typingUser}
        onDropFile={handleDropFile}
      />

      <InputPanel
        text={newText}
        onTextChange={setNewText}
        onSend={handleSendText}
        onFileSelect={(e) => { if (e.target.files[0]) handleFileSend(e.target.files[0]); e.target.value = null; }}
        disabled={!connected}
      />

      {incomingCall && (
        <IncomingCallDialog
          callerName={incomingCall.nickname}
          onAccept={acceptIncomingCall}
          onReject={() => setIncomingCall(null)}
        />
      )}

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default App;