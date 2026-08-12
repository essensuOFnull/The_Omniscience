import { generateTerrariaName } from './usernameGenerator';

class PortholeService {
	constructor() {
		this.ws = null;
		this.peerId = this._generatePeerId();
		this.nickname = generateTerrariaName();
		this.messageHandlers = [];
		this.fileHandlers = [];
		this.typingHandlers = [];
		this.port = null;
		this.isHost = false;
	}

	_generatePeerId() { return Math.random().toString(36).substring(2, 9); }

	createServer(port) {
		this.isHost = true;
		// Если API нет (тест вне Electron) – просто подключаемся с задержкой
		if (!window.electron_min_API) {
			return new Promise(resolve => {
				setTimeout(() => {
					this.connect(port);
					resolve();
				}, 200);
			});
		}

		return new Promise((resolve, reject) => {
			window.electron_min_API.onServerStarted((error, startedPort) => {
				if (error) {
					reject(new Error(error));
				} else {
					resolve(startedPort);
				}
			});
			window.electron_min_API.startServer(port);
		}).then(() => {
			this.connect(port);
		}).catch(err => {
			console.error('Failed to start server:', err);
			// Здесь можно показать уведомление пользователю
		});
	}

	joinServer(port) {
		this.isHost = false;
		this.connect(port);
	}

	connect(port) {
		if (this.ws) this.disconnect();
		this.port = port;
		this.ws = new WebSocket(`ws://localhost:${port}`);

		this.ws.onopen = () => {
			console.log(`Connected (${this.isHost ? 'host' : 'client'})`);
			this._broadcast({ type: 'handshake', sender: this.peerId, nickname: this.nickname });
		};

		this.ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				this._handleMessage(data);
			} catch {
				if (event.data instanceof ArrayBuffer) {
					this._handleFileChunk(event.data);
				}
			}
		};

		this.ws.onerror = (err) => console.error('Porthole error', err);
		this.ws.onclose = () => console.log('Disconnected');
	}

	disconnect() {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		if (this.isHost && window.electron_min_API) {
			window.electron_min_API.stopServer();
			window.electron_min_API.removeServerListeners();
		}
		this.isHost = false;
	}

	sendText(text) {
		const msg = {
			type: 'text',
			sender: this.peerId,
			nickname: this.nickname,
			text,
			timestamp: Date.now(),
		};
		this._broadcast(JSON.stringify(msg));
		return { ...msg, sender: 'me' };
	}

	async sendFile(file) {
		const fileMsg = {
			type: 'file-meta',
			sender: this.peerId,
			nickname: this.nickname,
			file: {
				name: file.name,
				size: file.size,
				type: file.type,
			},
			timestamp: Date.now(),
		};
		// Отправляем метаданные всем
		this._broadcast(JSON.stringify(fileMsg));

		// Читаем и отправляем бинарные данные (для получателей)
		const reader = new FileReader();
		reader.readAsArrayBuffer(file);
		reader.onload = (e) => {
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				this.ws.send(e.target.result);
			}
		};

		// Для себя сразу создаём blob URL, чтобы отобразить как готовый
		const ownUrl = URL.createObjectURL(file);
		return { ...fileMsg, sender: 'me', downloadedUrl: ownUrl };
	}

	sendTyping(isTyping) {
		this._broadcast(JSON.stringify({ type: 'typing', sender: this.peerId, isTyping }));
	}

	onMessage(handler) {
		this.messageHandlers.push(handler);
		return () => this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
	}
	onFile(handler) {
		this.fileHandlers.push(handler);
		return () => this.fileHandlers = this.fileHandlers.filter(h => h !== handler);
	}
	onTyping(handler) {
		this.typingHandlers.push(handler);
		return () => this.typingHandlers = this.typingHandlers.filter(h => h !== handler);
	}

	_broadcast(data) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
		}
	}

	_handleMessage(data) {
		switch (data.type) {
			case 'text':
				this.messageHandlers.forEach(fn => fn(data));
				break;
			case 'file-meta':
				this._lastFileMeta = data;
				this.fileHandlers.forEach(fn => fn(data));
				break;
			case 'typing':
				this.typingHandlers.forEach(fn => fn(data.sender, data.isTyping));
				break;
		}
	}

	_handleFileChunk(arrayBuffer) {
		const blob = new Blob([arrayBuffer]);
		const url = URL.createObjectURL(blob);
		if (this._lastFileMeta) {
			this.fileHandlers.forEach(fn => fn({ ...this._lastFileMeta, downloadedUrl: url }));
		}
	}
}

const portholeService = new PortholeService();
export default portholeService;