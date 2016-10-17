'use strict';

const {expect} = require('chai');
const redis = require('redis');
const {RedisStore} = require('../src/store');
const samples = require('./samples');

describe('RedisStore', () => {
  const store = new RedisStore({
    redis: redis.createClient(),
    prefix: 'data-test/v1'
  });

  after(cb => store.redis.quit(cb));

  const missingId = 'missing';
  let docId;

  describe('#insert()', () => {
    it('inserts docs', (done) => {
      store.insert(samples.doc, (err, id) => {
        expect(err).to.be.null;
        expect(id).to.be.ok;
        docId = id;
        done();
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
