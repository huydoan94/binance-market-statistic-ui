import map from 'lodash/map';
import every from 'lodash/every';
import sortBy from 'lodash/sortBy';
import isEmpty from 'lodash/isEmpty';
import isNil from 'lodash/isNil';

const all = async (
  callers,
  maxPromise = 5,
  stopOnError = true
) => {
  if (isEmpty(callers)) return [];
  return new Promise((resolve, reject) => {
    const resolveResults = (data) => {
      if (every(data, r => r === null)) {
        reject(new Error('Promise all failed !!!'));
      }
      resolve(data);
    };

    const endIndex = callers.length - 1;
    let currentIndex = -1;
    let currentInPool = 0;
    let isFailed = false;
    const results = [];
    const next = () => {
      if (isFailed) return;
      if (currentIndex >= endIndex && currentInPool <= 0) {
        resolveResults(results);
        return;
      }
      if (currentIndex >= endIndex) return;

      currentIndex += 1;
      currentInPool += 1;
      ((innerIndex) => {
        callers[innerIndex]().then((res) => {
          results.push(res);
          currentInPool -= 1;
          next();
          return res;
        }).catch((err) => {
          if (stopOnError) {
            isFailed = true;
            reject(err);
            return null;
          }
          results.push(null);
          currentInPool -= 1;
          next();
          return null;
        });
      })(currentIndex);
    };

    for (let i = 0; i < maxPromise; i += 1) {
      next();
    }
  });
};

const promiseMap = async (
  collection,
  iteratee,
  maxPromise = 20,
  stopOnError = true
) => {
  if (isNil(collection)) return [];
  const iteratees = map(
    collection,
    (value, index, ...others) => async () => {
      const result = await iteratee(value, index, ...others);
      return { index, result };
    }
  );
  const results = await all(iteratees, maxPromise, stopOnError);
  const sorted = sortBy(results, (r) => r.index);
  return map(sorted, (s) => s.result);
};

export {
  all,
  promiseMap as map
};
