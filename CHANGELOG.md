# Changelog

What changed in each deployed version of DraftSensei. The version lives in
`package.json` and shows in the app header; see *Releasing* in the README for
the steps before each deploy.

## Unreleased

## [0.3.1] - 2026-11-02

### Fixed
- When Gemini is slow, suggestions wait up to 45 seconds for an answer instead
  of giving up after 15 with "took too long to answer".
## [0.3.0] - 2026-11-01

### Added
- Builds start from the Academy's top builds for your hero and lane, with their
  win rates, and now name the emblem and its talents, with the emblem's icon.
- Bans (optional): type them in and suggestions never include a banned hero.
- My rank, set once in My heroes: counters and builds come from players at
  your rank instead of all ranks mixed.

### Changed
- Clearer spacing: labels sit with their boxes, and sections, sides and lanes
  are spaced apart so it is easy to see what belongs together.
- Suggestions weigh the enemy in your own lane double, since that is who you
  fight most.
- The three tips after a build are labelled: Help first, Ult on, Win condition.

### Fixed
- The battle spell gets its icon even when Gemini leaves out the "Battle spell:"
  label.

## [0.2.0] - 2026-11-01

### Added
- Item and battle spell icons from the official MLBB Academy data.
- The build shows its six items in one row, in buying order.
- Hero suggestions use real counter and teammate win rates from ranked games.
- Gemini only gets items still in the shop, so removed items stop showing up.
- Roam and jungle builds name the blessing for the boots.
- Builds try Google Search first and say when they used it.
- Minimize button to fold an answer away.
- Version number in the header; click it to see what's new.
- The header shows today's asks out of the 500 free ones, shared by everyone.
- Hero portraits on picks, suggestions, your chosen hero and your hero pool.
- Your chosen hero shows under your team's picks, marked "you".
- Pick counts (4 / 5) on each side; the search box hides once a side is full.
- Portraits in the hero search list.

### Changed
- Picks and build are on one page, each with its own ask button.
- Asks go to `gemini-3.5-flash-lite` only, with no fallback model.
- Builds no longer label items core or situational.
- Phone layout: bigger lane chips and buttons, and the account shows as an
  icon instead of the full email.
- Each pick shows only its lane; tap it to pick another. A full draft now fits
  on about one phone screen.

### Fixed
- The account menu no longer crashes the page when opened.
- Heroes either team already picked are no longer suggested, even from your
  hero pool.

## [0.1.0] - 2026-10-31

### Added
- Next.js rebuild: Gemini answers on the server, so the key stays private.
- Google sign-in to sync the draft and hero pool between devices.
- Gemini's markdown renders as bold names and bullets.
- A model that stalls is abandoned instead of hanging the draft.
- Both prompts name the game.
