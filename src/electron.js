import 'core-js/stable';
import 'regenerator-runtime/runtime';

import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { autoUpdater } from "electron-updater";
import installExtension, { REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } from 'electron-devtools-installer';
import noop from 'lodash/noop';

import { sendMarketAgg, setWindowWebContent } from './electronIpcs';
import { init } from './utils/createBinanceBackgroundTask';

let mainWindow = null;

const checkforUpdate = () => {
  autoUpdater.checkForUpdates().catch(() => null);
  autoUpdater.on('update-available', () => autoUpdater.downloadUpdate());
  autoUpdater.on('update-downloaded', () => autoUpdater.quitAndInstall());
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

  if (!isDev) checkforUpdate();

  setWindowWebContent(mainWindow.webContents);
  init(sendMarketAgg);
};

const destroyWindow = () => {
  setWindowWebContent({ send: noop });
  mainWindow = null;
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return;
  destroyWindow();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length !== 0) return;
  createWindow();
});
