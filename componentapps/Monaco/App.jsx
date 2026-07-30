import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';

function getLanguage(filePath) {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascriptreact', ts: 'typescript', tsx: 'typescriptreact',
    css: 'css', scss: 'scss', less: 'less', html: 'html', htm: 'html',
    json: 'json', xml: 'xml', svg: 'xml', md: 'markdown', py: 'python',
    rb: 'ruby', php: 'php', java: 'java', c: 'c', cpp: 'cpp', h: 'c',
    cs: 'csharp', go: 'go', rs: 'rust', sql: 'sql', sh: 'shell', bat: 'bat',
    ps1: 'powershell', yaml: 'yaml', yml: 'yaml', toml: 'toml', ini: 'ini',
  };
  return map[ext] || 'plaintext';
}

export default function App() {
  const [tabs, setTabs] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(-1);
  const [fileTree, setFileTree] = useState([]);
  const [currentTreePath, setCurrentTreePath] = useState('');
  const [treeError, setTreeError] = useState(null);

  const loadFolderTree = useCallback(async (folderPath) => {
    const response = await window.electron_componentapp_API.invoke('get-files', folderPath);
    if (!response.success) {
      setTreeError(response.error === 'permission_denied' ? 'permission_denied' : 'unknown');
      setFileTree([]);
      setCurrentTreePath(folderPath);
      return;
    }
    setTreeError(null);
    const sorted = response.files.sort((a, b) => (a.isDir !== b.isDir ? (a.isDir ? -1 : 1) : a.name.localeCompare(b.name)));
    setFileTree(sorted);
    setCurrentTreePath(folderPath);
  }, []);

  const openFile = useCallback(async (filePath) => {
    const res = await window.electron_componentapp_API.invoke('read-file', filePath);
    if (!res.success) return;
    const tab = {
      id: filePath,
      name: filePath.split(/[/\\]/).pop(),
      content: res.content,
      path: filePath,
      language: getLanguage(filePath),
    };
    setTabs((prev) => {
      const exist = prev.findIndex((t) => t.id === filePath);
      if (exist >= 0) {
        setActiveTabIndex(exist);
        return prev;
      }
      setActiveTabIndex(prev.length);
      return [...prev, tab];
    });
  }, []);

  useEffect(() => {
    window.electron_componentapp_API.invoke('get-default-folders').then((folders) => {
      if (folders && folders.length) {
        loadFolderTree(folders[0].path);
      }
    });
  }, [loadFolderTree]);

  const handleNavigate = useCallback((path) => {
    loadFolderTree(path);
  }, [loadFolderTree]);

  const closeTab = useCallback((idx) => {
    setTabs((prev) => {
      const next = prev.filter((_, index) => index !== idx);
      if (idx === activeTabIndex) {
        if (next.length === 0) {
          setActiveTabIndex(-1);
        } else if (idx < next.length) {
          setActiveTabIndex(idx);
        } else {
          setActiveTabIndex(next.length - 1);
        }
      }
      return next;
    });
  }, [activeTabIndex]);

  const saveActiveTab = useCallback(async () => {
    if (activeTabIndex < 0) return;
    const tab = tabs[activeTabIndex];
    await window.electron_componentapp_API.invoke('write-file', tab.path, tab.content);
  }, [activeTabIndex, tabs]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveActiveTab();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveActiveTab]);

  const updateTabContent = useCallback((value) => {
    if (activeTabIndex < 0) return;
    setTabs((prev) => prev.map((tab, idx) => idx === activeTabIndex ? { ...tab, content: value } : tab));
  }, [activeTabIndex]);

  const activeTab = activeTabIndex >= 0 ? tabs[activeTabIndex] : null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0b0c11', color: '#eee' }}>
      <div style={{ width: 260, background: '#11131c', borderRight: '1px solid #2c2c41', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #2c2c41', fontWeight: 700 }}>Проводник</div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {treeError ? (
            <div style={{ padding: 16, color: '#f55' }}>Нет доступа к папке или ошибка.</div>
          ) : fileTree.length === 0 ? (
            <div style={{ padding: 16, color: '#aaa' }}>Выберите папку в левой панели.</div>
          ) : (
            fileTree.map((file) => (
              <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', cursor: 'pointer', color: file.isDir ? '#9ad' : '#ccc' }} onDoubleClick={() => {
                if (file.isDir) handleNavigate(file.id); else openFile(file.id);
              }}>
                <span>{file.isDir ? '📁' : '📄'} {file.name}</span>
                <span style={{ opacity: 0.7 }}>{file.isDir ? 'dir' : file.size}</span>
              </div>
            ))
          )}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #2c2c41', background: '#12151f' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Monaco Editor</div>
            <div style={{ fontSize: 12, color: '#999' }}>{currentTreePath || 'Папка не выбрана'}</div>
          </div>
          <button onClick={saveActiveTab} style={{ padding: '8px 14px', background: '#2b6bf4', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Сохранить</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: 36, overflowX: 'auto', background: '#151824', borderBottom: '1px solid #2c2c41' }}>
          {tabs.map((tab, idx) => (
            <div key={tab.id} onClick={() => setActiveTabIndex(idx)} style={{ padding: '8px 12px', cursor: 'pointer', color: idx === activeTabIndex ? '#fff' : '#adb3c1', background: idx === activeTabIndex ? '#1f2431' : 'transparent', borderRight: '1px solid #2c2c41' }}>
              {tab.name}
              <span onClick={(event) => { event.stopPropagation(); closeTab(idx); }} style={{ marginLeft: 8, color: '#777' }}>×</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {activeTab ? (
            <Editor
              height="100%"
              theme="vs-dark"
              language={activeTab.language}
              value={activeTab.content}
              onChange={updateTabContent}
              options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false }}
            />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b8f98' }}>Откройте файл двойным кликом в проводнике.</div>
          )}
        </div>
      </div>
    </div>
  );
}
