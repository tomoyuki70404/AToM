'use strict';

const os = require('os');
const path = require('path');
const pkg = require('./package');

module.exports = {
  version: pkg.version,
  binPath: function() {
    let driverPath = path.resolve(__dirname, 'vendor', 'msedgedriver');
    if (os.platform() === 'win32') {
      driverPath = driverPath + '.exe';
    }
    return driverPath;
  }
};
