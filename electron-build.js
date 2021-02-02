const path = require('path');
const webpack = require('webpack');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const chalk = require('react-dev-utils/chalk');
const { promisify } = require('util');
const spawn = require('cross-spawn');
const rimraf = require('rimraf');

const releaseParam = process.argv[2] === '--release';

process.env.NODE_ENV = 'production';
if (releaseParam) process.env.GH_TOKEN = 'ab5e475c3400f1cd8076f7be6689931b891d68bc';

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
        use: "babel-loader"
      }
    ]
  },
  node: {
    __dirname: false,
    __filename: false
  },
  target: "electron-main"
};

console.log(chalk.cyan('Building Renderer...'));
promisify(rimraf)(path.join(__dirname, 'build'))
  .then(() => new Promise((res, rej) => {
    const instance = spawn('react-scripts build', { stdio: 'inherit' });
    instance.on('error', (err) => rej(err));
    instance.on('exit', (code) => { if (!code) res(); });
  }))
  .then(() => {
    console.log(chalk.cyan('Building app container...'));
    return promisify(webpack)(electronWebpackConfig);
  })
  .then(stats => {
    if (stats.hasErrors()) {
      const msg = formatWebpackMessages(stats.toJson({ all: false, warnings: true, errors: true }));
      throw new Error(msg.errors.join('\n\n'));
    }
    return;
  })
  .then(() => new Promise((res, rej) => {
    console.log(chalk.green('Electron built successfully'));
    if (releaseParam) {
      console.log(chalk.cyan('Start releasing app...'));
      const howIndex = process.argv.indexOf('--how');
      const how = process.argv[howIndex + 1];
      const instance = spawn('electron-builder --publish ' + how, { stdio: 'inherit' });
      instance.on('error', () => console.error(chalk.red('Release app failed')));
      instance.on('exit', (code) => {
        if (!code) console.log(chalk.green('Released app successfully'));
        res();
      });
    } else {
      res();
    }
  }))
  .catch(() => console.error(chalk.red('Build Electron failed')));

