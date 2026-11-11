# Chatblox

A standalone place to hang out with friends using private room codes, text chat, and voice chat (voice is planned for the backend-enabled release).

## Current starter

This repository is built with plain HTML, CSS, and JavaScript.

### Run locally

Open `index.html` in a browser. For best results, use VS Code Live Server.

### Features in this starter

- Create a room with a shareable room code.
- Join a room by code.
- Change your display name at any time.
- `jergan` is a reserved administrator name. The admin password is verified by a server in the production version; never put the password in browser JavaScript.
- Responsive chat interface with a local demo mode.

## Important: live multiplayer setup

This starter UI runs in local demo mode. Real cross-device rooms, persistent messages, authentication, and voice chat require a trusted backend. The admin password must be configured as a server-side secret (not committed to this repository).