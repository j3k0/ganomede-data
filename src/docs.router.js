'use strict';

const restify = require('restify');
const uuid = require('node-uuid');
const lodash = require('lodash');
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

const validateDocuments = (req, res, next) => {
  if (!req.body)
    return next(new restify.BadRequestError('MissingBody'));

  const docsOk = Object.hasOwnProperty.call(req.body, 'documents')
    && req.body.documents
    && (typeof req.body.documents === 'object')
    && (Object.keys(req.body.documents).length > 0);

  if (!docsOk)
    return next(new restify.BadRequestError('MissingDocuments'));

  const everyDocOk = lodash.every(req.body.documents, (doc, id) => (
    id && (typeof id === 'string') && (id.length > 0) &&
    doc && (typeof doc === 'object')
  ));

  return everyDocOk
    ? next()
    : next(new restify.BadRequestError('InvalidDocument'));
};

module.exports = (prefix, server, options = {}) => {
  const prefixedRoot = `${prefix}/docs`;
  const prefixedBulk = `${prefix}/docs/_bulk_upsert`;
  const prefixedDocument = `${prefix}/docs/:id`;

  const store = options.store;
  if (!(store instanceof StoreInterface))
    throw new Error('Invalid options.store');

  // Upsert multiple docs
  // (must be before create document endpoint)
  server.post(
    prefixedBulk,
    validateSecret,
    validateDocuments,
    (req, res, next) => {
      const docs = req.body.documents;
      const ids = Object.keys(docs);

      store.bulkUpsert(docs, (err) => {
        if (err)
          return next(err);

        res.json(201, ids);
        next();
      });
    }
  );

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
        next();
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
      if (err)
        return next(err);

      res.json(ids);
      next();
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

      next();
    });
  });

  // Replace document.
  server.post(
    prefixedDocument,
    validateSecret,
    validateDocument,
    (req, res, next) => {
      store.replace(req.params.id, req.body.document, (err) => {
        if (err && (err.message === 'NotFound')) {
          res.send(404);
          return next();
        }
        else if (err) {
          return next(err);
        }

        res.send(200);
        next();
      });
    }
  );

  server.del(prefixedDocument, validateSecret, (req, res, next) => {
    store.delete(req.params.id, (err) => {
      if (err)
        return next(err);

      res.send(200);
      next();
    });
  });
};
