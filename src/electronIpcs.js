import { noop } from 'lodash/noop';

let windowWebContent = noop;

export const setWindowWebContent = (wwc) => {
  windowWebContent = wwc;
};

export const sendMarketAgg = (marketAgg) => {
  windowWebContent.send('marketAggData', marketAgg);
};
