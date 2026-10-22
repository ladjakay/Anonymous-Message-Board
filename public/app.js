'use strict';

const pathParts = window.location.pathname.split('/').filter(Boolean);
const board = pathParts[1] || '';
const threadId = pathParts[2] || '';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function actionButton(label, action, type) {
  const button = element('button', 'text-button', label);
  button.type = 'button';
  button.addEventListener('click', action);
  if (type) button.dataset.action = type;
  return button;
}

async function request(url, options) {
  const response = await fetch(url, options);
  const result = response.headers.get('content-type') || '';
  const body = result.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(typeof body === 'string' ? body : 'Request failed');
  return body;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function threadCard(thread, compact) {
  const card = element('article', 'thread-card' + (compact ? ' featured' : ''));
  const meta = element('div', 'meta');
  meta.append(element('span', '', 'ID / ' + thread._id));
  meta.append(element('time', '', new Date(thread.created_on).toLocaleString()));
  card.append(meta, element('p', 'message', thread.text));

  const actions = element('div', 'card-actions');
  const report = actionButton('REPORT', async function () {
    try {
      await request('/api/threads/' + encodeURIComponent(board), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: thread._id })
      });
      report.textContent = 'REPORTED';
      report.disabled = true;
    } catch (error) {
      window.alert(error.message);
    }
  });
  actions.append(report);

  const deleteForm = document.createElement('form');
  deleteForm.className = 'delete-form';
  const password = document.createElement('input');
  password.type = 'password';
  password.name = 'delete_password';
  password.placeholder = 'Delete key';
  password.required = true;
  password.setAttribute('aria-label', 'Thread delete key');
  const deleteButton = element('button', 'text-button', 'DELETE');
  deleteButton.type = 'submit';
  deleteForm.append(password, deleteButton);
  deleteForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    try {
      const response = await request('/api/threads/' + encodeURIComponent(board), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: thread._id,
          delete_password: password.value
        })
      });
      if (response === 'success') {
        card.remove();
      } else {
        window.alert(response);
      }
    } catch (error) {
      window.alert(error.message);
    }
  });
  actions.append(deleteForm);

  if (!compact) {
    const replyCount = element('span', 'reply-count', thread.replies.length + ' / 3 RECENT REPLIES');
    actions.append(replyCount);
  }
  card.append(actions);

  if (compact) {
    const replies = element('div', 'replies');
    thread.replies.forEach(function (reply) {
      replies.append(replyCard(reply, thread._id));
    });
    card.append(replies);

    const replyForm = document.createElement('form');
    replyForm.className = 'reply-form';
    const text = document.createElement('textarea');
    text.name = 'text';
    text.placeholder = 'Write a reply...';
    text.maxLength = 2000;
    text.required = true;
    text.setAttribute('aria-label', 'Reply text');
    const key = document.createElement('input');
    key.type = 'password';
    key.name = 'delete_password';
    key.placeholder = 'Delete key';
    key.required = true;
    key.setAttribute('aria-label', 'Reply delete key');
    const submit = element('button', 'button', 'REPLY');
    submit.type = 'submit';
    replyForm.append(text, key, submit);
    replyForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      try {
        await request('/api/replies/' + encodeURIComponent(board), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign(formData(replyForm), { thread_id: thread._id }))
        });
        window.location.reload();
      } catch (error) {
        window.alert(error.message);
      }
    });
    card.append(replyForm);
    const fullThreadLink = element('a', 'thread-link', 'OPEN FULL THREAD →');
    fullThreadLink.href = '/b/' + encodeURIComponent(board) + '/' + thread._id;
    card.append(fullThreadLink);
  } else {
    const replies = element('div', 'replies');
    thread.replies.forEach(function (reply) {
      replies.append(replyCard(reply, thread._id));
    });
    card.append(replies);
  }

  return card;
}

function replyCard(reply, parentThreadId) {
  const card = element('article', 'reply-card');
  const meta = element('div', 'meta');
  meta.append(element('span', '', 'REPLY / ' + reply._id));
  meta.append(element('time', '', new Date(reply.created_on).toLocaleString()));
  card.append(meta, element('p', 'message', reply.text));
  const actions = element('div', 'reply-actions');
  const report = actionButton('REPORT', async function () {
    try {
      await request('/api/replies/' + encodeURIComponent(board), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: parentThreadId, reply_id: reply._id })
      });
      report.textContent = 'REPORTED';
      report.disabled = true;
    } catch (error) {
      window.alert(error.message);
    }
  });
  actions.append(report);

  const deleteForm = document.createElement('form');
  deleteForm.className = 'delete-form';
  const password = document.createElement('input');
  password.type = 'password';
  password.name = 'delete_password';
  password.placeholder = 'Delete key';
  password.required = true;
  password.setAttribute('aria-label', 'Reply delete key');
  const deleteButton = element('button', 'text-button', 'DELETE');
  deleteButton.type = 'submit';
  deleteForm.append(password, deleteButton);
  deleteForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    try {
      await request('/api/replies/' + encodeURIComponent(board), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: parentThreadId,
          reply_id: reply._id,
          delete_password: password.value
        })
      });
      window.location.reload();
    } catch (error) {
      window.alert(error.message);
    }
  });
  actions.append(deleteForm);
  card.append(actions);
  return card;
}

function setBoardDetails() {
  document.querySelectorAll('#boardName').forEach(function (node) {
    node.textContent = board.toUpperCase();
  });
  document.querySelectorAll('#backToBoard, #threadFooterBack').forEach(function (link) {
    link.href = '/b/' + encodeURIComponent(board) + '/';
  });
}

async function showBoard() {
  const display = document.getElementById('boardDisplay');
  const feedCount = document.getElementById('feedCount');
  setBoardDetails();

  document.getElementById('newThread').addEventListener('submit', async function (event) {
    event.preventDefault();
    const message = this.querySelector('.form-message');
    try {
      await request('/api/threads/' + encodeURIComponent(board), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData(this))
      });
      message.textContent = 'TRANSMISSION RECEIVED.';
      this.reset();
      await renderThreads();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  async function renderThreads() {
    try {
      const threads = await request('/api/threads/' + encodeURIComponent(board));
      display.replaceChildren();
      feedCount.textContent = String(threads.length).padStart(2, '0') + ' TRANSMISSIONS';
      if (!threads.length) {
        display.append(element('p', 'empty-state', 'NO SIGNALS YET. BE THE FIRST TO TRANSMIT.'));
        return;
      }
      threads.forEach(function (thread) {
        display.append(threadCard(thread, true));
      });
    } catch (error) {
      feedCount.textContent = 'SIGNAL LOST';
      display.append(element('p', 'empty-state', error.message));
    }
  }

  await renderThreads();
}

async function showThread() {
  setBoardDetails();
  try {
    const thread = await request(
      '/api/replies/' + encodeURIComponent(board) + '?thread_id=' + encodeURIComponent(threadId)
    );
    document.getElementById('threadDisplay').append(threadCard(thread, false));
  } catch (error) {
    document.getElementById('threadDisplay').append(element('p', 'empty-state', error.message));
  }
}

if (document.getElementById('boardDisplay')) showBoard();
if (document.getElementById('threadDisplay')) showThread();
