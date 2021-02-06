import axios from 'axios';
import keyBy from 'lodash/keyBy';

import fetchWithRetry from './utils/fetchWithRetry';

class BinanceCoinListTask {
  coinList = {};
  quoteAsset = 'USDT';
  fetchTimeout = null;

  fetchCoinlistPreriod = () => {
    clearTimeout(this.fetchTimeout);

    this.fetchCoinList();
    this.fetchTimeout = setTimeout(this.fetchCoinlistPreriod, 60 * 60 * 1000);
  }

  fetchCoinList = async () => {
    const { data } = await fetchWithRetry(axios.get, 'https://api.binance.com/api/v3/exchangeInfo');
    if (!data) return;

    const symbols = data.symbols
      .filter(s => s.status === 'TRADING' && s.quoteAsset === this.quoteAsset && !/.*(UP|DOWN)$/.test(s.baseAsset))
      .map(s => ({ symbol: s.symbol, baseAsset: s.baseAsset }))
      .sort((a, b) => (a.baseAsset < b.baseAsset ? -1 : 0));

    if (!symbols || symbols.length === 0) return;

    this.coinList = keyBy(symbols, 'symbol');
  }

  getCoinList = () => {
    return this.coinList;
  }

  stop = () => {
    clearTimeout(this.fetchTimeout);
  }
}

export default BinanceCoinListTask;
