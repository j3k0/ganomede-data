'use strict';

const restify = require('restify');
const uuid = require('node-uuid');
const config = require('../config');
const {StoreInterface} = require('./store');

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

const validateDocument = (req, res, next) => {
  if (!req.body)
    return next(new restify.BadRequestError('MissingBody'));

  if (!Object.hasOwnProperty.call(req.body, 'document'))
    return next(new restify.BadRequestError('MissingDocument'));

  return req.body.document && (typeof req.body.document === 'object')
    ? next()
    : next(new restify.BadRequestError('InvalidDocument'));
};

module.exports = (prefix, server, options = {}) => {
  const prefixedRoot = `${prefix}/docs`;
  const prefixedDocument = `${prefix}/docs/:id`;

  const store = options.store;
  if (!(store instanceof StoreInterface))
    throw new Error('Invalid options.store');

  // Create document
  server.post(
    prefixedRoot,
    validateSecret,
    validateDocument,
    (req, res, next) => {
      const hasCustomId = Object.hasOwnProperty.call(req.body, 'id');
      const customIdOk = (typeof req.body.id === 'string')
        && (req.body.id.length > 0);

      if (hasCustomId && !customIdOk)
        return next(new restify.BadRequestError('InvalidId'));

      const id = (hasCustomId && customIdOk)
        ? req.body.id
        : uuid.v4();

      store.insert(id, req.body.document, (err) => {
        if (err)
          return next(err);

        res.json(201, {id});
      });
    }
  );

  // List/Search IDs
  server.get(prefixedRoot, (req, res, next) => {
    const hasQuery = Object.hasOwnProperty.call(req.query, 'q')
      && (typeof req.query.q === 'string')
      && (req.query.q.length > 0);

    const search = hasQuery
      ? store.search.bind(store, req.query.q)
      : store.search.bind(store);

    search((err, ids) => {
      return err
        ? next(err)
        : res.json(ids);
    });
  });

  // Read document
  server.get(prefixedDocument, (req, res, next) => {
    const gzip = req.acceptsEncoding('gzip');
    const fn = gzip
      ? store.fetchRaw
      : store.fetch;

    fn.call(store, req.params.id, (err, buf) => {
      if (err)
        return next(err);

      if (!buf)
        return next(new restify.NotFoundError());

      if (gzip) {
        res.header('Content-Type', 'application/json; charset=UTF-8');
        res.header('Content-Encoding', 'gzip');
        res.end(buf);
      }
      else {
        res.json(buf);
      }
    });
  });

  // Replace document.
  server.post(
    prefixedDocument,
    validateSecret,
    validateDocument,
    (req, res, next) => {
      store.replace(req.params.id, req.body.document, (err) => {
        if (err) {
          return (err.message === 'NotFound')
            ? res.send(404)
            : next(err);
        }

        res.send(200);
      });
    }
  );

  server.del(prefixedDocument, validateSecret, (req, res, next) => {
    store.delete(req.params.id, (err) => {
      return err
        ? next(err)
        : res.send(200);
    });
  });
};
