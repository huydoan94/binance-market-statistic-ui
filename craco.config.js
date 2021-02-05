const CracoLessPlugin = require('craco-less');
const lessVarsToJs = require('less-vars-to-js');
const fs = require('fs');

const lessVars = lessVarsToJs(fs.readFileSync('./src/styles/theme.less', 'utf8'));

module.exports = {
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            javascriptEnabled: true,
            modifyVars: lessVars
          },
        },
      },
    },
    {
      plugin: CracoLessPlugin,
      options: {
        modifyLessRule: function (lessRule, _context) {
          lessRule.test = /\.(module)\.(less)$/;
          lessRule.exclude = /node_modules/;

          return lessRule;
        },
        lessLoaderOptions: {
          lessOptions: {
            javascriptEnabled: true,
          },
        },
        cssLoaderOptions: {
          modules: { localIdentName: "[local]_[hash:base64:5]" },
        }
      }
    }
  ],
};