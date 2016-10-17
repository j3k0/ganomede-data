'use strict';

const zlib = require('zlib');
const {expect} = require('chai');
const supertest = require('supertest');
const server = require('../src/server');
const docs = require('../src/docs.router');
const config = require('../config');
const {MemoryStore} = require('../src/store');
const samples = require('./samples');

describe('docs-router', () => {
  const endpoint = (path) => config.http.prefix + path;
  const go = () => supertest(server);
  const store = new MemoryStore();
  const storeGet = (id) => JSON.parse(
    zlib.gunzipSync(store._store.get(id))
  );
  let docId;

  before(cb => {
    docs(config.http.prefix, server, {store});
    server.listen(cb);
  });

  after(cb => server.close(cb));

  describe('POST /docs', () => {
    it('creates documents', (done) => {
      go()
        .post(endpoint('/docs'))
        .send({
          secret: config.secret,
          document: samples.doc
        })
        .expect(201)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res.body.id).to.be.a('string');
          expect(storeGet(res.body.id)).to.eql(samples.doc);
          docId = res.body.id;
          done();
        });
    });

    it('returns 400 on missing document', (done) => {
      go()
        .post(endpoint('/docs'))
        .send({secret: config.secret})
        .expect(400, done);
    });

    it('returns 400 on invalid document', (done) => {
      go()
        .post(endpoint('/docs'))
        .send({
          secret: config.secret,
          document: null
        })
        .expect(400, done);
    });

    it('requires API_SECRET', (done) => {
      go()
        .post(endpoint('/docs'))
        .send({document: samples.doc})
        .expect(403, done);
    });
  });

  describe('GET /docs/:id', () => {
    it('retreives documents', (done) => {
      go()
        .get(endpoint(`/docs/${docId}`))
        .expect(200, samples.doc, done);
    });

    it('returns 404 on missing docs', (done) => {
      go()
        .get(endpoint('/docs/missing'))
        .expect(404, done);
    });
  });

  describe('POST /docs/:id', () => {
    it('replaces documents', (done) => {
      go()
        .post(endpoint(`/docs/${docId}`))
        .send({
          secret: config.secret,
          document: samples.replacementDoc
        })
        .expect(200)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res.text).to.equal('');
          expect(storeGet(docId)).to.eql(samples.replacementDoc);
          done();
        });
    });

    it('returns 400 on missing document', (done) => {
      go()
        .post(endpoint(`/docs/${docId}`))
        .send({secret: config.secret})
        .expect(400, done);
    });

    it('returns 400 on invalid document', (done) => {
      go()
        .post(endpoint(`/docs/${docId}`))
        .send({
          secret: config.secret,
          document: null
        })
        .expect(400, done);
    });

    it('returns 404 on missing docs', (done) => {
      go()
        .post(endpoint('/docs/missing'))
        .send({
          secret: config.secret,
          document: samples.replacementDoc
        })
        .expect(404, done);
    });

    it('requires API_SECRET', (done) => {
      go()
        .post(endpoint('/docs/anyId'))
        .send({
          secret: `invalid-${config.secret}`,
          document: samples.replacementDoc
        })
        .expect(403, done);
    });
  });

  describe('DELETE /docs/:id', () => {
    it('removes documents', (done) => {
      go()
        .delete(endpoint(`/docs/${docId}`))
        .send({secret: config.secret})
        .expect(200)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res.text).to.equal('');
          expect(store._store.has(docId)).to.be.false;
          done();
        });
    });

    it('deleting missing document is 200 OK', (done) => {
      go()
        .delete(endpoint('/docs/missing'))
        .send({secret: config.secret})
        .expect(200, done);
    });

    it('requires API_SECRET', (done) => {
      go()
        .delete(endpoint('/docs/anyId'))
        .expect(400, done);
    });
  });
});
