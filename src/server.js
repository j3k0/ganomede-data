'use strict';

const restify = require('restify');

const server = restify.createServer();

server.use(restify.bodyParser());
server.use(restify.gzipResponse());

module.exports = server;
