const { ipcMain } = require('electron');
const { getMainWindow } = require('./index');
const { serverEvents, getLocalIPAddress, PORT } = require('./tcp-server');
const { sendFile, clientEvents } = require('./tcp-client');
const { getDownloadDir } = require('./file-stream');

const forwardEvent = (eventName, data) => {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(eventName, data);
  }
};

const setupIPCHandlers = () => {
  ipcMain.handle('get-server-info', () => {
    return {
      address: getLocalIPAddress(),
      port: PORT,
      downloadDir: getDownloadDir()
    };
  });

  ipcMain.handle('send-file', async (event, { targetIP, filePath }) => {
    try {
      const result = await sendFile(targetIP, filePath);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  serverEvents.on('server-started', (data) => {
    forwardEvent('server-started', data);
  });

  serverEvents.on('server-error', (data) => {
    forwardEvent('server-error', data);
  });

  serverEvents.on('client-connected', (data) => {
    forwardEvent('client-connected', data);
  });

  serverEvents.on('receive-progress', (data) => {
    forwardEvent('receive-progress', data);
  });

  serverEvents.on('receive-complete', (data) => {
    forwardEvent('receive-complete', data);
  });

  serverEvents.on('receive-error', (data) => {
    forwardEvent('receive-error', data);
  });

  serverEvents.on('socket-error', (data) => {
    forwardEvent('socket-error', data);
  });

  clientEvents.on('send-start', (data) => {
    forwardEvent('send-start', data);
  });

  clientEvents.on('send-progress', (data) => {
    forwardEvent('send-progress', data);
  });

  clientEvents.on('send-complete', (data) => {
    forwardEvent('send-complete', data);
  });

  clientEvents.on('send-error', (data) => {
    forwardEvent('send-error', data);
  });
};

module.exports = { setupIPCHandlers };
