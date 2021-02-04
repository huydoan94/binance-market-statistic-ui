import BinanceCoinListTask from '../BinanceCoinListTask';
import BinanceKlines2hrTask from '../BinanceKlines2hrTask';
import BinanceMarketAggTask from '../BinanceMarketAggTask';

export const init = async (marketAggIpc) => {
  const binanceCoinListTask = new BinanceCoinListTask();
  const binanceKlines2hrTask = new BinanceKlines2hrTask();
  const binanceMarketAggTask = new BinanceMarketAggTask();

  await binanceCoinListTask.fetchCoinList();
  binanceCoinListTask.fetchCoinlistPreriod();
  globalThis.binanceCoinListTask = binanceCoinListTask;

  await binanceKlines2hrTask.fetchKlines2hr();
  binanceKlines2hrTask.fetchKlines2hrPeriod();
  globalThis.binanceKlines2hrTask = binanceKlines2hrTask;

  await binanceMarketAggTask.initMarketAggStream(marketAggIpc);
  globalThis.binanceMarketAggTask = binanceMarketAggTask;
};
