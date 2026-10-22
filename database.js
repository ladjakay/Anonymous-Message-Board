'use strict';

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { randomBytes } = require('crypto');

const databasePath = path.resolve(
  process.cwd(),
  process.env.DB_FILE || 'data/message-board.sqlite'
);

let db;

function persist() {
  const temporaryPath = databasePath + '.tmp';
  fs.writeFileSync(temporaryPath, Buffer.from(db.export()));
  fs.renameSync(temporaryPath, databasePath);
}

function row(statement) {
  return statement.getAsObject();
}

function readReplies(threadId, limit) {
  const query = limit
    ? 'SELECT id AS _id, text, created_on FROM replies WHERE thread_id = ? ORDER BY created_on DESC, rowid DESC LIMIT ?'
    : 'SELECT id AS _id, text, created_on FROM replies WHERE thread_id = ? ORDER BY created_on ASC, rowid ASC';
  const statement = db.prepare(query);
  statement.bind(limit ? [threadId, limit] : [threadId]);
  const replies = [];
  while (statement.step()) replies.push(row(statement));
  statement.free();
  if (limit) replies.reverse();
  return replies;
}

function readThread(thread, replyLimit) {
  return {
    _id: thread._id,
    text: thread.text,
    created_on: thread.created_on,
    bumped_on: thread.bumped_on,
    replies: readReplies(thread._id, replyLimit)
  };
}

function findThread(board, threadId) {
  const statement = db.prepare(
    'SELECT id AS _id, text, created_on, bumped_on, delete_password FROM threads WHERE board = ? AND id = ?'
  );
  statement.bind([board, threadId]);
  const thread = statement.step() ? row(statement) : null;
  statement.free();
  return thread;
}

const ready = initSqlJs().then(function (SQL) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  if (fs.existsSync(databasePath)) {
    db = new SQL.Database(fs.readFileSync(databasePath));
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  db.run(`
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      board TEXT NOT NULL,
      text TEXT NOT NULL,
      created_on TEXT NOT NULL,
      bumped_on TEXT NOT NULL,
      reported INTEGER NOT NULL DEFAULT 0,
      delete_password TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS threads_by_board_bump
      ON threads (board, bumped_on DESC);
    CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_on TEXT NOT NULL,
      reported INTEGER NOT NULL DEFAULT 0,
      delete_password TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS replies_by_thread
      ON replies (thread_id, created_on);
  `);
  persist();
});

function newId() {
  return randomBytes(12).toString('hex');
}

async function listThreads(board) {
  await ready;
  const statement = db.prepare(
    'SELECT id AS _id, text, created_on, bumped_on FROM threads WHERE board = ? ORDER BY bumped_on DESC, rowid DESC LIMIT 10'
  );
  statement.bind([board]);
  const threads = [];
  while (statement.step()) threads.push(readThread(row(statement), 3));
  statement.free();
  return threads;
}

async function getThread(board, threadId) {
  await ready;
  const thread = findThread(board, threadId);
  return thread ? readThread(thread) : null;
}

async function createThread(board, text, deletePassword) {
  await ready;
  const id = newId();
  const createdOn = new Date().toISOString();
  const statement = db.prepare(
    'INSERT INTO threads (id, board, text, created_on, bumped_on, delete_password) VALUES (?, ?, ?, ?, ?, ?)'
  );
  statement.run([id, board, text.trim(), createdOn, createdOn, deletePassword]);
  statement.free();
  persist();
  return id;
}

async function createReply(board, threadId, text, deletePassword) {
  await ready;
  if (!findThread(board, threadId)) return null;

  const id = newId();
  const createdOn = new Date().toISOString();
  db.run(
    'INSERT INTO replies (id, thread_id, text, created_on, delete_password) VALUES (?, ?, ?, ?, ?)',
    [id, threadId, text.trim(), createdOn, deletePassword]
  );
  db.run('UPDATE threads SET bumped_on = ? WHERE id = ?', [createdOn, threadId]);
  persist();
  return id;
}

async function deleteThread(board, threadId, deletePassword) {
  await ready;
  const thread = findThread(board, threadId);
  if (!thread) return 'not found';
  if (thread.delete_password !== deletePassword) return 'incorrect password';
  db.run('DELETE FROM threads WHERE id = ? AND board = ?', [threadId, board]);
  persist();
  return 'success';
}

async function reportThread(board, threadId) {
  await ready;
  if (!findThread(board, threadId)) return false;
  db.run('UPDATE threads SET reported = 1 WHERE id = ? AND board = ?', [threadId, board]);
  persist();
  return true;
}

async function deleteReply(board, threadId, replyId, deletePassword) {
  await ready;
  if (!findThread(board, threadId)) return 'thread not found';
  const statement = db.prepare(
    'SELECT delete_password FROM replies WHERE id = ? AND thread_id = ?'
  );
  statement.bind([replyId, threadId]);
  const reply = statement.step() ? row(statement) : null;
  statement.free();
  if (!reply) return 'reply not found';
  if (reply.delete_password !== deletePassword) return 'incorrect password';
  db.run('UPDATE replies SET text = ? WHERE id = ?', ['[deleted]', replyId]);
  persist();
  return 'success';
}

async function reportReply(board, threadId, replyId) {
  await ready;
  if (!findThread(board, threadId)) return 'thread not found';
  const statement = db.prepare(
    'SELECT id FROM replies WHERE id = ? AND thread_id = ?'
  );
  statement.bind([replyId, threadId]);
  const exists = statement.step();
  statement.free();
  if (!exists) return false;
  db.run('UPDATE replies SET reported = 1 WHERE id = ?', [replyId]);
  persist();
  return true;
}

module.exports = {
  ready,
  listThreads,
  getThread,
  createThread,
  createReply,
  deleteThread,
  reportThread,
  deleteReply,
  reportReply
};
