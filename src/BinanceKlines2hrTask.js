import axios from 'axios';

import fetchWithRetry from './utils/fetchWithRetry';

class BinanceKlines2hrTask {
  coin2hrKlines = [];
  fetchTimeout = null;

  fetchKlines2hrPeriod = () => {
    clearTimeout(this.fetchTimeout);

    this.fetchKlines2hr();
    this.fetchTimeout = setTimeout(this.fetchKlines2hrPeriod, 60 * 1000);
  }

  fetchKlines2hr = async () => {
    let result = [];
    const haveToFetch = [];
    const haveToFetchCoinMap = [];
    const today = new Date().valueOf();

    if (!globalThis.binanceCoinListTask) return;
    globalThis.binanceCoinListTask.getCoinList().forEach((c) => {
      const coin2hrKline = this.coin2hrKlines.find(ckl => ckl.symbol === c.symbol);
      if (!coin2hrKline || (today - coin2hrKline.data[0]) / (60 * 60 * 1000) >= 2) {
        haveToFetchCoinMap.push(c.symbol);
        haveToFetch.push(fetchWithRetry(
          axios.get,
          `https://api.binance.com/api/v3/klines?symbol=${c.symbol}&interval=2h&limit=2`
        ));
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

    this.coin2hrKlines = result;
  }

  getKlines2hr = () => {
    return this.coin2hrKlines;
  }

  stop = () => {
    clearTimeout(this.fetchTimeout);
  }
}

export default BinanceKlines2hrTask;
