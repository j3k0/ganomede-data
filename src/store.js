'use strict';

const redis = require('redis');
const uuid = require('node-uuid');

const randomId = () => uuid.v4();

class StoreInterface {
  constructor () {
    if (this.constructor === StoreInterface)
      throw new Error('NotImplemented');
  }

  // callback(err, id)
  insert (doc, callback) { throw new Error('NotImplemented'); }

  // callback(err, doc || null)
  fetch (id, callback) { throw new Error('NotImplemented'); }

  // callback(err)
  replace (id, doc, callback) { throw new Error('NotImplemented'); }

  // callback(err)
  delete (id, callback) { throw new Error('NotImplemented'); }
}

class MemoryStore extends StoreInterface {
  constructor () {
    super();
    this._store = new Map();
  }

  insert (doc, callback) {
    const id = randomId();
    this._store.set(id, doc);
    setImmediate(callback, null, id);
  }

  fetch (id, callback) {
    const doc = this._store.has(id)
      ? this._store.get(id)
      : null;

    setImmediate(callback, null, doc);
  }

  replace (id, doc, callback) {
    if (!this._store.has(id))
      return setImmediate(callback, new Error('NotFound'));

    this._store.set(id, doc);
    setImmediate(callback, null);
  }

  delete (id, callback) {
    this._store.delete(id);
    setImmediate(callback, null);
  }
}

class RedisStore extends MemoryStore {

  constructor (options = {}) {
    super();
    this.redis = options.redis || redis.createClient(options);
    this.redisPrefix = options.prefix;

    if (!this.redis)
      throw new Error('Invalid options.redis');

    if (!this.redisPrefix)
      throw new Error('Invalid options.prefix');
  }

  insert (doc, callback) {
    const id = randomId();
    const value = JSON.stringify(doc);

    this.redis.set(id, value, 'NX', (err, reply) => {
      if (err)
        return callback(err);

      // Document was not created due to ID collision.
      if (reply === null)
        return callback(new Error('IdCollision'));

      callback(null, id);
    });
  }

  // Like fetch, but in serialized form.
  fetchRaw (id, callback) {
    this.redis.get(id, callback);
  }

  fetch (id, callback) {
    this.fetchRaw(id, (err, raw) => {
      if (err)
        return callback(err);

      const doc = (raw === null)
        ? null
        : JSON.parse(raw);

      callback(null, doc);
    });
  }

  replace (id, doc, callback) {
    const value = JSON.stringify(doc);

    this.redis.set(id, value, 'XX', (err, reply) => {
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
}

module.exports = {
  StoreInterface,
  MemoryStore,
  RedisStore
};
