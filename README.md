# DraftSensei — Mobile Legends draft helper

A page you keep open while drafting. Type the heroes as they are picked, press
**Ask**, and the answer lands at the bottom of the screen: which hero to take,
or which spell and items to build.

Next.js + Tailwind + shadcn/ui. The Gemini key lives on the server, so the
browser never sees it.

## Setup

```bash
npm install
cp .env.example .env.local
```

Put a key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
into `.env.local`, then:

```bash
npm run dev
```

`.env.local` is gitignored. The key is read only inside `app/api/ask/route.ts`,
which runs on the server.

## How it works

Two steps:

1. **Picks** — type a few letters, Enter to add. Each hero's lane is filled in
   from `lib/heroes.ts`; press `1`–`5` or click to change it. Two heroes in one
   lane raises a warning, because one of the guesses is wrong.
2. **My build** — the hero you ended up on, for the spell and item answer.

**Ask** (or `Cmd/Ctrl+Enter`) sends the prompt. Change a pick afterwards and the
answer dims with *picks changed* — it was computed from a board that no longer
exists.

**My heroes** holds a pool per lane. When the lane you are on has a pool, the
answer only suggests from it.

**Show prompt** reveals the prompt text and a copy button, for when the quota is
gone or the network is down. Paste it into
[gemini.google.com](https://gemini.google.com/app) and you lose nothing but a
click.

## Signing in (optional)

Without this, the draft and hero pool live in each browser's `localStorage` —
your laptop and your phone keep separate copies. Sign in with a Google account
and they share one, kept in Firestore under your account id.

In the [Firebase console](https://console.firebase.google.com), in the
**DraftSensei** project:

1. Add a **Web app** to the project.
2. **Authentication → Sign-in method →** enable **Google**.
3. **Firestore Database → Create database.**
4. **Authentication → Settings → Authorized domains:** add wherever you host it.
   `localhost` is already allowed.

The Gemini API key belongs to this same project: in
[AI Studio](https://aistudio.google.com/apikey), **Create API key** and pick
**DraftSensei** rather than letting it generate a new `gen-lang-client-…` one.
One project keeps the free quota in a single place.

Copy the four config values into `.env.local`, then publish the rules in
`firestore.rules` so each account can reach only its own document:

```bash
npx firebase deploy --only firestore:rules
```

Those four values are public — they ship inside the page, as they do in every
Firebase web app, and only name the project. The rules are what keep the data
private. The Gemini key is the opposite: it is a real secret, which is why it
stays in `app/api/ask/route.ts` on the server.

Leave them blank and no sign-in button appears; the app works exactly as before,
on that device only.

When you sign in, whichever copy was saved most recently wins — the cloud one or
the one on that device. Changes then upload about a second after you stop
typing. The cloud icon in the header turns red if a save fails.

## Quota

Measured on this project's key at
[aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit):

| Model                 | RPM | TPM  | Requests/day |
| --------------------- | --- | ---- | ------------ |
| gemini-3.5-flash-lite | 15  | 250K | 500          |
| gemini-2.5-flash      | 5   | 250K | 20           |

One draft is two asks, so 500/day is roughly 250 games. Not a constraint.

`gemini-2.5-flash` is retired for keys made after its cutoff — it answers 404
with *"no longer available to new users"*. Don't put it in the chain.

The route tries `gemini-flash-latest` first for answer quality and falls back to
`gemini-3.5-flash-lite`. The fallback is not only about quota: Flash returns 503
*"experiencing high demand"* often, and a draft cannot wait. Override either
with `GEMINI_MODEL` and `GEMINI_FALLBACK_MODEL`; if Flash is busy more often
than not, set `GEMINI_MODEL=gemini-3.5-flash-lite` and skip the wasted attempt.

The *asks today* counter is this app's own tally in `localStorage`. It is a
rough gauge: it drifts if the key is used elsewhere, and it cannot see the real
remaining quota — the console above is authoritative.

## Commands

```bash
npm run dev     # dev server
npm test        # vitest, run once
npm run build   # production build
npx eslint .    # lint
```

## Deploying

This app needs a server for `/api/ask`, so plain Firebase Hosting will not run
it. Two options:

- **Vercel** — free tier, static pages plus the API route. Set `GEMINI_API_KEY`
  in the project's environment variables.
- **Firebase App Hosting** — keeps you on Firebase, but needs the Blaze plan.

## `legacy/`

The original static version: plain ES modules, no build step, no server. It
cannot hold an API key, so it only produces the prompt for you to paste. Kept as
a reference and an offline fallback; not linted, not tested.
