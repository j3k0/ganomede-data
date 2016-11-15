'use strict';

const async = require('async');
const redis = require('redis');
const zlib = require('zlib');

const serialize = (obj, cb) => {
  const buf = Buffer.from(JSON.stringify(obj), 'utf8');
  zlib.gzip(buf, cb);
};

const deserialize = (buf, cb) => {
  zlib.gunzip(buf, (err, json) => {
    return err
      ? cb(err)
      : cb(null, JSON.parse(json));
  });
};

class StoreInterface {
  constructor () {
    if (this.constructor === StoreInterface)
      throw new Error('NotImplemented');
  }

  // callback(err)
  _insert (id, data, callback) { throw new Error('NotImplemented'); }
  insert (id, doc, callback) {
    async.waterfall([
      (cb) => serialize(doc, cb),
      (buf, cb) => this._insert(id, buf, cb)
    ], callback);
  }

  // callback(err)
  _bulkUpsert (idToDataHash, callback) { throw new Error('NotImplemented'); }
  bulkUpsert (idToDocHash, callback) {
    async.waterfall([
      async.mapValues.bind(
        async,
        idToDocHash,
        (val, key, cb) => serialize(val, cb)
      ),
      this._bulkUpsert.bind(this)
    ], callback);
  }

  // callback(err, serializedDoc || null)
  fetchRaw (id, callback) {
    throw new Error('NotImplemented');
  }

  // callback(err, doc || null)
  fetch (id, callback) {
    this.fetchRaw(id, (err, buf) => {
      if (err)
        return callback(err);

      if (buf === null)
        return callback(null, null);

      deserialize(buf, callback);
    });
  }

  // callback(err)
  _replace (id, data, callback) { throw new Error('NotImplemented'); }
  replace (id, doc, callback) {
    async.waterfall([
      (cb) => serialize(doc, cb),
      (buf, cb) => this._replace(id, buf, cb)
    ], (err) => callback(err));
  }

  // callback(err)
  delete (id, callback) { throw new Error('NotImplemented'); }

  // callback(err, [string])
  search () { throw new Error('NotImplemented'); }

  // Cleanly close all connections.
  quit (callback) { throw new Error('NotImplemented'); }
}

class RedisStore extends StoreInterface {
  constructor (options = {}) {
    super();
    this.redis = options.redis || redis.createClient(options);
    this.redisPrefix = options.prefix;

    if (!this.redis)
      throw new Error('Invalid options.redis');

    if (!this.redisPrefix)
      throw new Error('Invalid options.prefix');
  }

  _insert (id, buf, callback) {
    this.redis.set(id, buf.toString('binary'), 'NX', (err, reply) => {
      if (err)
        return callback(err);

      // Document was not created due to ID collision.
      if (reply === null)
        return callback(new Error('IdCollision'));

      callback(null);
    });
  }

  _bulkUpsert (idsToBuf, callback) {
    const multi = this.redis.multi();
    Object.keys(idsToBuf).forEach(id => multi.set(
      id, idsToBuf[id].toString('binary')
    ));
    multi.exec((err, replies) => callback(err));
  }

  // Like fetch, but in serialized form.
  fetchRaw (id, callback) {
    this.redis.get(id, (err, reply) => {
      if (err)
        return callback(err);

      const buf = (reply === null)
        ? null
        : Buffer.from(reply, 'binary');

      callback(null, buf);
    });
  }

  _replace (id, buf, callback) {
    this.redis.set(id, buf.toString('binary'), 'XX', (err, reply) => {
      if (err)
        return callback(err);

      if (reply === null)
        return callback(new Error('NotFound'));

      callback(null);
    });
  }

  delete (id, callback) {
    this.redis.del(
      id,
      (err) => callback(err)
    );
  }

  search (queryArg, callbackArg) {
    let query = queryArg;
    let callback = callbackArg;

    if (arguments.length === 1) {
      query = '*';
      callback = queryArg;
    }

    // Is Redis glob pattern or just substring.
    const pattern = (-1 !== query.search(/[\?\*\[]/))
      ? query
      : `*${query}*`;

    const prefixedPattern = (this.redisPrefix || '') + pattern;

    this.redis.keys(prefixedPattern, (err, keys) => {
      if (err)
        return callback(err);

      const ids = this.redisPrefix
        ? keys.map(key => key.slice(this.redisPrefix.length))
        : keys;

      callback(null, ids);
    });
  }

  quit (callback) {
    this.redis.quit(callback);
  }
}

module.exports = {
  StoreInterface,
  RedisStore
};
