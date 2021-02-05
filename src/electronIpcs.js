import { app, ipcMain } from 'electron';
import { noop } from 'lodash/noop';

let windowWebContent = { send: noop };

export const setWindowWebContent = (wwc) => {
  windowWebContent = wwc;
};

export const sendMarketAgg = (marketAgg) => {
  windowWebContent.send('marketAggData', marketAgg);
};

ipcMain.on('getAppVersion', (event) => {
  event.returnValue = app.getVersion();
});
