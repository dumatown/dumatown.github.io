// Wagerboard Dynamic Data Loader
// This script fetches real leaderboard data, prizes, and countdown from the API

// Access injected wagerboard data
// These are automatically provided: window.WAGERBOARD_VANITY_URL and window.WAGERBOARD_INSTANCE_ID
let instanceId = window.WAGERBOARD_INSTANCE_ID || null;
let countdownInterval = null;

// Fetch leaderboard entries
async function fetchLeaderboard() {
  if (!instanceId) return [];
  try {
    const response = await fetch(`/api/rugs-wagerboard?instanceId=${instanceId}`);
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    return await response.json();
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

// Fetch prizes
async function fetchPrizes() {
  if (!instanceId) return [];
  try {
    const response = await fetch(`/api/rugs-wagerboard/prizes?instanceId=${instanceId}`);
    if (!response.ok) throw new Error('Failed to fetch prizes');
    return await response.json();
  } catch (error) {
    console.error('Error fetching prizes:', error);
    return [];
  }
}

// Fetch settings (for countdown)
async function fetchSettings() {
  if (!instanceId) return null;
  try {
    const response = await fetch(`/api/rugs-wagerboard/settings?instanceId=${instanceId}`);
    if (!response.ok) throw new Error('Failed to fetch settings');
    return await response.json();
  } catch (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
}

// Get prize for a specific position
function getPrizeForPosition(prizes, position) {
  const prize = prizes.find(p => p.position === position);
  return prize ? prize.prize : null;
}

// Get position label (FIRST PLACE, SECOND PLACE, etc.)
function getPositionLabel(position) {
  const labels = {
    1: 'FIRST PLACE',
    2: 'SECOND PLACE',
    3: 'THIRD PLACE',
    4: 'FOURTH PLACE',
    5: 'FIFTH PLACE'
  };
  return labels[position] || '';
}

// Render leaderboard entries
function renderLeaderboard(entries, prizes) {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;

  if (entries.length === 0) {
    container.innerHTML = '<div class="loading">No entries yet</div>';
    return;
  }

  container.innerHTML = entries.map((entry, index) => {
    const position = index + 1;
    const prize = getPrizeForPosition(prizes, position);
    const isTopEntry = position <= 5;
    const positionLabel = getPositionLabel(position);

    return `
      <div class="entry ${isTopEntry ? 'top-entry' : ''}">
        <div class="position">#${position}</div>
        <div class="user-info">
          ${positionLabel ? `<div class="rank-label">${positionLabel}</div>` : ''}
          <div class="username">${entry.username}</div>
        </div>
        <div class="details">
          ${prize ? `<div class="prize">${prize}</div>` : ''}
          <div class="level">Level ${entry.level}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Calculate and update countdown timer
function updateCountdown(endDate) {
  const countdownElement = document.getElementById('countdown-time');
  if (!countdownElement || !endDate) {
    if (countdownElement) countdownElement.textContent = '';
    return;
  }

  const calculateTime = () => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) {
      countdownElement.textContent = 'ENDED';
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      countdownElement.textContent = `${days}D ${hours}H ${minutes}M`;
    } else if (hours > 0) {
      countdownElement.textContent = `${hours}H ${minutes}M ${seconds}S`;
    } else if (minutes > 0) {
      countdownElement.textContent = `${minutes}M ${seconds}S`;
    } else {
      countdownElement.textContent = `${seconds}S`;
    }
  };

  calculateTime();
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(calculateTime, 1000);
}

// Initialize and load all data
async function initializeWagerboard() {
  console.log('Initializing wagerboard with instance ID:', instanceId);

  if (!instanceId) {
    console.error('Instance ID not found');
    return;
  }

  // Step 1: Fetch all data in parallel
  const [leaderboard, prizes, settings] = await Promise.all([
    fetchLeaderboard(),
    fetchPrizes(),
    fetchSettings()
  ]);

  // Step 2: Render leaderboard
  renderLeaderboard(leaderboard, prizes);

  // Step 3: Start countdown
  if (settings?.endDate) {
    updateCountdown(settings.endDate);
  }

  // Step 4: Auto-refresh leaderboard every 30 seconds
  setInterval(async () => {
    const [newLeaderboard, newPrizes] = await Promise.all([
      fetchLeaderboard(),
      fetchPrizes()
    ]);
    renderLeaderboard(newLeaderboard, newPrizes);
  }, 30000);
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', initializeWagerboard);
