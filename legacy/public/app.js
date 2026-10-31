import { HEROES, HERO_LANES } from './heroes.js';
import {
  LANES, laneLabel, laneClashes, searchHeroes, newDraft, newPool, poolFor,
  takenHeroes, pickPrompt, buildPrompt,
} from './draft.js';

const STORAGE_KEY = 'ml-draft-helper';
const POOL_KEY = 'ml-draft-helper-pool';

const state = {
  step: 1,
  pool: newPool(),
  draft: newDraft(),
  activeChip: null, // { side, index } — the pick waiting for a lane
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const sides = {
  team: $('.side--team'),
  enemy: $('.side--enemy'),
};

/* ---------- persistence ---------- */

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: state.step, draft: state.draft }));
    localStorage.setItem(POOL_KEY, JSON.stringify(state.pool));
  } catch { /* private browsing — the app still works, it just won't survive a reload */ }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.draft?.picks) {
      state.draft = { ...newDraft(), ...saved.draft };
      state.step = saved.step || 1;
    }
    const pool = JSON.parse(localStorage.getItem(POOL_KEY) || 'null');
    if (pool) state.pool = { ...newPool(), ...pool };
  } catch { /* ignore unreadable saved drafts */ }
}

/* ---------- lane buttons ---------- */

function laneButtons(selected, onPick, wrap = document.createElement('div')) {
  wrap.className = 'lanes';
  wrap.replaceChildren();
  for (const lane of LANES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = lane.key;
    b.title = laneLabel(lane.key);
    b.setAttribute('aria-pressed', String(selected === lane.key));
    b.addEventListener('click', () => onPick(lane.key));
    wrap.append(b);
  }
  return wrap;
}

/* ---------- rendering ---------- */

function render() {
  $$('#steps button').forEach((b) => {
    b.setAttribute('aria-current', String(Number(b.dataset.step) === state.step));
  });

  $('#board').hidden = state.step === 2;
  $('#mine').hidden = state.step !== 2;

  laneButtons(state.draft.myLane, (lane) => {
    state.draft.myLane = lane;
    commit();
  }, $('#my-lane'));

  $('#hint').textContent = state.step === 1
    ? 'Type a few letters, Enter to add. The lane is filled in for you — press 1–5 or click to change it: 1 exp · 2 mid · 3 jungle · 4 gold · 5 roam. Cmd/Ctrl+Enter copies.'
    : '';

  for (const side of ['team', 'enemy']) renderSide(side);
  $('#chosen').textContent = state.draft.myHero
    ? `${state.draft.myHero} — ${laneLabel(state.draft.myLane)}`
    : '';

  $('#prompt-text').textContent = promptForStep();
  const copy = $('#copy');
  copy.classList.remove('copied');
  copy.textContent = 'Copy prompt';
}

function renderSide(side) {
  const root = sides[side];
  $('h2', root).textContent = side === 'team' ? 'My team picks' : 'Enemy picks';

  const list = $('.chips', root);
  list.dataset.empty = 'No picks yet.';
  list.replaceChildren();

  const entries = state.draft.picks[side];
  const clashes = laneClashes(entries);

  const warn = $('.warn', root);
  warn.hidden = clashes.length === 0;
  warn.textContent = clashes.length
    ? `Two heroes in ${clashes.map(laneLabel).join(' and ')} — fix the lane.`
    : '';

  entries.forEach((entry, i) => {
    const hero = entry.hero;
    const li = document.createElement('li');
    li.className = 'chip';
    if (state.activeChip?.side === side && state.activeChip.index === i) {
      li.classList.add('is-active');
    }

    if (clashes.includes(entry.lane)) li.classList.add('is-clash');

    const name = document.createElement('span');
    name.className = 'chip-name';
    name.textContent = hero;
    li.append(name);

    li.append(laneButtons(entry.lane, (lane) => {
      entry.lane = lane;
      state.activeChip = null;
      commit();
    }));

    const drop = document.createElement('button');
    drop.type = 'button';
    drop.className = 'drop';
    drop.textContent = '✕';
    drop.title = `Remove ${hero}`;
    drop.addEventListener('click', () => {
      entries.splice(i, 1);
      state.activeChip = null;
      commit();
    });
    li.append(drop);
    list.append(li);
  });
}

function promptForStep() {
  return state.step === 1 ? pickPrompt(state.draft, state.pool) : buildPrompt(state.draft);
}

function commit() {
  save();
  render();
}

/* ---------- hero autocomplete ---------- */

