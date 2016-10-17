'use strict';

const restify = require('restify');

const notImpl = (req, res, next) => {
  next(new restify.NotImplementedError());
};

module.exports = (prefix, server, options = {}) => {
  const prefixedRoot = `${prefix}/docs`;
  const prefixedDocument = `${prefix}/docs/:id`;

  server.post(prefixedRoot, notImpl);

  server.get(prefixedDocument, notImpl);
  server.post(prefixedDocument, notImpl);
  server.del(prefixedDocument, notImpl);
};
