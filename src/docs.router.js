'use strict';

const restify = require('restify');
const config = require('../config');
const {StoreInterface} = require('./store');

const notImpl = (req, res, next) => {
  next(new restify.NotImplementedError());
};

const validateSecret = (req, res, next) => {
  if (!req.body)
    return next(new restify.BadRequestError());

  const value = req.body.secret;
  const has = Object.hasOwnProperty.call(req.body, 'secret');
  const valid = (typeof value === 'string') && (value.length > 0);
  const ok = has && valid && (config.secret === value);

  delete req.body.secret;

  return ok
    ? next()
    : next(new restify.NotAuthorizedError());
};

module.exports = (prefix, server, options = {}) => {
  const prefixedRoot = `${prefix}/docs`;
  const prefixedDocument = `${prefix}/docs/:id`;

  const store = options.store;
  if (!(store instanceof StoreInterface))
    throw new Error('Invalid options.store');

  // Create document
  server.post(prefixedRoot, validateSecret, (req, res, next) => {
    store.insert(req.body.document, (err, id) => {
      if (err)
        return next(err);

      res.json(201, {id});
    });
  });

  // Read document
  server.get(prefixedDocument, (req, res, next) => {
    store.fetch(req.params.id, (err, doc) => {
      if (err)
        return next(err);

      if (!doc)
        return next(new restify.NotFoundError());

      res.json(doc);
    });
  });

  // Replace document.
  server.post(prefixedDocument, validateSecret, (req, res, next) => {
    store.replace(req.params.id, req.body.document, (err) => {
      if (err) {
        return (err.message === 'NotFound')
          ? res.send(404)
          : next(err);
      }

      res.send(200);
    });
  });

  server.del(prefixedDocument, validateSecret, (req, res, next) => {
    store.delete(req.params.id, (err) => {
      return err
        ? next(err)
        : res.send(200);
    });
  });
};
