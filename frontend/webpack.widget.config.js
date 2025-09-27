const webpack = require('webpack');
const dotenv = require('dotenv');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

// Load .env file
const env = dotenv.config({ path: path.resolve(__dirname, '.env') }).parsed || {};
const envKeys = Object.keys(env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(env[next]);
  return prev;
}, {});

module.exports = {
  mode: 'production',
  entry: './src/widget/loader.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'virtual-tryon-widget.min.js',
    globalObject: 'this',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin(envKeys)
  ],
  // Remove externals to bundle React and ReactDOM with the widget
  // externals: {
  //   'react': 'React',
  //   'react-dom': 'ReactDOM'
  // },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          },
          mangle: true
        }
      })
    ]
  },
  performance: {
    hints: false
  }
};
