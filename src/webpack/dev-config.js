const path = require('path')
const webpack = require('webpack')
const merge = require('webpack-merge')
const baseWebpackConfig = require('./base-config')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')
const portfinder = require('portfinder')

const host = process.env.HOST || 'localhost'
const basePort = process.env.PORT || 8080
const proxyHost = process.env.PROXY_HOST || process.env.PROXY || undefined
const proxyPath = process.env.PROXY_PATH || '/*api/**'

module.exports.buildConfig = function(baseConfig, defaultTitle = 'BGOV Dev App') {
  return merge(baseConfig, {
    output: {
      publicPath: '/assets/'
    },
    devtool: 'cheap-eval-source-map',
    
    devServer: {
      hot: true,
      historyApiFallback: {
        index: '/assets/index.html'
      },
      host: host,
      port: basePort,
      overlay: {
        warnings: false,
        errors: true,
      },
      quiet: true, // necessary for FriendlyErrorsPlugin
      proxy: {
        [proxyPath]: proxyHost
      },
    },
    plugins: [
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NamedModulesPlugin(), // HMR shows correct file names in console on update.
      new webpack.NoEmitOnErrorsPlugin(),
      new HtmlWebpackPlugin({
        title: defaultTitle,
        template: `!!ejs-loader!${path.resolve(__dirname, 'index.ejs')}`,
      }),
      new FriendlyErrorsPlugin(),
    ]
  })
}

const createNotifierCallback = function () {
  const notifier = require('node-notifier')

  return (severity, errors) => {
    if (severity !== 'error') {
      return
    }
    const error = errors[0]

    try {
      const filename = error.file.split('!').pop()
      notifier.notify({
        title: "Webpack Dev Server",
        subtitle: filename || '',
        message: 'Compilation Error'
        // message: severity + ': ' + error.name,
        // icon: path.join(__dirname, 'logo.png')
      })
    } catch(e) {

    }
  }
}

module.exports.createDevServer = function(config) {
  return new Promise((resolve, reject) => {
    portfinder.basePort = basePort
    portfinder.getPort((err, port) => {
      if (err) {
        reject(err)
      } else {
        // publish the new Port, necessary for e2e tests
        process.env.PORT = port
        // add port to devServer config
        config.devServer.port = port

        let successMessage = [
          `Your application is running at http://${host}:${port}`,
          `Webpack Analyzer is running at http://${host}:${port + 1}`
        ]

        if(proxyHost) {
          successMessage.push(`Proxying requests matching ${proxyPath} to ${proxyHost}`)
        }

        // Add FriendlyErrorsPlugin
        config.plugins.push(new FriendlyErrorsPlugin({
          compilationSuccessInfo: {
            messages: successMessage,
          },
          onErrors: createNotifierCallback()
        }))

        config.plugins.push(new BundleAnalyzerPlugin({
          analyzerPort: port + 1,
          openAnalyzer: false,
          logLevel: 'silent'
        }))

        resolve(config)
      }
    })
  })
}

// * Saving in case we re-enable css typings at some point
// const styleRule = [
//   'style-loader',
//   {
//     loader: 'typings-for-css-modules-loader',
//     options: {
//       localIdentName: '[name]_[local]-[hash:base64:5]',
//       modules: true,
//       namedExport: true,
//       camelCase: true,
//       banner: "// This file is automatically generated by typings-for-css-modules.\n// Please do not edit this file manually."
//     }
//   }
// ].concat(baseWebpackConfig.styleLoader)
