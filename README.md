# Real-Time Notes

A real-time note-taking app backend. It provides authenticated note management, sharing and permissions, comments, tags, notifications, and collaborative editing over WebSockets.

> This repository currently contains the backend only; there is no frontend application in this workspace.

## Features

- Sign up and log in with email/password, with Google sign-in support
- Create, edit, search, archive, restore, and delete notes
- Organize notes with tags
- Share notes by email with view, comment, or edit permissions
- Add comments and receive notifications
- Collaborate on note content using Yjs and Hocuspocus
- Track active collaborators and recent changes with Redis
- Upload profile images to Cloudinary

## Tech Stack

- Node.js, Express, and Socket.IO
- MongoDB with Mongoose
- Hocuspocus and Yjs for collaborative editing
- Redis with JSON and search capabilities
- Nodemailer for email delivery
- Cloudinary for image uploads

## Requirements

- Node.js and npm
- MongoDB configured to support change streams (normally a replica set)
- Redis with RedisJSON and RediSearch modules available
- Gmail SMTP credentials for email features
- Cloudinary credentials for profile image uploads
- Google OAuth client credentials for Google sign-in

## Setup

1. Install the backend dependencies:

   ```sh
   cd backend
   npm install
   ```

2. Create `backend/.env` with the following values:

   ```dotenv
   PORT=4000
   MONGODB_URI=mongodb://localhost:27017/real-time-notes
   TOKEN_SECRET=replace-with-a-long-random-secret

   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASS=

   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=

   EMAIL=
   PASS=

   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   ```

   `REDIS_PASS` may be empty if Redis does not require authentication. `EMAIL` and `PASS` are used for Gmail SMTP; use an app password where required by your Google account. Google OAuth and Cloudinary values are needed for those integrations.

3. Start the development server:

   ```sh
   npm run dev
   ```

   Or start it without file watching:

   ```sh
   npm start
   ```

The server listens on the port set by `PORT`. The frontend's Socket.IO origin is currently configured as `http://localhost:3000` in `backend/config/sockets.js`.

## API Overview

The HTTP API is mounted under `/api`:

| Prefix           | Purpose                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| `/api/auth`      | Signup, login, password recovery, profile updates, and profile lookup            |
| `/api/dashboard` | Notes, tags, comments, sharing, permissions, notifications, and account settings |

Most dashboard endpoints require a JWT in the request header:

```http
Authorization: Bearer <token>
```

Some of the available dashboard routes include:

- `GET /api/dashboard/all-notes` and `GET /api/dashboard/archived-note`
- `POST /api/dashboard/all-notes/create`
- `GET /api/dashboard/note/:id`
- `PUT /api/dashboard/all-note/edit/:id`
- `DELETE /api/dashboard/all-notes/delete/:id`
- `GET /api/dashboard/search/:searchQuery`
- `GET` and `POST /api/dashboard/all-notes/:id/comment`
- `GET` and `PUT /api/dashboard/notifications`
- `POST /api/dashboard/note/share`

See `backend/routes/auth-routes.js` and `backend/routes/dashboard-routes.js` for the full route list and HTTP methods.

## Real-Time Connections

- Collaborative document updates use the WebSocket endpoint `/collaboration`. Hocuspocus authenticates connections using the JWT token and loads Yjs document state from MongoDB; edits are tracked in Redis.
- Socket.IO is used for live app events. Clients can join note rooms with `join-room` and notification rooms with `join-notify-room`.

## Tests

There are no test cases configured yet. The current `npm test` script is a placeholder and exits with an error.
