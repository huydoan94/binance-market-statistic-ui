import 'antd/dist/antd.css';

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal } from 'antd';
import { compare } from 'array-sort-compare';
import cx from 'classnames';

import TradingView from './TradingView';

import styles from './App.module.scss';

const { shell, ipcRenderer } = window.require('electron');

const { format } = new Intl.NumberFormat('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
const { format: integerFormat } = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const { format: percentFormat } = new Intl.NumberFormat(
  'en-US',
  { style: 'percent', minimumFractionDigits: 3, maximumFractionDigits: 3 }
);
const comparer = compare();
const columns = [
  {
    title: 'Coin / Ticker',
    dataIndex: 'ticker',
    key: 'ticker',
    onFilter: (value, record) => record.ticker.includes(value),
    sorter: (a, b) => comparer(a.ticker, b.ticker),
    sortDirections: ['descend'],
  },
  {
    title: 'Current Price',
    dataIndex: 'price',
    key: 'price',
    sorter: (a, b) => comparer(a.price, b.price),
    render: (_, { price }) => format(price),
    className: styles.ResetCellStyle,
  },
  {
    title: '% 2hr Price Change',
    dataIndex: 'percentage2hrChange',
    key: 'percentage2hrChange',
    sorter: (a, b) => comparer(a.percentage2hrChange, b.percentage2hrChange),
    render: (_, { percentage2hrChange }) => ({
      props: {
        className: cx({
          [styles.PositiveValue]: percentage2hrChange > 0,
          [styles.NegativeValue]: percentage2hrChange < 0,
        }),
      },
      children: percentFormat(percentage2hrChange),
    }),
    className: styles.ResetCellStyle,
  },
  {
    title: '24hr Price Change',
    dataIndex: 'price24hrChange',
    key: 'price24hrChange',
    sorter: (a, b) => comparer(a.price24hrChange, b.price24hrChange),
    render: (_, { price24hrChange }) => ({
      props: {
        className: cx({
          [styles.PositiveValue]: price24hrChange > 0,
          [styles.NegativeValue]: price24hrChange < 0,
        }),
      },
      children: format(price24hrChange),
    }),
    className: styles.ResetCellStyle,
  },
  {
    title: '% 24hr Price Change',
    dataIndex: 'percentage24hrChange',
    key: 'percentage24hrChange',
    sorter: (a, b) => comparer(a.percentage24hrChange, b.percentage24hrChange),
    render: (_, { percentage24hrChange }) => ({
      props: {
        className: cx({
          [styles.PositiveValue]: percentage24hrChange > 0,
          [styles.NegativeValue]: percentage24hrChange < 0,
        }),
      },
      children: percentFormat(percentage24hrChange),
    }),
    className: styles.ResetCellStyle,
  },
  {
    title: '24hr Volume',
    dataIndex: 'volume24hr',
    key: 'volume24hr',
    sorter: (a, b) => comparer(a.volume24hr, b.volume24hr),
    render: (_, { volume24hr }) => integerFormat(volume24hr),
    className: styles.ResetCellStyle,
  },
  {
    title: '24hr USDT Volume',
    dataIndex: 'quoteVolume24hr',
    key: 'quoteVolume24hr',
    sorter: (a, b) => comparer(a.quoteVolume24hr, b.quoteVolume24hr),
    render: (_, { quoteVolume24hr }) => integerFormat(quoteVolume24hr),
    className: styles.ResetCellStyle,
  },
  {
    title: '',
    dataIndex: '',
    key: 'tradeButton',
    render: (_, { tradeLink, ticker }) => (
      <>
        <Button
          type="link"
          onClick={() => Modal.info({
            title: `${ticker} / USDT`,
            content: <TradingView ticker={ticker} />,
            className: styles.TradingViewModal,
          })}
        >
          View
        </Button>
        <Button type="link" onClick={() => shell.openExternal(tradeLink)}>Trade</Button>
      </>
    ),
  },
];

function BinanceMarketTable() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const marketAggIpc = (_, marketAgg) => setData(marketAgg);
    ipcRenderer.on('marketAggData', marketAggIpc);

    return () => ipcRenderer.removeListener(marketAggIpc);
  }, []);

  return (
    <div className={styles.App}>
      <Table
        columns={columns}
        rowKey={({ ticker }) => ticker}
        pagination={false}
        dataSource={data}
        className={styles.FullWidthTable}
        bordered
      />
    </div>
  );
}

export default BinanceMarketTable;
