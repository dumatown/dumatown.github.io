// script.js - loads leaderboard.json, sorts by wager (desc), shows top 10 and PST monthly countdown

const LEADERBOARD_JSON = 'leaderboard.json';
const MAX_ROWS = 10;
const leaderboardBody = document.getElementById('leaderboard-body');
const errorBox = document.getElementById('error');
const countdownEl = document.getElementById('countdown');

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
        wager: Number(item.wager || 0),
        level: item.level == null ? '' : Number(item.level)
      }))
      .filter(item => item.username.length > 0 && !Number.isNaN(item.wager));

    cleaned.sort((a,b) => b.wager - a.wager);
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
    const wager = formatCurrency(r.wager);
    const level = (r.level === '' || r.level === null || r.level === undefined) ? '-' : String(r.level);
    return `
      <tr>
        <td class="rank">${rank}</td>
        <td class="username">${username}</td>
        <td class="wager">${wager}</td>
        <td class="level">${level}</td>
      </tr>
    `;
  }).join('');
  leaderboardBody.innerHTML = html;
  if (errorBox) errorBox.hidden = true;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function formatCurrency(n) {
  try {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  } catch (e) {
    return '$' + Math.round(n).toLocaleString();
  }
}

/* Countdown to monthly reset (1st of next month at 00:00 America/Los_Angeles) */
function getLANowAsDate() {
  const laStr = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  return new Date(laStr);
}

function getNextMonthlyResetInLA() {
  const laNow = getLANowAsDate();
  let year = laNow.getFullYear();
  let month = laNow.getMonth() + 1; // next month
  if (month > 11) { month = 0; year += 1; }
  const reset = new Date(laNow);
  reset.setFullYear(year);
  reset.setMonth(month, 1);
  reset.setHours(0,0,0,0);
  return reset;
}

function updateCountdown() {
  try {
    const laNow = getLANowAsDate();
    const target = getNextMonthlyResetInLA();
    let diff = target.getTime() - laNow.getTime();
    if (diff <= 0) { countdownEl.textContent = 'Resetting...'; return; }
    const days = Math.floor(diff / 86400000);
    diff -= days * 86400000;
    const hours = Math.floor(diff / 3600000);
    diff -= hours * 3600000;
    const mins = Math.floor(diff / 60000);
    diff -= mins * 60000;
    const secs = Math.floor(diff / 1000);
    countdownEl.textContent = `${days}d ${hours}h ${mins}m ${secs}s (PST)`;
  } catch (e) {
    console.error(e);
    countdownEl.textContent = '—';
  }
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
  setInterval(loadLeaderboard, 30000);
  updateCountdown();
  setInterval(updateCountdown, 1000);
});
