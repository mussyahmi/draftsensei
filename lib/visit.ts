// Only the live site counts: dev and phone testing on the local network
// write to the same database and would swell the numbers.
const LIVE = /(^|\.)(web\.app|firebaseapp\.com|hosted\.app)$/;

// One count per page open, for the owner's stats. Fire and forget.
export const countVisit = (page: 'draft' | 'heroes') => {
  if (!LIVE.test(location.hostname)) return;
  fetch('/api/visit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ page }),
    keepalive: true,
  }).catch(() => {});
};
