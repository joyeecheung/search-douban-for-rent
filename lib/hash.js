'use strict';

const SEP = '-exclude-';
const crypto = require('crypto');

module.exports = function(groupId, includes, excludes) {
  let sign = groupId + includes.join('-') + SEP + excludes.join('-');
  return crypto.createHash('md5').update(sign).digest('hex');
}
