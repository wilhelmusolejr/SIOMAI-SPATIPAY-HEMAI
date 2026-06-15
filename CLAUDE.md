# Siomai Redemption

## What this project is

**Siomai Redemption** is a small full‑stack web app for an **IMEI redemption
verification flow**. A user enters their email and a device **IMEI**, requests a
one‑time **verification code** (delivered by email through an upstream redemption
service), then enters that code to verify the device.

The brand wording is **not hardcoded** — it comes from the `.env` file
(`VITE_BRAND_TERM`, `VITE_BRAND_NAME`). With the current config the product
presents itself as **"Siomai"** / **"Siomai Redemption"**; change the env values
to re‑label the entire UI without touching code.

The frontend never talks to the upstream service directly. A thin **Express
backend** proxies the two calls and attaches the auth token server‑side, so the
token is never exposed to the browser.

## Tech stack

- **React 18 + Vite** — single‑page frontend (`src/`)
- **Express 4 (Node, ESM)** — API proxy (`server/`)
- **Plain CSS** with custom properties — theming + light/dark/system support
  (no Tailwind / UI framework)
- **dotenv** — configuration
- **concurrently** — runs the API and the Vite dev server together

## Project structure

```
spotify/
├── CLAUDE.md            # This file
├── README.md            # GitHub-facing docs
├── index.html           # Vite entry (mounts #root)
├── package.json         # Scripts + deps
├── vite.config.js       # Dev server + /api proxy to :3001
├── .env                 # Local config (gitignored) — see "Configuration"
├── .env.example         # Template for .env
├── src/
│   ├── main.jsx         # React bootstrap
│   ├── App.jsx          # The whole UI + flow logic
│   └── styles.css       # Design system + theme tokens
├── server/
│   └── index.js         # Express API: /api/send-code, /api/verify-code
└── php_old/             # Archived legacy PHP implementation (not used)
```

## Setup

```bash
npm install            # install dependencies
cp .env.example .env   # then fill in SERVICE_TOKEN + brand values
npm run dev            # API :3001 + Vite :5173
```
Requires **Node 18+**. `.env` is gitignored; only `VITE_`‑prefixed keys reach the
browser.

## How it runs

| Command | What it does |
|---------|--------------|
| `npm run dev` | Runs API (`:3001`) **and** Vite (`:5173`) together via `concurrently` |
| `npm run server` | API only (`node server/index.js`) |
| `npm run client` | Vite dev server only |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the built `dist/` |

In dev, Vite proxies `/api/*` to the Express server (`vite.config.js`). In
production (`NODE_ENV=production`) the Express server also serves the built
`dist/` and handles SPA fallback.

> **Important:** `dotenv` reads `.env` **once at startup**. After editing `.env`,
> **restart** the dev server — a running process will keep using the old values.
> (We hit exactly this: a stale server kept sending an empty token and the
> upstream returned `please login`.)

## Core flow

Two endpoints, both thin GET proxies to the upstream redemption API with the
service token attached as a cookie:

1. **`POST /api/send-code`** `{ email, imei }` → requests a verification code
   to be emailed.
2. **`POST /api/verify-code`** `{ email, imei, code }` → validates the code +
   device.

The frontend (`App.jsx`) drives a two‑step state machine:

- **Send step** — collect email + IMEI, call `send-code`.
- **Verify step** — reveal the code field, call `verify-code`.
- After **any** verify response the code is cleared and the form returns to the
  send step (the code is single‑use). If the failure specifically mentions the
  IMEI, the IMEI field is cleared too.

## Key conventions

- **Success is decided by the upstream `code` field, NOT the HTTP status.**
  Errors like `please login` still return HTTP 200, so check
  `code === 0` (see `interpret()` / `isSuccess()` in `App.jsx`).
- **Response copy:** the send panel uses friendly canned messages; the verify
  panel surfaces the upstream message directly (generic title like
  *Success* / *Error*, with the `info`/`msg` text capitalized).
- **Branding:** read `import.meta.env.VITE_*` constants at the top of `App.jsx`;
  only `VITE_`‑prefixed vars are exposed to the browser by Vite. Never reference
  a bare brand string in JSX — go through `BRAND_NAME` / `BRAND_TERM`.
- **IMEI validation** follows the GSMA standard: 15 digits = TAC(8) + serial(6)
  + **Luhn check digit(1)**. Helpers in `App.jsx`: `luhnCheckDigit`,
  `isValidImei`, `generateImei`, `completeImei`. The generator/autofill produce
  format‑valid IMEIs (good for testing) but use a random TAC, so the upstream
  may still reject them as not‑registered devices.
- **Theming:** `useTheme()` stores `light | system | dark` in `localStorage`,
  resolves `system` via `prefers-color-scheme`, and sets `data-theme` on
  `<html>`. All colors are CSS variables overridden under
  `:root[data-theme='dark']`.

## Configuration (`.env`)

| Key | Purpose |
|-----|---------|
| `PORT` | API server port (default `3001`) |
| `VITE_BRAND_TERM` | The brand **term** (e.g. `Siomai`) — logo label |
| `VITE_BRAND_NAME` | Full brand **name** shown in header + browser tab |
| `SERVICE_TOKEN` | Auth token (cookie) for the upstream redemption API |
| `PROXY_USERNAME` / `PROXY_PASSWORD` | Proxy creds (used only by the archived PHP) |
| `PROXYSCRAPE_API_TOKEN` | Proxy API token (archived PHP only) |

`.env` is gitignored; copy `.env.example` to `.env` and fill in values.

## Notes for Claude Code

- When adding UI brand text, route it through the env‑driven constants — do not
  reintroduce hardcoded brand words.
- When changing the send/verify logic, keep "success = upstream `code === 0`"
  and keep the code single‑use reset.
- `php_old/` is a frozen archive — don't wire it back into the live app.
- After any `.env` change, remind the user to restart the dev server.
