'use strict';

const fs = require('fs');
const path = require('path');

let cache = {};

function get(viewPath) {
  let viewRealPath = path.resolve(__dirname + '/' + viewPath);
  if (cache[viewRealPath]) {
    return cache[viewRealPath];
  }
  let file = fs.readFileSync(viewRealPath, 'utf8');
  cache[viewRealPath] = file;
  return file;
}

module.exports = {
  __cache: cache,
  get: get
};