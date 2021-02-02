const path = require('path');
const webpack = require('webpack');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const chalk = require('react-dev-utils/chalk');
const { promisify } = require('util');
const { exec } = require('child_process');
const rimraf = require('rimraf');

process.env.NODE_ENV = 'production';

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
  .then(() => promisify(exec)('react-scripts build'))
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
  .then(() => console.log(chalk.green('Electron built successfully')))
  .catch(() => console.error(chalk.red('Build Electron Failed')));

