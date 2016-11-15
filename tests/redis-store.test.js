'use strict';

const async = require('async');
const lodash = require('lodash');
const {expect} = require('chai');
const {RedisStore} = require('../src/store');
const samples = require('./samples');

describe('RedisStore', () => {
  const store = new RedisStore({
    prefix: 'data-test/v1:'
  });

  before(cb => store.redis.flushdb(cb));
  after(cb => store.redis.quit(cb));

  const missingId = 'missing';
  const docId = 'the-id';
  const bulkIds = Object.keys(samples.bulkUpsertDocs);

  describe('#insert()', () => {
    it('inserts docs', (done) => {
      store.insert(docId, samples.doc, (err) => {
        expect(err).to.be.null;
        done();
      });
    });
  });

  describe('#bulkUpsert', () => {
    it('inserts multiple documents', (done) => {
      store.bulkUpsert(samples.bulkUpsertDocs, (err) => {
        expect(err).to.be.null;

        async.map(
          bulkIds,
          store.fetch.bind(store),
          (err, bulkInsertion) => {
            expect(err).to.be.null;
            expect(bulkInsertion).to.eql(lodash.values(samples.bulkUpsertDocs));
            done();
          }
        );
      });
    });
  });

  describe('#fetch()', () => {
    it('retrieves existing docs', (done) => {
      store.fetch(docId, (err, doc) => {
        expect(err).to.be.null;
        expect(doc).to.eql(samples.doc);
        done();
      });
    });

    it('returns null for missing IDs', (done) => {
      store.fetch(missingId, (err, doc) => {
        expect(err).to.be.null;
        expect(doc).to.be.null;
        done();
      });
    });
  });

  describe('#search()', () => {
    it('returns all IDs if no query is specified', (done) => {
      store.search((err, ids) => {
        expect(err).to.be.null;
        expect(ids.sort()).to.eql([docId].concat(bulkIds).sort());
        done();
      });
    });

    it('searches with substring', (done) => {
      store.search('bulk-id', (err, ids) => {
        expect(err).to.be.null;
        expect(ids.sort()).to.eql(bulkIds.sort());
        done();
      });
    });

    it('searches with redis globs', (done) => {
      store.search('the-??', (err, ids) => {
        expect(err).to.be.null;
        expect(ids).to.eql([docId]);
        done();
      });
    });
  });

  describe('#replace()', () => {
    it('replaces existing docs', (done) => {
      store.replace(docId, samples.replacementDoc, (err) => {
        expect(err).to.be.null;

        store.fetch(docId, (err, doc) => {
          expect(err).to.be.null;
          expect(doc).to.eql(samples.replacementDoc);
          done();
        });
      });
    });

    it('does not "replace" non-existing docs', (done) => {
      store.fetch(missingId, (err, doc) => {
        expect(err).to.be.null;
        expect(doc).to.be.null;
        done();
      });
    });

    it('errors with NotFound on missing docs', (done) => {
      store.replace(missingId, samples.replacementDoc, (err) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('NotFound');
        done();
      });
    });
  });

  describe('#delete()', () => {
    it('removes existing docs', (done) => {
      store.delete(docId, (err) => {
        expect(err).to.be.null;
        store.fetch(docId, (err, doc) => {
          expect(err).to.be.null;
          expect(doc).to.be.null;
          done();
        });
      });
    });

    it('does not fail on missing docs', (done) => {
      store.delete(missingId, done);
    });
  });
});
