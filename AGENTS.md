# TKD-scoreboard AI Agent Instructions

## Purpose
This file helps coding agents understand the structure, conventions, and most important files in the TKD-scoreboard repository.

## Key project facts
- Frontend-only React application built with Vite.
- Uses Firebase Realtime Database for live score updates and referee slot management.
- Uses `pdfjs-dist` for PDF parsing in the data import workflow.
- No backend server code is included in this repository.
- Deployment target is GitHub Pages; `vite.config.js` uses `base: '/TKD-scoreboard/'`.

## Primary commands
- `npm install` to install dependencies.
- `npm run dev` to start the local Vite development server.
- `npm run build` to create a production bundle under `dist/`.
- `npm run lint` to run ESLint over the repository.
- `npm run deploy` to publish the `dist/` site using `gh-pages`.

## Most important source files
- `src/App.jsx` — application routing and main layout.
- `src/main.jsx` — React app bootstrap.
- `src/firebase.js` — Firebase initialization.
- `src/Api.js` — primary application logic for score updates, match loading, and Firebase interactions.

## Page / feature entry points
- `src/Pages/Controller/Controller.jsx` — corner judge controller UI and referee slot logic.
- `src/Pages/Screen/Screen.jsx` — scoreboard host display.
- `src/Pages/CourtSetup/CourtSetup.jsx` — court configuration.
- `src/Pages/DataImport/DataImport.jsx` — PDF import and match setup.
- `src/Pages/Screen/Edit.jsx` — edit screen for match and display settings.

## Components and UI conventions
- App components live under `src/Components/`.
- Styling is plain CSS alongside each component/page, e.g. `ComponentName.css`.
- Popup and modal behavior is managed by `src/Context/PopupContext.jsx`.
- Authentication / referee state uses `src/Context/AuthContext.jsx`.

## Firebase realtime design
- The repository includes a design document at `docs/FIREBASE_MULTI_DEVICE_DESIGN.md`.
- Use that document as the primary reference for slot-based judge login, `onDisconnect()` cleanup, and event/court data flow.
- `database.rules.json` and `firebase.json` define the deployed database rules and hosting configuration.

## Conventions for changes
- Keep the Vite `base` path in mind when working with routing or asset paths.
- Avoid editing generated output under `dist/`.
- For UI changes, follow the existing CSS module-like pattern: one CSS file per component/page.
- For Firebase changes, make sure to preserve the existing referee slot and event data shape used by the app.

## Useful documentation links
- `README.md` — user-facing product and feature overview.
- `docs/FIREBASE_MULTI_DEVICE_DESIGN.md` — realtime data model and multi-device coordination.
- `package.json` — scripts and dependency list.

## Notes for agents
- When asked to add new frontend features, prefer updating `src/Pages` and `src/Components` rather than modifying tooling.
- When asked to fix data synchronization bugs, inspect `src/Api.js`, `src/firebase.js`, `src/Pages/Controller/Controller.jsx`, and `src/Pages/Screen/Screen.jsx` first.
- If a task involves QR code, match import, or event setup, `src/Components/QRCodeDisplay/QRCodeDisplay.jsx` and `src/Pages/DataImport/DataImport.jsx` are likely relevant.
