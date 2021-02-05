import axios from 'axios';
import debounce from 'lodash/debounce';
import isEmpty from 'lodash/isEmpty';
import forEach from 'lodash/forEach';
import keyBy from 'lodash/keyBy';

import fetchWithRetry from './utils/fetchWithRetry';
import BinanceWebSocket from './BinanceWebsocket';

class BinanceMarketAggTask {
  marketAgg = [];
  marketAggStream = null;
  marketAggIpc = null;

  initMarketAggStream = async (marketAggIpc) => {
    await this.fetchMarketAgg();
    this.marketAggStream = new BinanceWebSocket('/!ticker@arr', this.onAggTradeStream);
    this.marketAggIpc = marketAggIpc;
  }

  fetchMarketAgg = async () => {
    const { data: coinTicker } = await fetchWithRetry(axios.get, 'https://api.binance.com/api/v3/ticker/24hr');
    this.marketAgg = this.processMarketAgg(coinTicker.map(p => ({
      symbol: p.symbol,
      lastPrice: Number(p.lastPrice),
      priceChange: Number(p.priceChange),
      priceChangePercent: Number(p.priceChangePercent),
      volume: Number(p.volume),
      quoteVolume: Number(p.quoteVolume),
    })));

    if (this.marketAggIpc) this.marketAggIpc(this.marketAgg);
  }

  onAggTradeStream = debounce((msg) => {
    const parsed = JSON.parse(msg);
    this.marketAgg = this.processMarketAgg(parsed.map(p => ({
      symbol: p.s,
      lastPrice: Number(p.c),
      priceChange: Number(p.p),
      priceChangePercent: Number(p.P),
      volume: Number(p.v),
      quoteVolume: Number(p.q),
    })));

    if (this.marketAggIpc) this.marketAggIpc(this.marketAgg);
  }, 500, { maxWait: 2000 })

  processMarketAgg = (coinTicker) => {
    if (!globalThis.binanceCoinListTask || isEmpty(globalThis.binanceCoinListTask.getCoinList())) return [];

    const coinTickerMap = keyBy(coinTicker, 'symbol');
    const coinList = globalThis.binanceCoinListTask.getCoinList();
    const result = [];
    forEach(coinList, (coinData, symbol) => {
      const info = coinTickerMap[symbol];
      if (!info) {
        const oldInfo = this.marketAgg.find(d => d.ticker === coinData.baseAsset);
        result.push(oldInfo || {
          ticker: coinData.baseAsset,
          price: 0,
          percentage2hrChange: 0,
          price24hrChange: 0,
          percentage24hrChange: 0,
          volume24hr: 0,
          quoteVolume24hr: 0,
          tradeLink: `https://www.binance.com/en/trade/${symbol}`,
        });
        return;
      }

      let change2h;
      if (globalThis.binanceKlines2hrTask && !isEmpty(globalThis.binanceKlines2hrTask.getKlines2hr())) {
        const coin2hrKlines = globalThis.binanceKlines2hrTask.getKlines2hr();
        const klineData2h = coin2hrKlines[symbol];
        if (klineData2h) {
          const [, , , , last2hPrice] = klineData2h;
          change2h = (info.lastPrice - Number(last2hPrice)) / Number(last2hPrice);
        }
      }

      result.push({
        ticker: coinData.baseAsset,
        price: info.lastPrice,
        percentage2hrChange: !change2h ? 0 : change2h,
        price24hrChange: info.priceChange,
        percentage24hrChange: info.priceChangePercent / 100,
        volume24hr: info.volume,
        quoteVolume24hr: info.quoteVolume,
        tradeLink: `https://www.binance.com/en/trade/${symbol}`,
      });
    });

    return result;
  }

  getMarketAgg = () => {
    return this.marketAgg();
  }

  stop = () => {
    if (this.marketAggStream) this.marketAggStream.close();
  }
}

export default BinanceMarketAggTask;
