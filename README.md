# Chatblox

A standalone place to hang out with friends using room codes and chat.

## Stack

Plain HTML, CSS, and JavaScript, plus a Vercel serverless function for reserved admin-name verification.

## Run locally

Open `index.html` in a browser, or use the VS Code Live Server extension.

## Current starter features

- Create a six-character room code.
- Join a room by code in the same browser profile.
- Change your display name.
- Responsive chat interface.
- Local demo messages sync between tabs in the same browser using BroadcastChannel.
- `jergan` is reserved and requires server-side password verification.

## Configure the reserved admin name on Vercel

In the Vercel project, open **Settings → Environment Variables** and add:

- `JERGAN_ADMIN_PASSWORD` — set its value to the requested admin password.
- `JERGAN_SESSION_SECRET` — use a long, random secret (at least 32 random bytes).

Redeploy after adding the variables. The password is checked by `api/admin-login.js`; it is not stored in browser JavaScript or committed to this repository. Do not put either secret in a public file.

## Important: prototype limitations

This is the first frontend prototype, not a finished live multiplayer service. Room creation and messages currently use browser local storage, so rooms do **not** work across different devices or browsers. The people list is local to the current browser. Voice chat is not implemented yet.

To make Chatblox a real Roblox-style hangout service, the next backend stage needs shared room storage, accounts, realtime messages/presence, server-enforced room membership and admin sessions, plus WebRTC voice signaling (with a TURN service for reliable connections). Do not treat the current local demo as a secure moderation or multiplayer system.

Not affiliated with Roblox.