function wireEntry(entryRoot, onChoose, unavailable = () => takenHeroes(state.draft)) {
  const input = $('input', entryRoot);
  const list = $('.suggest', entryRoot);
  let matches = [];
  let cursor = 0;

  const close = () => { list.hidden = true; list.replaceChildren(); matches = []; };

  const paint = () => {
    list.replaceChildren();
    matches.slice(0, 6).forEach((hero, i) => {
      const li = document.createElement('li');
      li.textContent = hero;
      li.setAttribute('aria-selected', String(i === cursor));
      li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(hero); });
      list.append(li);
    });
    list.hidden = matches.length === 0;
  };

  const choose = (hero) => {
    input.value = '';
    close();
    onChoose(hero);
    input.focus();
  };

  input.addEventListener('input', () => {
    matches = searchHeroes(input.value, HEROES, unavailable()).slice(0, 6);
    cursor = 0;
    paint();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!matches.length) return;
      e.preventDefault();
      cursor = (cursor + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
      paint();
      return;
    }
    if (e.key === 'Enter' && matches.length) {
      e.preventDefault();
      choose(matches[cursor]);
      return;
    }
    if (e.key === 'Escape') { input.value = ''; close(); return; }

    // 1–5 sets the lane of the pick just added, without leaving the keyboard.
    if (!input.value && state.activeChip && /^[1-5]$/.test(e.key)) {
      e.preventDefault();
      const { side, index } = state.activeChip;
      state.draft.picks[side][index].lane = LANES[Number(e.key) - 1].key;
      state.activeChip = null;
      commit();
    }
  });

  input.addEventListener('blur', () => setTimeout(close, 120));
}

/* ---------- wiring ---------- */

for (const side of ['team', 'enemy']) {
  wireEntry($('.entry', sides[side]), (hero) => {
    state.draft.picks[side].push({ hero, lane: HERO_LANES[hero] || 'mid' });
    state.activeChip = { side, index: state.draft.picks[side].length - 1 };
    commit();
  });
}

// Step 2 is about the hero I ended up on, so my own team's picks stay selectable —
// only enemy picks are off the table.
wireEntry($('.entry', $('#mine')), (hero) => {
  state.draft.myHero = hero;
  commit();
}, () => state.draft.picks.enemy.map((p) => p.hero));

$$('#steps button').forEach((b) => {
  b.addEventListener('click', () => {
    state.step = Number(b.dataset.step);
    state.activeChip = null;
    commit();
    const focus = state.step === 2 ? $('#my-hero') : $('.side--enemy input');
    focus.focus();
  });
});

$('#new-draft').addEventListener('click', () => {
  const lane = state.draft.myLane;
  state.draft = { ...newDraft(), myLane: lane };
  state.step = 1;
  state.activeChip = null;
  commit();
});

function renderPool() {
  const root = $('#pool-lanes');
  root.replaceChildren();

  for (const lane of LANES) {
    const box = document.createElement('div');
    box.className = 'pool-lane';

    const title = document.createElement('h3');
    title.textContent = laneLabel(lane.key);
    box.append(title);

    const entry = document.createElement('div');
    entry.className = 'entry';
    entry.innerHTML = '<input type="text" autocomplete="off" spellcheck="false" '
      + 'placeholder="Type a hero…"><ul class="suggest" hidden></ul>';
    box.append(entry);

    const heroes = document.createElement('div');
    heroes.className = 'pool-heroes';
    for (const hero of poolFor(state.pool, lane.key)) {
      const tag = document.createElement('span');
      tag.className = 'pool-hero';
      tag.textContent = hero;
      const drop = document.createElement('button');
      drop.type = 'button';
      drop.textContent = '✕';
      drop.title = `Remove ${hero}`;
      drop.addEventListener('click', () => {
        state.pool[lane.key] = state.pool[lane.key].filter((h) => h !== hero);
        commit();
        renderPool();
      });
      tag.append(drop);
      heroes.append(tag);
    }
    box.append(heroes);
    root.append(box);

    wireEntry(entry, (hero) => {
      if (!state.pool[lane.key].includes(hero)) state.pool[lane.key].push(hero);
      commit();
      renderPool();
      $(`.pool-lane:nth-child(${LANES.indexOf(lane) + 1}) input`, root).focus();
    }, () => poolFor(state.pool, lane.key));
  }
}

$('#edit-pool').addEventListener('click', () => {
  renderPool();
  $('#pool').showModal();
});

$('#pool-done').addEventListener('click', () => $('#pool').close());

$('#copy').addEventListener('click', copyPrompt);

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    copyPrompt();
  }
});

async function copyPrompt() {
  const button = $('#copy');
  try {
    await navigator.clipboard.writeText(promptForStep());
    button.classList.add('copied');
    button.textContent = 'Copied';
  } catch {
    button.textContent = 'Press Ctrl+C — text selected';
    const range = document.createRange();
    range.selectNodeContents($('#prompt-text'));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  }
}

load();
render();
$('.side--enemy input').focus();
