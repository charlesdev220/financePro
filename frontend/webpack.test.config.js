const path    = require('path');
const webpack = require('webpack');

module.exports = {
  plugins: [
    // Redirect Playwright E2E spec files to an empty stub so Node-only
    // Playwright packages are never bundled in the Karma browser build
    new webpack.NormalModuleReplacementPlugin(
      /[/\\]e2e[/\\].*\.spec\.ts$/,
      path.resolve(__dirname, 'src', 'empty-e2e-stub.ts'),
    ),
  ],
  resolve: {
    fallback: {
      crypto:        false,
      stream:        false,
      buffer:        false,
      path:          false,
      os:            false,
      fs:            false,
      net:           false,
      tls:           false,
      http:          false,
      https:         false,
      http2:         false,
      zlib:          false,
      url:           false,
      util:          false,
      assert:        false,
      tty:           false,
      readline:      false,
      constants:     false,
      events:        false,
      process:       false,
      querystring:   false,
      child_process: false,
      module:        false,
      electron:      false,
    },
  },
};
