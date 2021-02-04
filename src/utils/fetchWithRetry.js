import get from 'lodash/get';
import sleep from './sleep';

const fetchWithRetry = async (fetcher, ...params) => {
  const retryFunc = (remain) =>
    fetcher(...params).catch((err) => {
      if (remain <= 0 || get(err, 'response.status') === 401) {
        throw err;
      }
      return sleep(3000).then(() => retryFunc(remain - 1));
    });
  return retryFunc(5);
};

export default fetchWithRetry;
