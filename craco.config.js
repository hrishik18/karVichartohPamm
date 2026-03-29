const webpack = require('webpack');
const packageJson = require('./package.json');

module.exports = {
  webpack: {
    plugins: {
      add: [
        new webpack.DefinePlugin({
          'process.env.REACT_APP_VERSION': JSON.stringify(packageJson.version),
        }),
      ],
    },
  },
  style: {
    postcss: {
      mode: 'extends',
      loaderOptions: (postcssLoaderOptions) => {
        postcssLoaderOptions.postcssOptions.plugins = [
          require('tailwindcss'),
          require('autoprefixer'),
        ];
        return postcssLoaderOptions;
      },
    },
  },
};
