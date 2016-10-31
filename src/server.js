'use strict';

const restify = require('restify');

module.exports = () => {
  const server = restify.createServer();

  server.use(restify.queryParser());
  server.use(restify.bodyParser());

  return server;
};
