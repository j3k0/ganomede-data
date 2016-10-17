'use strict';

const config = require('./config');
const docs = require('./src/docs.router');
const server = require('./src/server');
const logger = require('./src/logger');
const store = require('./src/store');

const main = () => {
  logger.info('Running with env', process.env);
  logger.info('Parsed config', config);

  docs(config.http.prefix, server, {
    store: new store[config.store.klass](config.store.options)
  });

  server.listen(config.http.port, config.http.host, () => {
    const {port, family, address} = server.address();
    logger.info('Ready at %s:%d (%s)', address, port, family);
  });
};

if (!module.parent)
  main();
