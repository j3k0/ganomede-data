'use strict';

const crypto = require('crypto');

class StoreInterface {
  constructor () {}

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
    const id = crypto.randomBytes(24).toString('hex');
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

module.exports = {
  StoreInterface,
  MemoryStore
};
