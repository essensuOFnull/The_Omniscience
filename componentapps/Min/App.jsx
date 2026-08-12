import React, { useState, useEffect, useCallback } from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import ConnectionPanel from './components/ConnectionPanel';
import MessageList from './components/MessageList';
import InputPanel from './components/InputPanel';
import { generateId } from './utils/helpers';
import portholeService from './services/portholeService';

const App = () => {
  const [connected, setConnected] = useState(false);
  const [activePort, setActivePort] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newText, setNewText] = useState('');
  const [downloadStates, setDownloadStates] = useState({});
  const [typingUser, setTypingUser] = useState(null);

  useEffect(() => {
    if (!connected) return;

    const unsubMessage = portholeService.onMessage((msg) => {
      const newMsg = {
        id: generateId(),
        sender: msg.sender,
        nickname: msg.nickname,
        type: 'text',
        text: msg.text,
        timestamp: msg.timestamp,
      };
      setMessages((prev) => [...prev, newMsg]);
    });

    const unsubFile = portholeService.onFile((fileData) => {
      const newMsg = {
        id: generateId(),
        sender: fileData.sender,
        nickname: fileData.nickname,
        type: 'file',
        file: fileData.file,
        timestamp: fileData.timestamp,
        downloadedUrl: fileData.downloadedUrl || null,
      };
      // Если файл уже загружен (пришёл Blob), сразу ставим состояние
      if (fileData.downloadedUrl) {
        setDownloadStates((prev) => ({
          ...prev,
          [newMsg.id]: {
            downloading: false,
            progress: 100,
            downloadedUrl: fileData.downloadedUrl,
          },
        }));
      }
      setMessages((prev) => [...prev, newMsg]);
    });

    const unsubTyping = portholeService.onTyping((sender, isTyping) => {
      setTypingUser(isTyping ? sender : null);
    });

    return () => {
      unsubMessage();
      unsubFile();
      unsubTyping();
    };
  }, [connected]);

  const handleCreateServer = useCallback((port) => {
    portholeService.createServer(port);
    setActivePort(port);
    setConnected(true);
  }, []);

  const handleJoinServer = useCallback((port) => {
    portholeService.joinServer(port);
    setActivePort(port);
    setConnected(true);
  }, []);

  const handleDisconnect = useCallback(() => {
    portholeService.disconnect();
    setConnected(false);
    setActivePort(null);
    setMessages([]);
    setDownloadStates({});
    setTypingUser(null);
  }, []);

  const handleSendText = useCallback(() => {
    if (!newText.trim() || !connected) return;
    const sentMsg = portholeService.sendText(newText.trim());
    setMessages((prev) => [...prev, { ...sentMsg, id: generateId() }]);
    setNewText('');
  }, [newText, connected]);

  const handleFileSend = useCallback(async (file) => {
    if (!connected) return;
    const sent = await portholeService.sendFile(file);
    setMessages((prev) => [...prev, { ...sent, id: generateId() }]);
  }, [connected]);

  const handleDropFile = useCallback((file) => {
    handleFileSend(file);
  }, [handleFileSend]);

  const handleDownload = (msgId, fileType) => {
    // В реальной версии здесь будет запрос недостающего контента,
    // но сейчас все файлы приходят сразу готовыми.
  };

  // Уведомления
  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.sender !== 'me' && window.electron_min_API) {
        window.electron_min_API.sendNotification(
          'Porthole Messenger',
          `${last.nickname}: ${last.text || 'Файл'}`
        );
      }
    }
  }, [messages]);

  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="static" color="inherit" elevation={1}>
        <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Min
          </Typography>
          <ConnectionPanel
            connected={connected}
            activePort={activePort}
            onCreateServer={handleCreateServer}
            onJoinServer={handleJoinServer}
            onDisconnect={handleDisconnect}
          />
        </Toolbar>
      </AppBar>

      <MessageList
        messages={messages}
        downloadStates={downloadStates}
        onDownload={handleDownload}
        typingUser={typingUser}
        onDropFile={handleDropFile}
      />

      <InputPanel
        text={newText}
        onTextChange={setNewText}
        onSend={handleSendText}
        onFileSelect={(e) => {
          if (e.target.files[0]) handleFileSend(e.target.files[0]);
          e.target.value = null;
        }}
        disabled={!connected}
      />
    </Box>
  );
};

export default App;