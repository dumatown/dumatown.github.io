// script.js - ranks by level (desc), auto-assigns prize for top5, and uses a 31-day PST countdown

const LEADERBOARD_JSON = 'leaderboard.json';
const MAX_ROWS = 10;
const leaderboardBody = document.getElementById('leaderboard-body');
const errorBox = document.getElementById('error');
const countdownEl = document.getElementById('countdown');

// prize map by rank (1-indexed)
const PRIZE_MAP = {
  1: '1 SOL',
  2: '0.5 SOL',
  3: '0.25 SOL',
  4: '0.1 SOL',
  5: '0.05 SOL'
};

// store target reset in localStorage so it persists across reloads
const STORAGE_KEY = 'rugsfun_next_reset_pst_31d';

function showError(message) {
  if (errorBox) {
    errorBox.hidden = false;
    errorBox.textContent = message;
  }
  if (leaderboardBody) {
    leaderboardBody.innerHTML = '<tr><td colspan="4" class="loading-row">Unable to load leaderboard</td></tr>';
  }
}

async function loadLeaderboard() {
  try {
    const res = await fetch(LEADERBOARD_JSON + '?_=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('leaderboard.json must be an array');

    const cleaned = data
      .map(item => ({
        username: String(item.username || '').trim(),
        level: Number(item.level || 0)
      }))
      .filter(item => item.username.length > 0 && !Number.isNaN(item.level));

    // Sort by level descending, tie-breaker: username ascending
    cleaned.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return a.username.localeCompare(b.username);
    });

    const top = cleaned.slice(0, MAX_ROWS);
    renderTable(top);
  } catch (err) {
    console.error(err);
    showError('Failed to load leaderboard. Make sure leaderboard.json exists and is valid JSON.');
  }
}

function renderTable(rows) {
  if (!rows || !rows.length) {
    leaderboardBody.innerHTML = '<tr><td colspan="4" class="loading-row">No players in leaderboard.json yet</td></tr>';
    return;
  }
  const html = rows.map((r, i) => {
    const rank = i + 1;
    const username = escapeHtml(r.username);
    const level = String(r.level);
    const prize = PRIZE_MAP[rank] || '-';
    return `
      <tr>
        <td class="rank">${rank}</td>
        <td class="username">${username}</td>
        <td class="level">${level}</td>
        <td class="prize">${prize}</td>
      </tr>
    `;
  }).join('');
  leaderboardBody.innerHTML = html;
  if (errorBox) errorBox.hidden = true;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* -----------------------------
   Countdown: 31 days from "now" in PST
   - Persist the chosen target in localStorage so it doesn't change each reload
   - If no stored target, set one to LA now + 31 days
   - When time expires, set new target = now + 31 days
------------------------------*/

function getLANowAsDate() {
  // returns a Date representing the current LA wall-clock time
  const laStr = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  return new Date(laStr);
}

function loadOrCreateTarget() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const t = new Date(raw);
    if (!isNaN(t.getTime())) return t;
  }
  // create new target: LA now + 31 days
  const laNow = getLANowAsDate();
  const target = new Date(laNow.getTime() + 31 * 24 * 60 * 60 * 1000);
  // store ISO string (UTC time) for persistence
  localStorage.setItem(STORAGE_KEY, target.toISOString());
  return target;
}

function resetTargetToNowPlus31d() {
  const laNow = getLANowAsDate();
  const target = new Date(laNow.getTime() + 31 * 24 * 60 * 60 * 1000);
  localStorage.setItem(STORAGE_KEY, target.toISOString());
  return target;
}

function updateCountdown() {
  try {
    const laNow = getLANowAsDate();
    let target = loadOrCreateTarget();

    // If target is in the past (maybe changed system clock), reset it
    if (target.getTime() - laNow.getTime() <= 0) {
      target = resetTargetToNowPlus31d();
    }

    const diffMs = target.getTime() - laNow.getTime();
    if (diffMs <= 0) {
      countdownEl.textContent = 'Resetting...';
      return;
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    countdownEl.textContent = `${days}d ${hours}h ${mins}m ${secs}s (PST)`;
  } catch (e) {
    console.error('Countdown error', e);
    countdownEl.textContent = '—';
  }
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
  setInterval(loadLeaderboard, 30000); // reload JSON every 30s
  updateCountdown();
  setInterval(updateCountdown, 1000);
});
