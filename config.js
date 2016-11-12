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
    host: process.env.HOST || '0.0.0.0',
    port: process.env.hasOwnProperty('PORT')
      ? parseInt(process.env.PORT, 10)
      : 8000,
    prefix: `/${pkg.api}`
  },

  store: { // Any constructor from `./src/store.js` and its options.
    klass: 'RedisStore',
    options: {
      // Specify `redis` for existing client, or any of the options from
      // https://github.com/NodeRedis/node_redis#options-object-properties
      host: process.env.REDIS_DATA_PORT_6379_TCP_ADDR || '127.0.0.1',
      port: parseInt(process.env.REDIS_DATA_PORT_6379_TCP_PORT, 10) || 6379,
      prefix: pkg.api + ':'
    }
  }
};
