'use strict';

const pkg = require('./package.json');

module.exports = {
  name: 'data',

  http: {
    host: process.env.HOST || '127.0.0.1',
    port: process.env.hasOwnProperty('PORT')
      ? parseInt(process.env.PORT, 10)
      : 8000,
    prefix: `/${pkg.api}`
  }
};
