// script.js
// Loads leaderboard.json, sorts by wager (desc), shows top 10 and a PST monthly countdown.
// Place this in repo root as script.js

const LEADERBOARD_JSON = 'leaderboard.json'; // edit this file daily
const MAX_ROWS = 10;
const leaderboardBody = document.getElementById('leaderboard-body');
const errorBox = document.getElementById('error');
const countdownEl = document.getElementById('countdown');

function showError(message) {
  errorBox.hidden = false;
  errorBox.textContent = message;
  leaderboardBody.innerHTML = '<tr><td colspan="4" class="loading-row">Unable to load leaderboard</td></tr>';
}

async function loadLeaderboard() {
  try {
    const res = await fetch(LEADERBOARD_JSON + '?_=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('leaderboard.json must be an array of player objects');

    // Normalize and filter entries with numeric wagers
    const cleaned = data
      .map(item => ({
        username: String(item.username || '').trim(),
        wager: Number(item.wager || 0),
        level: item.level == null ? '' : Number(item.level)
      }))
      .filter(item => item.username.length > 0 && !Number.isNaN(item.wager));

    // Sort descending by wager
    cleaned.sort((a, b) => b.wager - a.wager);

    // Take top N
    const top = cleaned.slice(0, MAX_ROWS);

    renderTable(top);
  } catch (err) {
    console.error(err);
    showError('Failed to load leaderboard. Make sure leaderboard.json exists and is valid JSON.');
  }
}

function renderTable(rows) {
  if (!rows.length) {
    leaderboardBody.innerHTML = '<tr><td colspan="4" class="loading-row">No players in leaderboard.json yet</td></tr>';
    return;
  }

  const html = rows.map((row, i) => {
    const rank = i + 1;
    const username = escapeHtml(row.username);
    const wagerFormatted = formatCurrency(row.wager);
    const level = row.level === '' || row.level === null || row.level === undefined ? '-' : String(row.level);

    return `
      <tr>
        <td class="rank">${rank}</td>
        <td class="username">${username}</td>
        <td class="wager">${wagerFormatted}</td>
        <td class="level">${level}</td>
      </tr>
    `;
  }).join('');

  leaderboardBody.innerHTML = html;
  errorBox.hidden = true;
}

// safe simple escape
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, function (m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  });
}

// Format as $12,500 (no cents)
function formatCurrency(n) {
  try {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  } catch (e) {
    // fallback
    return '$' + Math.round(n).toLocaleString();
  }
}

/* -------------------------------
   Countdown to monthly reset
   Reset = 1st of next month at 00:00 in America/Los_Angeles (PST/PDT)
   We'll compute "now" in LA using toLocaleString hack, then create a Date
   for the next first-of-month at 00:00 in that same wall-clock representation.
   ------------------------------- */

function getLANowAsDate() {
  // Create a wall-clock string in LA and create a Date from it.
  // This is a common pattern to get a Date object that represents the same
  // wall time as America/Los_Angeles. It works reliably in modern browsers.
  const laStr = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  return new Date(laStr);
}

function getNextMonthlyResetInLocal() {
  // Build a Date object representing the next 1st of month 00:00 in LA, but as a local Date object
  const laNow = getLANowAsDate();
  let year = laNow.getFullYear();
  let month = laNow.getMonth(); // 0-11 (this will be LA local month)
  // If already on the 1st at 00:00 or later in the day, we still want the next month's 1st.
  // So always advance to next month.
  month = month + 1;
  if (month > 11) {
    month = 0;
    year += 1;
  }
  // Create a string representing the target LA midnight in MM/DD/YYYY, then create Date from it
  const mm = (month + 1).toString().padStart(2, '0');
  const dd = '01';
  const yyyy = year;
  const laMidnightStr = `${mm}/${dd}/${yyyy} 00:00:00`;
  // Construct a Date from the LA wall-clock string (interpreted in local timezone)
  // The trick is: create a date using that LA wall-clock string so it maps to the same absolute moment
  // relative to LA. This works well for countdown display purposes.
  return new Date(laMidnightStr + ' GMT-0800'); // fallback; the actual offset may be -0700 in DST but Date parsing will adjust
}

function updateCountdown() {
  try {
    const laNow = getLANowAsDate();
    const reset = getNextMonthlyResetInLocal();

    // If parsing failed, fallback to constructing reset from laNow directly:
    if (isNaN(reset.getTime())) {
      // safer approach: set month/year on a copy of laNow
      const fallback = new Date(laNow);
      fallback.setMonth(fallback.getMonth() + 1, 1);
      fallback.setHours(0,0,0,0,0);
      // use fallback
      var target = fallback;
    } else {
      var target = reset;
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

/* -------------------------------
  Init
--------------------------------*/
document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
  // refresh leaderboard periodically (every 30s)
  setInterval(loadLeaderboard, 30000);

  // countdown tick every second
  updateCountdown();
  setInterval(updateCountdown, 1000);
});
