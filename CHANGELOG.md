# Changelog

What changed in each deployed version of DraftSensei. The version lives in
`package.json` and shows in the app header; see *Releasing* in the README for
the steps before each deploy.

## Unreleased

## [0.8.0] - 2026-11-03

### Added
- Draft check shows who your hero does best and worst against.
- Draft check names your best partner when the best pair on your team is someone else.

### Changed
- Draft check says Best pair instead of Best combo: the number shows who wins more together, not whose skills combine.

## [0.7.0] - 2026-11-03

### Fixed
- Counter numbers were backwards: a hero shown as good into an enemy was really the one that enemy beats. Suggested picks, Ask AI to choose and ban suggestions now use them the right way round.
- An emblem the AI writes as "Tank Emblem" shows its icon.
- The lane warning no longer says two heroes when there are three or more.
- Build tips no longer name an enemy under Help first when no teammate has been entered yet.

### Changed
- Hero suggestions show five on a laptop or tablet. Phones keep three.
- Every hero suggestion shows its win rate, so the order explains itself.
- Ask AI to choose says what each hero does in this match instead of repeating the numbers.
- A hero you type in starts in the first lane the game lists for it, so Selena starts in MID. Tap the lane to change it.

### Added
- Draft check: once both teams are full, a card shows your lane matchup, team win rates, counters, best combo and damage split.
- Picks can show the best heroes for the other open lanes, to help a teammate choose. Tap one to add it to your team.
- Ban suggestions can be filtered by lane.
- Hero search forgives typos and knows short names: yss finds Yi Sun-shin, pk finds Popol and Kupa, gunevere finds Guinevere.
- With heroes in My heroes for your lane, ban suggestions move up what counters them and show by how much.
- Suggested picks include heroes in every lane the game lists them, so Selena now shows up for MID as well as ROAM.
- My build says when the enemy team leans physical or magic, and which defense is worth more. Adjust for enemy team uses the same count.
- With three or four heroes on your team, My team warns if there is no tank yet or only one kind of damage.
- Suggested picks move up a hero that brings what your team is missing, and say so when that sets it apart from the others shown.

## [0.6.0] - 2026-11-02

### Added
- My heroes shows each hero's win rate this week at your rank, while you type and beside the heroes you added, so you can check a hero before adding it.
- Hero I picked shows the same win rate while you type and beside your hero.
- My heroes has a Clear button on each lane with two or more heroes.

### Changed
- Suggested picks start from each hero's win rate at your rank, then add its counters and combos, so a hero already winning more ranks above a weaker one with slightly bigger counters.

## [0.5.3] - 2026-11-02

### Fixed
- Build tips name a teammate under Help first, and an enemy under Ult on.

### Changed
- Suggest build waits until you have picked your hero, and says so.
- The page scrolls to what comes next: to your build after you tap a
  suggested hero, up to the hero chips when the AI has chosen, and to the
  whole build when the AI has adjusted it.

## [0.5.2] - 2026-11-02

### Changed
- One hero list, not two: Ask AI to choose puts the AI's 3 picks in place of
  the instant ones, as the same tappable chips with the AI's reason, and
  marks any hero the AI added.
- One build on screen, not two: Adjust for enemy team turns the ranked build
  into one fitted to this match, in the same place, with the swapped items
  marked. Heroes with no ranked build to show still use Suggest build.

## [0.5.1] - 2026-11-02

### Added
- What DraftSensei is for, in one line above the how-to steps.

### Changed
- The instant build has all 6 items in buying order, boots included: the
  Academy's winning core items, topped up with the items most players' own
  builds for that hero agree on.

### Fixed
- The rank dropdown uses the app's own arrow.
- A newly picked hero always gets a fresh build, never an old saved one.

## [0.5.0] - 2026-11-02

### Added
- Instant build: as soon as you pick your hero, the build that wins most in
  ranked games shows with its spell, emblem, talents and core items. Suggest
  build still adds the rest for the enemy team. It shows only when that
  build is played in at least 5% of games, so a lucky rare build never does.
- Bahasa Melayu: an EN | BM switch at the top, remembered and kept with your
  account. A phone set to Malay starts in Malay, and Gemini answers in Malay
  too. Hero, item and lane names stay as the game writes them.
- A tip under the steps: DraftSensei works best on a second screen beside
  the phone you play on.
- How to use, in 3 steps, shown on an empty draft and gone once you start.
- The ✕ is back on your own row under team picks, to clear your hero.

### Changed
- The page follows the game's draft: your lane and rank first, then 1 Bans,
  2 Picks and 3 Build. Once all 10 bans are in, they fold to one row.
- On a phone, ban suggestions are shorter so two fit on a line, and the
  keyboard no longer pops up when the page opens.
- Show prompt is now a small ⋯ button, and the asks counter only shows once
  the day's shared asks run low.
- Your lane and rank sit together at the top of Picks, instead of one in the
  header and one inside My heroes.
- Instant picks sit above the team lists, so new picks never push them out
  of sight.
- Instant picks name the teammate a hero combos with best, as in
  "+1.2% win vs Layla, +3.6% with Kaja", and Suggest heroes can give a combo
  as its reason too.

### Fixed
- The Common emblem is called Common, with its icon, instead of "All".
- Builds get their item icons back after the data source has been busy,
  instead of going without them for hours.

## [0.4.0] - 2026-11-02

### Added
- Ban suggestions: the 5 strongest heroes this week at your rank, by win rate
  and how often they are already banned. Tap one to ban it. No asking needed,
  so it shows instantly and does not use the daily asks.
- Instant picks: the 3 best heroes for your lane, updated as each pick goes
  in, each with how much more often it wins against the enemy it counters
  best. Tap one to make it your hero. No asking needed.

### Changed
- The lane menu closes once you choose, and names lanes as the chips do.

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
