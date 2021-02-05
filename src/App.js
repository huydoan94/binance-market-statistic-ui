import React from 'react';
import { Helmet } from 'react-helmet';

import StatisticTable from './StatisticTable';

const { ipcRenderer } = window.require('electron');

function App() {
  return (
    <>
      <Helmet>
        <title>Binance Market Statistics - ver: {ipcRenderer.sendSync('getAppVersion')}</title>
      </Helmet>
      <StatisticTable />
    </>
  );
}

export default App;
