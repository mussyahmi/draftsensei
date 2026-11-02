// Every word the page shows, in English and in formal Malay. Hero, item,
// spell and emblem names and the lane chips stay as the game writes them,
// so neither list has them.

export type Lang = 'en' | 'ms';

export const LANGS: { key: Lang; label: string; name: string }[] = [
  { key: 'en', label: 'EN', name: 'English' },
  { key: 'ms', label: 'BM', name: 'Bahasa Melayu' },
];

const en = {
  language: 'Language',
  whatsNew: "What's new",
  changelogNote: '',
  youreOn: (version: string) => `You're on v${version}.`,
  playing: "I'm playing",
  asksToday: (used: number, limit: number) => `${used} / ${limit} asks today`,
  myHeroes: 'My heroes',
  newDraft: 'New draft',

  picks: 'Picks',
  myBuild: 'My build',
  teamPicks: 'My team picks',
  enemyPicks: 'Enemy picks',
  heroIPicked: 'The hero I picked',
  typeHero: 'Type a hero…',
  suggestHeroes: 'Suggest heroes',
  suggestBuild: 'Suggest build',

  purpose: 'DraftSensei helps you through the MLBB draft: who to ban, which hero to pick for your lane, and how to build it.',
  howTo: [
    "Choose your lane and rank below. They're remembered.",
    "Type each hero as it's picked in game. Suggestions update as you go.",
    'Tap a suggested hero to make it yours. Its build shows up, ready to adjust for the enemy team.',
  ],
  howToTip: 'Works best on a second screen: a laptop, tablet or another phone beside you while you play.',

  bans: 'Bans',
  optional: 'optional',
  banHero: 'Ban a hero…',
  strongest: 'Strongest this week, tap to ban',
  banReason: (win: number, ban: number) => `${win}% win, ${ban}% banned`,
  banShort: (win: number) => `${win}% win`,
  ban: (hero: string) => `Ban ${hero}`,
  unban: (hero: string) => `Unban ${hero}`,

  bestForLane: 'Best for your lane right now, tap to pick',
  askAiPick: 'Ask AI to choose',
  aiChose: 'Chosen by AI for this team comp, tap to pick. Marked heroes are new.',
  newPick: 'New pick from the AI',
  topBuild: (win: number) => `Top build in ranked games, ${win}% win.`,
  adjustBuild: 'Adjust for enemy team',
  pickHeroFirst: 'Pick your hero first: type it above, or tap a suggested hero in Picks.',
  adjusted: 'Adjusted for this enemy team from the top ranked build. Marked items are the changes.',
  changedItem: 'Changed for this enemy team',
  buildItems: 'Items in buying order',
  pickHero: (hero: string) => `Pick ${hero}`,
  // How an instant pick's reason reads: "+1.2% win vs Layla, +3.6% with Kaja".
  reasonWords: { win: 'win', with: 'with' },

  you: 'you',
  noPicks: 'No picks yet.',
  clash: (lanes: string[]) => `Two heroes in ${lanes.join(' and ')}. Fix the lane.`,
  remove: (hero: string) => `Remove ${hero}`,
  laneMenu: (lane: string) => `Lane: ${lane}. Change lane`,

  asking: 'Asking…',
  askAgain: 'Ask again',
  showPrompt: 'Show prompt',
  hidePrompt: 'Hide prompt',
  showAnswer: 'Show answer',
  minimize: 'Minimize',
  copyPrompt: 'Copy prompt',
  copied: 'Copied',
  searched: 'searched Google',
  stale: 'Picks changed, ask again',

  serverError: (status: number) => `Server error (${status}). Try again.`,
  noAnswer: 'Gemini did not answer.',
  tooSlow: 'Gemini took too long to answer. Try again.',
  noConnection: 'No connection. Use Show prompt and paste it into Gemini.',
  readFailed: (why: string) => `Could not read your saved data: ${why}`,
  saveFailed: (why: string) => `Could not save: ${why}`,
  signInFailed: 'Sign-in did not complete.',
  signOutFailed: 'Sign-out did not complete.',

  signIn: 'Sign in',
  signOut: 'Sign out',
  signedIn: 'Signed in',
  savedToAccount: 'Saved to your account. Sign in on another device and your draft follows.',

  poolHint:
    "The heroes you actually play. When the lane you're on has a list here, the answer only suggests from it.",
  poolWins: 'The % is how often each hero won this week at your rank. Green means winning more than losing.',
  clearLane: 'Clear',
  myRank: 'My rank',
  allRanks: 'All ranks',
  gloryUp: 'Mythical Glory and up',
  done: 'Done',
};

export type Strings = typeof en;

