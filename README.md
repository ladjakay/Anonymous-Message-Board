# THE GRID — Anonymous Message Board

A full-stack anonymous message board with a matrix-inspired interface. Visitors can create board-specific threads, reply, report content, and delete their own posts with a password.

## Run locally

1. Install dependencies with `npm install`.
2. Optionally set `DB_FILE` in `.env` to choose where the SQLite database file is stored. It defaults to `data/message-board.sqlite`.
3. Run `npm start`. No database server or separate database installation is needed. With `NODE_ENV=test`, the ten functional tests run after the server starts.

Run `npm test` to execute the ten functional tests against the local SQLite database. The app and default general board are available at `http://localhost:3000`; other boards are available at `/b/:board/`.

## API

- `POST /api/threads/:board` — create a thread with `text` and `delete_password`.
- `GET /api/threads/:board` — list the ten most recently bumped threads and up to three recent replies per thread.
- `DELETE /api/threads/:board` — delete a thread using `thread_id` and `delete_password`.
- `PUT /api/threads/:board` — report a thread using `thread_id`.
- `POST /api/replies/:board` — add a reply with `thread_id`, `text`, and `delete_password`.
- `GET /api/replies/:board?thread_id=...` — return a thread and its full reply history.
- `DELETE /api/replies/:board` — redact a reply using `thread_id`, `reply_id`, and `delete_password`.
- `PUT /api/replies/:board` — report a reply using `thread_id` and `reply_id`.

The app permits framing by same-origin pages only, disables DNS prefetching, and uses the `same-origin` referrer policy.
