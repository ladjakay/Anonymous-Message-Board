'use strict';

const database = require('../database');

function isValidText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

module.exports = function (app) {
  app.route('/api/threads/:board')
    .get(async function (req, res, next) {
      try {
        res.json(await database.listThreads(req.params.board));
      } catch (error) {
        next(error);
      }
    })
    .post(async function (req, res, next) {
      const { text, delete_password: deletePassword } = req.body;
      if (!isValidText(text) || !isValidText(deletePassword)) {
        return res.status(400).type('text').send('text and delete_password are required');
      }

      try {
        res.json({ _id: await database.createThread(req.params.board, text, deletePassword) });
      } catch (error) {
        next(error);
      }
    })
    .delete(async function (req, res, next) {
      const { thread_id: threadId, delete_password: deletePassword } = req.body;
      if (!threadId || !isValidText(deletePassword)) {
        return res.status(400).type('text').send('thread_id and delete_password are required');
      }

      try {
        const result = await database.deleteThread(req.params.board, threadId, deletePassword);
        if (result === 'not found') return res.status(404).type('text').send('thread not found');
        res.type('text').send(result);
      } catch (error) {
        next(error);
      }
    })
    .put(async function (req, res, next) {
      const threadId = req.body.thread_id;
      if (!threadId) return res.status(400).type('text').send('thread_id is required');

      try {
        const updated = await database.reportThread(req.params.board, threadId);
        if (!updated) return res.status(404).type('text').send('thread not found');
        res.type('text').send('reported');
      } catch (error) {
        next(error);
      }
    });

  app.route('/api/replies/:board')
    .get(async function (req, res, next) {
      if (!req.query.thread_id) {
        return res.status(400).type('text').send('thread_id is required');
      }

      try {
        const thread = await database.getThread(req.params.board, req.query.thread_id);
        if (!thread) return res.status(404).type('text').send('thread not found');
        res.json(thread);
      } catch (error) {
        next(error);
      }
    })
    .post(async function (req, res, next) {
      const {
        thread_id: threadId,
        text,
        delete_password: deletePassword
      } = req.body;
      if (!threadId || !isValidText(text) || !isValidText(deletePassword)) {
        return res.status(400).type('text').send('thread_id, text and delete_password are required');
      }

      try {
        const replyId = await database.createReply(
          req.params.board,
          threadId,
          text,
          deletePassword
        );
        if (!replyId) return res.status(404).type('text').send('thread not found');
        res.json({ _id: replyId });
      } catch (error) {
        next(error);
      }
    })
    .delete(async function (req, res, next) {
      const {
        thread_id: threadId,
        reply_id: replyId,
        delete_password: deletePassword
      } = req.body;
      if (!threadId || !replyId || !isValidText(deletePassword)) {
        return res.status(400).type('text').send('thread_id, reply_id and delete_password are required');
      }

      try {
        const result = await database.deleteReply(
          req.params.board,
          threadId,
          replyId,
          deletePassword
        );
        if (result === 'thread not found') {
          return res.status(404).type('text').send('thread not found');
        }
        if (result === 'reply not found') {
          return res.status(404).type('text').send('reply not found');
        }
        res.type('text').send(result);
      } catch (error) {
        next(error);
      }
    })
    .put(async function (req, res, next) {
      const { thread_id: threadId, reply_id: replyId } = req.body;
      if (!threadId || !replyId) {
        return res.status(400).type('text').send('thread_id and reply_id are required');
      }

      try {
        const result = await database.reportReply(req.params.board, threadId, replyId);
        if (result === 'thread not found') {
          return res.status(404).type('text').send('thread not found');
        }
        if (!result) return res.status(404).type('text').send('reply not found');
        res.type('text').send('reported');
      } catch (error) {
        next(error);
      }
    });
};
