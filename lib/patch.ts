// The heroes the current game patch changed, kept by hand from the official
// patch notes. Win rates cover the past week, so for a few days after a patch
// they still describe the old one; these marks say which heroes that matters
// for. Update at each patch, with only what the official notes say.

export type PatchChange = 'buff' | 'nerf' | 'adjust';

export type Patch = {
  // As the game names it, e.g. "2.2.23".
  version: string;
  // The day it reached the original server, YYYY-MM-DD.
  date: string;
  // By hero name, spelled as in HEROES. The note is one short line in English,
  // as the game's own notes are.
  heroes: Record<string, { change: PatchChange; note?: string }>;
};

// Patch 2.2.23, from mlbbhub.com/patch-notes/original/2.2.23 (a fan site
// that reprints the game's notes; the official ones were not to hand). Each
// note keeps the notes' own wording, trimmed to what changed, without the
// reasons. Kagura's change is only a visual indicator, so she is left out:
// nothing about how she plays is different.
export const PATCH: Patch = {
  version: '2.2.23',
  date: '2026-11-11',
  heroes: {
    'Popol and Kupa': {
      change: 'adjust',
      note: 'Revamped. Enhanced their coordinated attacks and enabled Popol to ride Kupa to pursue enemies or retreat. Enhanced Kupa\'s scaling and HP Regen.',
    },
    Xavier: {
      change: 'buff',
      note: 'Shifted the damage of Skill 2 (Mystic Barrier) to the activation of Mystic Field. Smoothed out the feel of his skills to improve his mobility.',
    },
    Lunox: {
      change: 'buff',
      note: 'Adjusted her Passive. Increased the early-game damage of Skill 2 and improved the control feel of her Ultimate.',
    },
    Freya: {
      change: 'buff',
      note: 'Increased her strength outside of her Ultimate while reducing how frequently she can use it.',
    },
    Aldous: {
      change: 'buff',
      note: 'Reduced his downtime between trades during the laning phase and increased his late-game Damage Reduction.',
    },
    Kaja: {
      change: 'buff',
      note: 'Enemies now have more time to leave the area before his Ultimate takes effect, but can no longer use Control Immunity skills to avoid it. More ways to stay in his Soaring state longer, and more mobility while Soaring.',
    },
    Melissa: {
      change: 'buff',
      note: 'Last patch\'s adjustments weakened her more than intended, so they are partially rolled back.',
    },
    Gloo: { change: 'nerf', note: 'Was somewhat too strong and difficult to counter, so his strength is reduced.' },
    Masha: {
      change: 'nerf',
      note: 'Moved the slow effect to Skill 2, narrowed Skill 2\'s path, reduced Skill 1\'s and Skill 2\'s damage, optimized how Wounds are triggered, and slightly reduced the effectiveness of her claw strikes.',
    },
    Atlas: {
      change: 'nerf',
      note: 'Shortened Frigid Breath\'s duration and increased the freeze cooldown. Increased his Physical and Magic Defense bonuses.',
    },
    Lukas: {
      change: 'adjust',
      note: 'Increased his base damage and reduced his Physical Attack scaling to make defensive builds more viable.',
    },
    Karrie: {
      change: 'adjust',
      note: 'Improved her combat ability during her Ultimate, and adjusted Skill 1 to focus more on slowing enemies in the late game. Improved the clarity and trigger logic of some of her skills.',
    },
    Uranus: { change: 'adjust', note: 'Changed Basic Attack\'s Splash Damage to Magic Damage.' },
  },
};

// The match data covers a week, so a week after the patch it is all new games.
export const SETTLING_DAYS = 7;

export const patchChange = (hero: string, patch: Patch = PATCH) => patch.heroes[hero];

// True from the patch day until the week of data is all from the new patch.
export function isSettling(now: Date, patch: Patch = PATCH) {
  if (!patch.version || !patch.date) return false;
  const start = new Date(`${patch.date}T00:00:00Z`).getTime();
  if (Number.isNaN(start)) return false;
  const days = (now.getTime() - start) / 86_400_000;
  return days >= 0 && days < SETTLING_DAYS;
}
