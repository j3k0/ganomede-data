'use strict';

const td = require('testdouble');
const zlib = require('zlib');
const {expect} = require('chai');
const supertest = require('supertest');
const createServer = require('../src/server');
const docs = require('../src/docs.router');
const config = require('../config');
const {RedisStore} = require('../src/store');
const samples = require('./samples');

describe('docs-router', () => {
  const server = createServer();
  const endpoint = (path) => config.http.prefix + path;
  const go = () => supertest(server);
  const store = td.object(RedisStore);

  before(cb => {
    docs(config.http.prefix, server, {store});
    server.listen(cb);
  });

  after(cb => server.close(cb));

  describe('POST /docs', () => {
    it('creates documents', (done) => {
      td.when(store.insert(
          td.matchers.isA(String),
          samples.doc,
          td.callback
        ))
        .thenCallback(null);

      go()
        .post(endpoint('/docs'))
        .send({
          secret: config.secret,
          document: samples.doc
        })
        .expect(201)
        .end((err, res) => {
          expect(err).to.be.null;
          const generatedId = td.explain(store.insert).calls[0].args[0];
          expect(res.body.id).to.equal(generatedId);
          done();
        });
    });

    it('allows creation of documents with particular ID', (done) => {
      td.when(store.insert(
          'the-doc',
          samples.doc,
          td.callback
        ))
        .thenCallback(null);

      go()
        .post(endpoint('/docs'))
        .send({
          secret: config.secret,
          document: samples.doc,
          id: 'the-doc'
        })
        .expect(201, {id: 'the-doc'}, done);
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

    it('returns 400 in invalid custom id', (done) => {
      go()
        .post(endpoint('/docs'))
        .send({
          secret: config.secret,
          document: samples.doc,
          id: {something: 'unexpected', happened: true}
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

  describe('GET /docs', () => {
    it('returns list of all document IDs', (done) => {
      const allTheKeys = ['all', 'the', 'keys'];

      td.when(store.search(td.callback))
        .thenCallback(null, allTheKeys);

      go()
        .get(endpoint('/docs'))
        .expect(200, allTheKeys, done);
    });

    it('query string allows to specify search patterns ', (done) => {
      const someOfTheKeys = ['some', 'of', 'the', 'keys'];

      td.when(store.search('search-pattern', td.callback))
        .thenCallback(null, someOfTheKeys);

      go()
        .get(endpoint('/docs'))
        .query({q: 'search-pattern'})
        .expect(200, someOfTheKeys, done);
    });
  });

  describe('GET /docs/:id', () => {
    it('retreives documents and sends unzipped version', (done) => {
      td.when(store.fetch('doc-id', td.callback))
        .thenCallback(null, samples.doc);

      go()
        .get(endpoint('/docs/doc-id'))
        .set('Accept-Encoding', 'identity')
        .expect(200, samples.doc, done);
    });

    it('retrieves docs and sends gzipped version', (done) => {
      const gzipped = zlib.gzipSync(JSON.stringify(samples.doc));
      td.when(store.fetchRaw('doc-id', td.callback))
        .thenCallback(null, gzipped);

      go()
        .get(endpoint('/docs/doc-id'))
        .set('Accept-Encoding', 'gzip')
        .expect(200, samples.doc, done);
    });

    it('returns 404 on missing docs', (done) => {
      td.when(store.fetchRaw('missing', td.callback))
        .thenCallback(null, null);

      go()
        .get(endpoint('/docs/missing'))
        .expect(404, done);
    });
  });

  describe('POST /docs/:id', () => {
    it('replaces documents', (done) => {
      td.when(store.replace(
        'doc-id',
        samples.replacementDoc,
        td.callback
      ))
      .thenCallback(null);

      go()
        .post(endpoint('/docs/doc-id'))
        .send({
          secret: config.secret,
          document: samples.replacementDoc
        })
        .expect(200, done);
    });

    it('returns 400 on missing document', (done) => {
      go()
        .post(endpoint('/docs/any-id'))
        .send({secret: config.secret})
        .expect(400, done);
    });

    it('returns 400 on invalid document', (done) => {
      go()
        .post(endpoint('/docs/any-id'))
        .send({
          secret: config.secret,
          document: null
        })
        .expect(400, done);
    });

    it('returns 404 on missing docs', (done) => {
      td.when(store.replace(
          'missing-id',
          samples.replacementDoc,
          td.callback
        ))
        .thenCallback(new Error('NotFound'));

      go()
        .post(endpoint('/docs/missing-id'))
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
    td.when(store.delete('doc-id', td.callback))
      .thenCallback(null);

    it('removes documents', (done) => {
      go()
        .delete(endpoint('/docs/doc-id'))
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
