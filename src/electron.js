import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';

import ipcThread from './electronIpc';

let mainWindow;
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  });

  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.getName(),
        submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }],
      },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    Menu.setApplicationMenu(null);
  }

  if (isDev) mainWindow.webContents.openDevTools();
  const loadUrl = isDev ? process.env.ELECTRON_START_URL : `file://${path.join(__dirname, '../build/index.html')}`;
  mainWindow.loadURL(loadUrl);

  ipcThread();
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return;
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length !== 0) return;
  createWindow();
});
