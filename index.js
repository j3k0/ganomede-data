'use strict';

const config = require('./config');
const docs = require('./src/docs.router');
const about = require('./src/about.router');
const ping = require('./src/ping.router');
const createServer = require('./src/server');
const logger = require('./src/logger');
const store = require('./src/store');

const main = () => {
  const server = createServer();

  logger.info('Running with env', process.env);
  logger.info('Parsed config', config);

  about(config.http.prefix, server);
  ping(config.http.prefix, server);

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
