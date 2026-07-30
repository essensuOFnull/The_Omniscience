import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FileBrowser, FileList, FileToolbar, FileNavbar } from 'chonky2';

function buildFolderChain(fullPath) {
  if (!fullPath) return [];
  const isWin = /^[a-zA-Z]:\\/.test(fullPath);
  const chain = [];

  if (isWin) {
    const parts = fullPath.split('\\').filter(Boolean);
    let current = parts[0] + '\\';
    chain.push({ id: current, name: current, isDir: true });
    for (let i = 1; i < parts.length; i++) {
      current = current + (current.endsWith('\\') ? '' : '\\') + parts[i];
      chain.push({ id: current, name: parts[i], isDir: true });
    }
  } else {
    chain.push({ id: '/', name: '/', isDir: true });
    const parts = fullPath.replace(/\/$/, '').split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current = current + '/' + part;
      chain.push({ id: current, name: part, isDir: true });
    }
  }

  return chain;
}

function normalizeFiles(files) {
  return files.map((file) => ({
    ...file,
    id: file.id,
    name: file.name,
    isDir: file.isDir,
  }));
}

export default function App() {
  const [sidebarFolders, setSidebarFolders] = useState([]);
  const [folderChain, setFolderChain] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    window.electron_componentapp_API.invoke('get-default-folders').then((folders) => {
      if (folders && folders.length) {
        setSidebarFolders(folders);
        loadFolder(folders[0].path);
      }
    }).catch(() => {
      setSidebarFolders([]);
    });
  }, []);

  const loadFolder = useCallback(async (dirPath) => {
    setLoading(true);
    const response = await window.electron_componentapp_API.invoke('get-files', dirPath);
    setLoading(false);
    if (!response.success) {
      setPermissionDenied(response.error === 'permission_denied');
      setFiles([]);
      setCurrentPath(dirPath);
      setFolderChain(buildFolderChain(dirPath));
      return;
    }

    setPermissionDenied(false);
    const sorted = normalizeFiles(response.files).sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    setFiles(sorted);
    setCurrentPath(dirPath);
    setFolderChain(buildFolderChain(dirPath));
  }, []);

  const openFile = useCallback(async (file) => {
    return;
  }, []);

  const handleFileAction = useCallback(async (data) => {
    if (data.id !== 'open_files') return;
    const targetFile = data.payload?.targetFile;
    if (!targetFile) return;

    if (targetFile.isDir) {
      loadFolder(targetFile.id);
    }
  }, [loadFolder]);

  const handleFolderClick = (folder) => {
    if (folder && folder.path) {
      loadFolder(folder.path);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#11101a', color: '#eee' }} ref={containerRef}>
      <div style={{ width: 240, background: '#16151f', borderRight: '1px solid #2c2b38', padding: 12, overflowY: 'auto' }}>
        <div style={{ marginBottom: 12, fontWeight: '700', fontSize: 14 }}>Папки</div>
        {sidebarFolders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => handleFolderClick(folder)}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 6,
              border: 'none', borderRadius: 6, cursor: 'pointer', background: currentPath === folder.path ? '#2a2a3c' : '#1a1927',
              color: '#f3f3f3'
            }}
          >
            {folder.name}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #2c2b38', background: '#14121b' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: '700' }}>Файловый менеджер</div>
            <div style={{ fontSize: 12, color: '#b1b0c0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentPath || '...'}</div>
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>{loading ? 'Загрузка...' : ''}</div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', overflow: 'hidden', background: '#10101a' }}>
            {permissionDenied ? (
              <div style={{ padding: 20, color: '#f55' }}>Нет доступа к этой папке.</div>
            ) : (
              <FileBrowser files={files} folderChain={folderChain} darkMode onFileAction={handleFileAction}>
                <FileToolbar />
                <FileNavbar />
                <FileList />
              </FileBrowser>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
