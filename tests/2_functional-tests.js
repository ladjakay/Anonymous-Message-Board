'use strict';

const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const { randomBytes } = require('crypto');
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {
  this.timeout(10000);
  const board = 'matrix-' + Date.now() + '-' + randomBytes(8).toString('hex');
  const threadText = 'A message from the grid';
  const threadPassword = 'thread-secret';
  let threadId;
  let replyId;

  test('Creating a new thread: POST /api/threads/{board}', function (done) {
    chai.request(server)
      .post('/api/threads/' + board)
      .send({ text: threadText, delete_password: threadPassword })
      .end(function (error, response) {
        assert.isNull(error);
        assert.equal(response.status, 200);
        assert.isString(response.body._id);
        threadId = response.body._id;
        done();
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each: GET /api/threads/{board}', function (done) {
    let pending = 4;
    for (let index = 0; index < 4; index++) {
      chai.request(server)
        .post('/api/replies/' + board)
        .send({
          thread_id: threadId,
          text: 'Reply ' + index,
          delete_password: 'reply-secret'
        })
        .end(function (error, response) {
          assert.isNull(error);
          assert.equal(response.status, 200);
          pending--;
          if (pending === 0) {
            chai.request(server)
              .get('/api/threads/' + board)
              .end(function (getError, getResponse) {
                assert.isNull(getError);
                assert.equal(getResponse.status, 200);
                assert.isArray(getResponse.body);
                assert.equal(getResponse.body.length, 1);
                assert.equal(getResponse.body[0].replies.length, 3);
                assert.notProperty(getResponse.body[0], 'delete_password');
                assert.notProperty(getResponse.body[0], 'reported');
                assert.notProperty(getResponse.body[0].replies[0], 'delete_password');
                assert.notProperty(getResponse.body[0].replies[0], 'reported');
                done();
              });
          }
        });
    }
  });

  test('Deleting a thread with the incorrect password: DELETE /api/threads/{board}', function (done) {
    chai.request(server)
      .delete('/api/threads/' + board)
      .send({ thread_id: threadId, delete_password: 'wrong-password' })
      .end(function (error, response) {
        assert.isNull(error);
        assert.equal(response.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a thread with the correct password: DELETE /api/threads/{board}', function (done) {
    chai.request(server)
      .delete('/api/threads/' + board)
      .send({ thread_id: threadId, delete_password: threadPassword })
      .end(function (error, response) {
        assert.isNull(error);
        assert.equal(response.text, 'success');
        done();
      });
  });

  test('Reporting a thread: PUT /api/threads/{board}', function (done) {
    chai.request(server)
      .post('/api/threads/' + board)
      .send({ text: 'A reportable thread', delete_password: threadPassword })
      .end(function (error, response) {
        assert.isNull(error);
        threadId = response.body._id;
        chai.request(server)
          .put('/api/threads/' + board)
          .send({ thread_id: threadId })
          .end(function (putError, putResponse) {
            assert.isNull(putError);
            assert.equal(putResponse.text, 'reported');
            done();
          });
      });
  });

  test('Creating a new reply: POST /api/replies/{board}', function (done) {
    chai.request(server)
      .post('/api/threads/' + board)
      .send({ text: 'A thread for replies', delete_password: threadPassword })
      .end(function (error, response) {
        assert.isNull(error);
        threadId = response.body._id;
        chai.request(server)
          .post('/api/replies/' + board)
          .send({
            thread_id: threadId,
            text: 'An answer from the grid',
            delete_password: 'reply-secret'
          })
          .end(function (postError, postResponse) {
            assert.isNull(postError);
            assert.equal(postResponse.status, 200);
            replyId = postResponse.body._id;
            done();
          });
      });
  });

  test('Viewing a single thread with all replies: GET /api/replies/{board}', function (done) {
    chai.request(server)
      .get('/api/replies/' + board)
      .query({ thread_id: threadId })
      .end(function (error, response) {
        assert.isNull(error);
        assert.equal(response.status, 200);
        assert.equal(response.body._id, threadId);
        assert.equal(response.body.replies.length, 1);
        assert.notProperty(response.body, 'delete_password');
        assert.notProperty(response.body.replies[0], 'delete_password');
        done();
      });
  });

  test('Deleting a reply with the incorrect password: DELETE /api/replies/{board}', function (done) {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId, delete_password: 'wrong-password' })
      .end(function (error, response) {
        assert.isNull(error);
        assert.equal(response.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a reply with the correct password: DELETE /api/replies/{board}', function (done) {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId, delete_password: 'reply-secret' })
      .end(function (error, response) {
        assert.isNull(error);
        assert.equal(response.text, 'success');
        done();
      });
  });

  test('Reporting a reply: PUT /api/replies/{board}', function (done) {
    chai.request(server)
      .put('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId })
      .end(function (error, response) {
        assert.isNull(error);
        assert.equal(response.text, 'reported');
        done();
      });
  });
});
