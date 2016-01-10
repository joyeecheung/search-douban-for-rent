// Could be buggy
// https://nodejs.org/api/modules.html#modules_module_caching_caveats
'use strict';

const storage = require('node-persist');

storage.initSync({
  // logging: true,
  dir: __dirname + '/data'
});

module.exports = storage;
