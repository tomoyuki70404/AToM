'use strict';

const StreamZip = require('node-stream-zip');
const os = require('os');
const fs = require('fs');
const path = require('path');
const pkg = require('./package');
const { DownloaderHelper } = require('node-downloader-helper');
const { promisify } = require('util');
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const chmod = promisify(fs.chmod);

// The version of the driver that will be installed
const EDGEDRIVER_VERSION = process.env.EDGEDRIVER_VERSION ? process.env.EDGEDRIVER_VERSION : `${pkg.edgedriver_version}`;

function byteHelper(value) {
  // https://gist.github.com/thomseddon/3511330
  const units = ['b', 'kB', 'MB', 'GB', 'TB'],
    number = Math.floor(Math.log(value) / Math.log(1024));
  return (
    (value / Math.pow(1024, Math.floor(number))).toFixed(1) +
    ' ' +
    units[number]
  );
}

function getDriverUrl() {
  let urlBase;
  if (process.env.EDGEDRIVER_BASE_URL) {
    urlBase = process.env.EDGEDRIVER_BASE_URL;
  } else {
    urlBase = `https://msedgedriver.azureedge.net/${EDGEDRIVER_VERSION}/`;
  }

  switch (os.platform()) {
    case 'darwin':
      return urlBase + 'edgedriver_mac64.zip';
    case 'linux':
      return urlBase + 'edgedriver_linux64.zip';
    case 'win32':
      if (os.arch() === 'x64') return urlBase + 'edgedriver_win64.zip';
      else if (os.arch() === 'x32') return urlBase + 'edgedriver_win32.zip';
    default:
      return undefined;
  }
}

async function download() {
  if (
    process.env.npm_config_edgedriver_skip_download ||
    process.env.EDGEDRIVER_SKIP_DOWNLOAD
  ) {
    console.log('Skip downloading Edgedriver');
  } else {
    const downloadUrl = getDriverUrl();
    if (downloadUrl) {
      try {
        await mkdir('vendor');
      } catch (e) {
        try {
          await unlink('vendor/msedgedriver');
        } catch (e) {
          // DO nada
        }
      }
      const dl = new DownloaderHelper(downloadUrl, 'vendor', {
        fileName: 'msedgedriver.zip'
      });

      dl.on('error', err =>
        console.error('Could not download Edgedriver: ' + downloadUrl, err)
      )
        .on('progress', stats => {
          const progress = stats.progress.toFixed(1);
          const downloaded = byteHelper(stats.downloaded);
          const total = byteHelper(stats.total);
          console.log(`${progress}% [${downloaded}/${total}]`);
        })
        .on('end', () => {
          const zip = new StreamZip({
            file: 'vendor/msedgedriver.zip',
            storeEntries: true
          });
          zip.on('error', function(err) {
            // We got an error from unpacking
            console.error(
              `Edgedriver ${EDGEDRIVER_VERSION} could not be installed: ${err} `
            );
            // How should we exit?
          });
          zip.on('ready', () => {
            zip.extract(null, './vendor', async err => {
              console.log(
                err
                  ? 'Could not extract and install Edgedriver'
                  : `Edgedriver ${EDGEDRIVER_VERSION} installed in ${path.join(
                      __dirname,
                      'vendor'
                    )}`
              );
              zip.close();
              await unlink('vendor/msedgedriver.zip');
              let driverPath = 'vendor/msedgedriver';
                if (os.platform() === 'win32') {
                  driverPath = driverPath + '.exe';
                }
              await chmod(driverPath, '755');
            });
          });
        });

      dl.start();
    } else {
      console.log(
        'Skipping installing Edgedriver on ' +
          os.platform() +
          ' for ' +
          os.arch() +
          " since there's no official build"
      );
    }
  }
}
download();
