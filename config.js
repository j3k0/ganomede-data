'use strict';

const util = require('util');
const pkg = require('./package.json');

module.exports = {
  name: 'data',
  secret: (function () {
    const value = process.env.API_SECRET;
    const has = process.env.hasOwnProperty('API_SECRET');
    const valid = (typeof value === 'string') && (value.length > 0);
    const ok = has && valid;

    if (!ok) {
      const got = util.inspect(value);
      const msg = `Missing API_SECRET: expected non-empty string, got ${got}`;
      throw new Error(msg);
    }

    return value;
  }.call()),

  http: {
    host: process.env.HOST || '127.0.0.1',
    port: process.env.hasOwnProperty('PORT')
      ? parseInt(process.env.PORT, 10)
      : 8000,
    prefix: `/${pkg.api}`
  },

  store: { // Any constructor from `./src/store.js` and its options.
    klass: 'MemoryStore',
    options: {}
  }
};
