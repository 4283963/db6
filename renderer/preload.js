const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lanTransfer', {
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  sendFile: (targetIP, filePath) =>
    ipcRenderer.invoke('send-file', { targetIP, filePath }),

  onServerStarted: (callback) =>
    ipcRenderer.on('server-started', (_e, data) => callback(data)),
  onServerError: (callback) =>
    ipcRenderer.on('server-error', (_e, data) => callback(data)),
  onClientConnected: (callback) =>
    ipcRenderer.on('client-connected', (_e, data) => callback(data)),

  onReceiveProgress: (callback) =>
    ipcRenderer.on('receive-progress', (_e, data) => callback(data)),
  onReceiveComplete: (callback) =>
    ipcRenderer.on('receive-complete', (_e, data) => callback(data)),
  onReceiveError: (callback) =>
    ipcRenderer.on('receive-error', (_e, data) => callback(data)),

  onSendStart: (callback) =>
    ipcRenderer.on('send-start', (_e, data) => callback(data)),
  onSendProgress: (callback) =>
    ipcRenderer.on('send-progress', (_e, data) => callback(data)),
  onSendComplete: (callback) =>
    ipcRenderer.on('send-complete', (_e, data) => callback(data)),
  onSendError: (callback) =>
    ipcRenderer.on('send-error', (_e, data) => callback(data))
});
