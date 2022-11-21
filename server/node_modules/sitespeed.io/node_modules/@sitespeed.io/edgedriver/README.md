# Edgedriver

This is a simple package that downloads [Edgedriver](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/) and 
provides a node api for accessing the path to the binary. We want to keep this with minimimal dependencies.


How to use?
```node
const driver = require('@sitespeed.io/edgedriver');

const binPath = driver.binPath();
// launch edgedriver from binPath
```

You can override where you download the Edgedriver by setting *process.env.EDGEDRIVER_BASE_URL*. You can skip downloading Edgedriver by setting *process.env.EDGEDRIVER_SKIP_DOWNLOAD*.

You can download another Edgedriver version by setting *process.env.EDGEDRIVER_VERSION*.

```
EDGEDRIVER_VERSION=81.0.4044.20 node install.js
```

If you don't set a version, [the version](https://github.com/sitespeedio/edgedriver/blob/master/package.json#L4) in the *package.json* is used. 

