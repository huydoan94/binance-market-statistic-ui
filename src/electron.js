import 'core-js/stable';
import 'regenerator-runtime/runtime';

import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { autoUpdater } from "electron-updater";
import installExtension, { REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } from 'electron-devtools-installer';

import ipcThread from './electronIpc';

let updateTimeout = null;
let mainWindow;

const setUpdateTimeout = () => {
  autoUpdater.checkForUpdatesAndNotify();
  updateTimeout = setTimeout(() => setUpdateTimeout(), 60000);
};

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

  if (isDev) {
    installExtension([REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS]);
    mainWindow.webContents.openDevTools();
  }
  const loadUrl = isDev ? process.env.ELECTRON_START_URL : `file://${path.join(__dirname, 'index.html')}`;
  mainWindow.loadURL(loadUrl);

  ipcThread();
  setUpdateTimeout();
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return;
  clearTimeout(updateTimeout);
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length !== 0) return;
  createWindow();
});
