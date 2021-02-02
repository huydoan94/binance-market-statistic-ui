import 'antd/dist/antd.css';

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal } from 'antd';
import { compare } from 'array-sort-compare';
import cx from 'classnames';
import { debounce } from 'lodash';
import axios from 'axios';

import { electron } from './utils/electron';

import styles from './App.module.scss';

import BinanceWebSocket from './BinanceWebsocket';

let coinList = [];
async function getCoinList(quoteAsset = 'USDT') {
  const { data } = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
  if (!data) return;

  const symbols = data.symbols
    .filter(s => s.quoteAsset === quoteAsset && !/.*(UP|DOWN)$/.test(s.baseAsset))
    .map(s => ({ symbol: s.symbol, baseAsset: s.baseAsset }))
    .sort((a, b) => (a.baseAsset < b.baseAsset ? -1 : 0));

  if (!symbols || symbols.length === 0) return;

  coinList = symbols;
}

let coin2hrKlines = [];
async function getCoin2hrKlines() {
  let result = [];
  const haveToFetch = [];
  const haveToFetchCoinMap = [];
  const today = new Date().valueOf();

  coinList.forEach((c) => {
    const coin2hrKline = coin2hrKlines.find(ckl => ckl.symbol === c.symbol);
    if (!coin2hrKline || (today - coin2hrKline.data[0]) / (60 * 60 * 1000) >= 2) {
      haveToFetchCoinMap.push(c.symbol);
      haveToFetch.push(axios.get(`https://api.binance.com/api/v3/klines?symbol=${c.symbol}&interval=2h&limit=2`));
    } else {
      result.push(coin2hrKline);
    }
  });

  if (haveToFetch.length > 0) {
    const res = await Promise.all(haveToFetch);
    const dataMap = haveToFetchCoinMap.reduce((agg, cm, idx) => {
      if (!res[idx]) return agg;

      const klineData = res[idx].data[0];
      // Shift open time of newest to its previous for marking open time.
      // eslint-disable-next-line prefer-destructuring
      klineData[0] = res[idx].data[1][0];
      agg.push({ symbol: cm, data: klineData });
      return agg;
    }, []);
    result = result.concat(dataMap);
  }

  coin2hrKlines = result;
}

let oldTicker24hr = [];
async function getTicker24hr(coinTicker) {
  if (coinList.length === 0) return [];
  if (!coinTicker) return [];

  const result = [];
  for (let i = 0; i < coinList.length; i += 1) {
    const coin = coinList[i];
    const info = coinTicker.find(d => d.symbol === coin.symbol);
    if (!info) {
      const oldInfo = oldTicker24hr.find(d => d.ticker === coin.baseAsset);
      result.push(oldInfo || {
        ticker: coin.baseAsset,
        price: 0,
        percentage2hrChange: 0,
        price24hrChange: 0,
        percentage24hrChange: 0,
        volume24hr: 0,
        quoteVolume24hr: 0,
        tradeLink: `https://www.binance.com/en/trade/${coin.symbol}`,
      });
      // eslint-disable-next-line no-continue
      continue;
    }

    let change2h;
    const klineData2h = coin2hrKlines.find(kld => kld.symbol === coin.symbol);
    if (klineData2h) {
      const { data: [, , , , last2hPrice] } = klineData2h;
      change2h = (info.lastPrice - Number(last2hPrice)) / Number(last2hPrice);
    }

    result.push({
      ticker: coin.baseAsset,
      price: info.lastPrice,
      percentage2hrChange: !change2h ? 0 : change2h * 100,
      price24hrChange: info.priceChange,
      percentage24hrChange: info.priceChangePercent,
      volume24hr: info.volume,
      quoteVolume24hr: info.quoteVolume,
      tradeLink: `https://www.binance.com/en/trade/${coin.symbol}`,
    });
  }

  oldTicker24hr = result;
  return result;
}

const processAggTradeStream = setData => debounce(async (msg) => {
  const parsed = JSON.parse(msg);
  const result = await getTicker24hr(parsed.map(p => ({
    symbol: p.s,
    lastPrice: Number(p.c),
    priceChange: Number(p.p),
    priceChangePercent: Number(p.P),
    volume: Number(p.v),
    quoteVolume: Number(p.q),
  })));
  setData(result);
}, 500, { maxWait: 2000 });

// eslint-disable-next-line react/prop-types
function TradingView({ ticker }) {
  useEffect(() => {
    // eslint-disable-next-line
    new window.TradingView.widget(
      {
        autosize: true,
        symbol: `BINANCE:${ticker}USDT`,
        interval: 'D',
        timezone: 'Asia/Ho_Chi_Minh',
        theme: 'light',
        style: '1',
        locale: 'en',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        save_image: false,
        hidevolume: true,
        container_id: `tradingViewChart-${ticker}`,
      },
    );
  }, [ticker]);

  return <div id={`tradingViewChart-${ticker}`} style={{ width: '100%', height: 'calc(100vh - 300px)' }} />;
}

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
    render: (_, { price }) => price.toFixed(6),
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
      children: `${percentage2hrChange.toFixed(3)}%`,
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
      children: price24hrChange.toFixed(6),
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
      children: `${percentage24hrChange.toFixed(3)}%`,
    }),
    className: styles.ResetCellStyle,
  },
  {
    title: '24hr Volume',
    dataIndex: 'volume24hr',
    key: 'volume24hr',
    sorter: (a, b) => comparer(a.volume24hr, b.volume24hr),
    render: (_, { volume24hr }) => volume24hr.toFixed(0),
    className: styles.ResetCellStyle,
  },
  {
    title: '24hr USDT Volume',
    dataIndex: 'quoteVolume24hr',
    key: 'quoteVolume24hr',
    sorter: (a, b) => comparer(a.quoteVolume24hr, b.quoteVolume24hr),
    render: (_, { quoteVolume24hr }) => quoteVolume24hr.toFixed(0),
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
        <Button type="link" onClick={() => electron.shell.openExternal(tradeLink)}>Trade</Button>
      </>
    ),
  },
];

let getCoinListInterval;
let getCoin2hrKlinesInterval;
function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    let agg24hrSocketClient;
    (async () => {
      await getCoinList();
      await getCoin2hrKlines();
      const { data: coinTicker } = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
      const initialCoinTicker24hrData = await getTicker24hr(coinTicker.map(p => ({
        symbol: p.symbol,
        lastPrice: Number(p.lastPrice),
        priceChange: Number(p.priceChange),
        priceChangePercent: Number(p.priceChangePercent),
        volume: Number(p.volume),
        quoteVolume: Number(p.quoteVolume),
      })));
      setData(initialCoinTicker24hrData);

      agg24hrSocketClient = new BinanceWebSocket(
        'wss://stream.binance.com:9443/ws/!ticker@arr',
        processAggTradeStream(setData)
      );
      getCoinListInterval = setInterval(() => getCoinList(), 1 * 60 * 60 * 1000);
      getCoin2hrKlinesInterval = setInterval(async () => getCoin2hrKlines(), 1 * 60 * 1000);
    })();

    return () => {
      if (agg24hrSocketClient) agg24hrSocketClient.closeSocketClient();
      clearInterval(getCoinListInterval);
      clearInterval(getCoin2hrKlinesInterval);
    };
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

export default App;
