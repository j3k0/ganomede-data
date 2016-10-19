'use strict';

const restify = require('restify');

const server = restify.createServer();

server.use(restify.queryParser());
server.use(restify.bodyParser());

module.exports = server;
