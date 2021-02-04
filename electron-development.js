const path = require('path');
const webpack = require('webpack');
const spawn = require('cross-spawn');
const kill = require('tree-kill');
const rimraf = require('rimraf');
const { promisify } = require('util');

const port = process.env.PORT || 3000;
const REACT_APP_STARTED_SIGNAL = 'Starting the development server...';

process.env.NODE_ENV = 'development';
process.env.ELECTRON_START_URL = `http://localhost:${port}`;

const electronWebpackConfig = {
  mode: process.env.NODE_ENV,
  entry: "./src/electron.js",
  output: {
    filename: "electron.js",
    path: path.join(__dirname, 'build')
  },
  module: {
    rules: [
      {
        test: /.*\.(js|mjs|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: [{
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env"
            ],
            plugins: [
              "@babel/plugin-proposal-class-properties"
            ]
          }
        }],
      }
    ]
  },
  node: {
    __dirname: false,
    __filename: false
  },
  target: "electron-main",
  watch: true,
  watchOptions: {
    aggregateTimeout: 300,
    ignored: ['node_modules', 'build/**']
  }
};

let appProcess = null;
let rendererProcess = null;
let isAppProcessReload = false;
let isElectronAppStarted = false;
promisify(rimraf)(path.join(__dirname, 'build'))
  .then(() => {
    rendererProcess = spawn('react-scripts', ['start']);
    rendererProcess.stdout.pipe(process.stdout);
    rendererProcess.stderr.pipe(process.stderr);
    rendererProcess.on('exit', () => {
      if (appProcess) kill(appProcess.pid);
      rendererProcess = null;
    });

    const killAppProcess = (cb) => {
      if (rendererProcess) return kill(appProcess.pid, cb);
      cb();
    };

    const killRendererProcess = (cb) => {
      if (rendererProcess) return kill(rendererProcess.pid, cb);
      cb();
    };

    const runElectron = () => {
      isElectronAppStarted = true;

      console.log('Starting Electron...');
      webpack(electronWebpackConfig, (err, stats) => {
        if (err && err.message) {
          console.log(err.message);
          killAppProcess();
          killRendererProcess();
          return;
        }
        if (stats.hasErrors()) {
          console.log(stats.toString({ all: false, warnings: true, errors: true }));
          killAppProcess();
          killRendererProcess();
          return;
        }

        const createAppProcess = (fromReload) => {
          if (fromReload) console.log('Reloaded Electron successfully!');

          appProcess = spawn('electron', ['.']);
          appProcess.stdout.pipe(process.stdout);
          appProcess.stderr.pipe(process.stderr);
          appProcess.on('exit', () => {
            if (!isAppProcessReload) killRendererProcess(() => process.exit());
            appProcess = null;
          });
        };

        if (appProcess) {
          console.log('Reloading Electron...');
          isAppProcessReload = true;
          killAppProcess(() => {
            createAppProcess(true);
            isAppProcessReload = false;
          });
        }

        if (!isAppProcessReload) createAppProcess();
      });
    };

    rendererProcess.stdout.on('data', (msg) => {
      if (isElectronAppStarted || !msg.toString().includes(REACT_APP_STARTED_SIGNAL)) return;
      runElectron();
    });
  });
