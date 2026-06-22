const { app, BrowserWindow } = require('electron');
const path = require('path');
const { setupIPCHandlers } = require('./ipc-handlers');
const { startTCPServer } = require('./tcp-server');

let mainWindow = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 520,
    resizable: false,
    title: '局域网文件快传',
    webPreferences: {
      preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  createWindow();
  setupIPCHandlers();
  startTCPServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const getMainWindow = () => mainWindow;

module.exports = { getMainWindow };
