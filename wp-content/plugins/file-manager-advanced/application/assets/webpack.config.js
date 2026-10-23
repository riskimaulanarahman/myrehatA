const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'afm-react-admin.js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: require.resolve('babel-loader'),
          options: {
            presets: [
              require.resolve('@babel/preset-env'),
              [require.resolve('@babel/preset-react'), { runtime: 'automatic' }]
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  externals: {
    // WordPress dependencies - use WP's versions
    'wp-element': 'wp.element',
    'wp-components': 'wp.components',
    'wp-api-fetch': 'wp.apiFetch',
    jquery: 'jQuery',
    // React will be bundled (not externalized) since WordPress doesn't provide it
  },
  resolve: {
    modules: [
      'node_modules',
      path.resolve(__dirname, 'node_modules'),
      '/home/muneeb-jalal/Downloads/local-sites-backup/afm-ai/app/public/wp-content/plugins/file-manager-advanced/application/assets/node_modules'
    ],
    extensions: ['.js', '.jsx'],
  },
  resolveLoader: {
    modules: [
      'node_modules',
      path.resolve(__dirname, 'node_modules'),
      '/home/muneeb-jalal/Downloads/local-sites-backup/afm-ai/app/public/wp-content/plugins/file-manager-advanced/application/assets/node_modules'
    ],
  },
  devtool: 'source-map',
};