const ms: Strings = {
  language: 'Bahasa',
  whatsNew: 'Apa yang baharu',
  changelogNote: 'Senarai perubahan ini dalam bahasa Inggeris.',
  youreOn: (version) => `Anda menggunakan v${version}.`,
  playing: 'Saya bermain',
  asksToday: (used, limit) => `${used} / ${limit} soalan hari ini`,
  myHeroes: 'Hero saya',
  newDraft: 'Draf baharu',

  picks: 'Pilihan',
  myBuild: 'Binaan saya',
  teamPicks: 'Pilihan pasukan saya',
  enemyPicks: 'Pilihan musuh',
  heroIPicked: 'Hero pilihan saya',
  typeHero: 'Taip nama hero…',
  suggestHeroes: 'Cadangkan hero',
  suggestBuild: 'Cadangkan binaan',

  purpose: 'DraftSensei membantu anda semasa draf MLBB: hero mana untuk disekat, hero mana untuk dipilih bagi lorong anda, dan cara membinanya.',
  howTo: [
    'Pilih lorong dan pangkat anda di bawah. Ia akan diingati.',
    'Taip setiap hero sebaik sahaja ia dipilih dalam permainan. Cadangan dikemas kini serta-merta.',
    'Ketik hero yang dicadangkan untuk memilihnya. Binaannya terus dipaparkan, sedia untuk disesuaikan ikut musuh.',
  ],
  howToTip: 'Paling sesuai di skrin kedua: komputer riba, tablet atau telefon lain di sebelah anda semasa bermain.',

  bans: 'Sekatan',
  optional: 'tidak wajib',
  banHero: 'Sekat hero…',
  strongest: 'Terkuat minggu ini, ketik untuk menyekat',
  banReason: (win, ban) => `${win}% menang, ${ban}% disekat`,
  banShort: (win) => `${win}% menang`,
  ban: (hero) => `Sekat ${hero}`,
  unban: (hero) => `Batal sekatan ${hero}`,

  bestForLane: 'Terbaik untuk lorong anda sekarang, ketik untuk memilih',
  askAiPick: 'Minta AI pilih',
  aiChose: 'Dipilih oleh AI untuk komposisi pasukan ini, ketik untuk memilih. Hero bertanda ialah pilihan baharu.',
  newPick: 'Pilihan baharu daripada AI',
  topBuild: (win) => `Binaan terbaik dalam perlawanan ranked, ${win}% menang.`,
  adjustBuild: 'Sesuaikan ikut musuh',
  pickHeroFirst: 'Pilih hero anda dahulu: taip di atas, atau ketik hero yang dicadangkan di bahagian Pilihan.',
  adjusted: 'Disesuaikan untuk pasukan musuh ini daripada binaan ranked terbaik. Item bertanda ialah perubahannya.',
  changedItem: 'Ditukar untuk pasukan musuh ini',
  buildItems: 'Item ikut urutan beli',
  pickHero: (hero) => `Pilih ${hero}`,
  reasonWords: { win: 'menang', with: 'bersama' },

  you: 'anda',
  noPicks: 'Belum ada pilihan.',
  clash: (lanes) => `Dua hero di ${lanes.join(' dan ')}. Betulkan lorong.`,
  remove: (hero) => `Buang ${hero}`,
  laneMenu: (lane) => `Lorong: ${lane}. Tukar lorong`,

  asking: 'Sedang bertanya…',
  askAgain: 'Tanya semula',
  showPrompt: 'Tunjuk prompt',
  hidePrompt: 'Sembunyi prompt',
  showAnswer: 'Tunjuk jawapan',
  minimize: 'Kecilkan',
  copyPrompt: 'Salin prompt',
  copied: 'Disalin',
  searched: 'carian Google',
  stale: 'Pilihan berubah, tanya semula',

  serverError: (status) => `Ralat pelayan (${status}). Cuba lagi.`,
  noAnswer: 'Gemini tidak menjawab.',
  tooSlow: 'Gemini mengambil masa terlalu lama untuk menjawab. Cuba lagi.',
  noConnection: 'Tiada sambungan. Guna Tunjuk prompt dan tampal ke dalam Gemini.',
  readFailed: (why) => `Tidak dapat membaca data tersimpan anda: ${why}`,
  saveFailed: (why) => `Tidak dapat menyimpan: ${why}`,
  signInFailed: 'Log masuk tidak selesai.',
  signOutFailed: 'Log keluar tidak selesai.',

  signIn: 'Log masuk',
  signOut: 'Log keluar',
  signedIn: 'Telah log masuk',
  savedToAccount: 'Disimpan ke akaun anda. Log masuk pada peranti lain dan draf anda akan ikut.',

  poolHint:
    'Hero yang anda benar-benar main. Jika lorong anda mempunyai senarai di sini, cadangan hanya diambil daripadanya.',
  poolWins: 'Peratus ialah kadar kemenangan setiap hero minggu ini pada pangkat anda. Hijau bermaksud lebih banyak menang daripada kalah.',
  clearLane: 'Kosongkan',
  myRank: 'Pangkat saya',
  allRanks: 'Semua pangkat',
  gloryUp: 'Mythical Glory ke atas',
  done: 'Selesai',
};

export const STRINGS: Record<Lang, Strings> = { en, ms };

export const isLang = (v: unknown): v is Lang => v === 'en' || v === 'ms';

// A first visit from a phone set to Malay starts in Malay.
export const langFor = (browser: string | undefined): Lang =>
  browser?.toLowerCase().startsWith('ms') ? 'ms' : 'en';
