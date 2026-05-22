/*
  X/Twitter Continuous Mass Unfollow Script with Floating UI Panel (Dec 2025)
  Original Author: Shayan Taherkhani — https://shayantaherkhani.ir
  Modified: isPrivate() skip, mutual-skip fixes, virtualized-list handling,
            and CONTINUOUS mode — runs in batches of MAX_UNFOLLOWS with a
            15–20 minute cooldown between batches instead of stopping at 190.
*/

// Entire script is wrapped in an IIFE so that nothing (MAX_UNFOLLOWS, etc.)
// is declared at the console's top-level lexical scope. Without this, pasting
// the script a second time throws "redeclaration of let MAX_UNFOLLOWS" at
// PARSE time — before the runtime guard below can ever run. Wrapped this way,
// re-running just creates a fresh scope and the guard handles double-runs.
(function () {

if (window.unfollowScriptRunning) {
  console.warn("⚠️ Script already running!");
  return;
}
window.unfollowScriptRunning = true;

// === SETTINGS ===
let MAX_UNFOLLOWS = 190;          // unfollows per batch before the long cooldown
let MIN_DELAY = 3000;             // min gap between individual unfollows (ms)
let MAX_DELAY = 35000;            // max gap between individual unfollows (ms)
let BATCH_PAUSE_MIN = 15 * 60 * 1000;  // min cooldown between batches (15 min)
let BATCH_PAUSE_MAX = 20 * 60 * 1000;  // max cooldown between batches (20 min)
let isPaused = false;
let shouldStop = false;

// === UI PANEL ===
function createUI() {
  const panel = document.createElement('div');
  panel.id = 'unfollow-panel';
  panel.innerHTML = `
    <style>
      #unfollow-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 320px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px;
        padding: 20px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
        color: #fff;
      }
      #unfollow-panel * { box-sizing: border-box; }
      #unfollow-panel .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      #unfollow-panel .title {
        font-size: 16px;
        font-weight: 700;
        color: #1DA1F2;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #unfollow-panel .close-btn {
        background: rgba(255,255,255,0.1);
        border: none;
        color: #fff;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s;
      }
      #unfollow-panel .close-btn:hover { background: #e0245e; }
      #unfollow-panel .stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }
      #unfollow-panel .stat-box {
        background: rgba(255,255,255,0.05);
        border-radius: 10px;
        padding: 12px 8px;
        text-align: center;
      }
      #unfollow-panel .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #1DA1F2;
      }
      #unfollow-panel .stat-label {
        font-size: 11px;
        color: rgba(255,255,255,0.6);
        margin-top: 4px;
      }
      #unfollow-panel .progress-container {
        background: rgba(255,255,255,0.1);
        border-radius: 10px;
        height: 8px;
        overflow: hidden;
        margin-bottom: 16px;
      }
      #unfollow-panel .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #1DA1F2, #17bf63);
        width: 0%;
        transition: width 0.3s ease;
        border-radius: 10px;
      }
      #unfollow-panel .progress-text {
        text-align: center;
        font-size: 12px;
        color: rgba(255,255,255,0.7);
        margin-bottom: 16px;
      }
      #unfollow-panel .current-user {
        background: rgba(29,161,242,0.1);
        border: 1px solid rgba(29,161,242,0.3);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 16px;
        font-size: 13px;
        text-align: center;
      }
      #unfollow-panel .settings-section {
        margin-bottom: 16px;
      }
      #unfollow-panel .setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      #unfollow-panel .setting-label {
        font-size: 12px;
        color: rgba(255,255,255,0.8);
      }
      #unfollow-panel .setting-input {
        width: 80px;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.1);
        color: #fff;
        font-size: 13px;
        text-align: center;
      }
      #unfollow-panel .setting-input:focus {
        outline: none;
        border-color: #1DA1F2;
      }
      #unfollow-panel .toggle-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      #unfollow-panel .toggle-label {
        font-size: 12px;
        color: rgba(255,255,255,0.8);
      }
      #unfollow-panel .toggle-switch {
        position: relative;
        width: 40px;
        height: 22px;
      }
      #unfollow-panel .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      #unfollow-panel .toggle-slider {
        position: absolute;
        inset: 0;
        background: rgba(255,255,255,0.2);
        border-radius: 22px;
        cursor: pointer;
        transition: background 0.2s;
      }
      #unfollow-panel .toggle-slider:before {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        left: 3px;
        top: 3px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.2s;
      }
      #unfollow-panel .toggle-switch input:checked + .toggle-slider {
        background: #17bf63;
      }
      #unfollow-panel .toggle-switch input:checked + .toggle-slider:before {
        transform: translateX(18px);
      }
      #unfollow-panel .buttons {
        display: flex;
        gap: 10px;
      }
      #unfollow-panel .btn {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      #unfollow-panel .btn-pause {
        background: #f7931a;
        color: #fff;
      }
      #unfollow-panel .btn-pause:hover { background: #e8820a; }
      #unfollow-panel .btn-pause.paused {
        background: #17bf63;
      }
      #unfollow-panel .btn-stop {
        background: #e0245e;
        color: #fff;
      }
      #unfollow-panel .btn-stop:hover { background: #c91c52; }
      #unfollow-panel .status {
        text-align: center;
        padding: 8px;
        border-radius: 6px;
        font-size: 12px;
        margin-top: 12px;
      }
      #unfollow-panel .status.running {
        background: rgba(23,191,99,0.2);
        color: #17bf63;
      }
      #unfollow-panel .status.paused {
        background: rgba(247,147,26,0.2);
        color: #f7931a;
      }
      #unfollow-panel .status.stopped {
        background: rgba(224,36,94,0.2);
        color: #e0245e;
      }
    </style>
    <div class="header">
      <div class="title">🚀 Continuous Unfollow</div>
      <button class="close-btn" id="close-panel">×</button>
    </div>
    <div class="stats">
      <div class="stat-box">
        <div class="stat-value" id="stat-unfollowed">0</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat-box">
        <div class="stat-value" id="stat-skipped">0</div>
        <div class="stat-label">Skipped</div>
      </div>
      <div class="stat-box">
        <div class="stat-value" id="stat-remaining">0</div>
        <div class="stat-label">Batch left</div>
      </div>
    </div>
    <div class="progress-container">
      <div class="progress-bar" id="progress-bar"></div>
    </div>
    <div class="progress-text" id="progress-text">0% of batch</div>
    <div class="current-user" id="current-user">⏳ Starting...</div>
    <div class="settings-section">
      <div class="setting-row">
        <span class="setting-label">Batch size:</span>
        <input type="number" class="setting-input" id="setting-max" value="${MAX_UNFOLLOWS}" min="1" max="500">
      </div>
      <div class="setting-row">
        <span class="setting-label">Min Delay (sec):</span>
        <input type="number" class="setting-input" id="setting-min-delay" value="${MIN_DELAY/1000}" min="0" max="120">
      </div>
      <div class="setting-row">
        <span class="setting-label">Max Delay (sec):</span>
        <input type="number" class="setting-input" id="setting-max-delay" value="${MAX_DELAY/1000}" min="10" max="180">
      </div>
      <div class="setting-row">
        <span class="setting-label">Pause min (min):</span>
        <input type="number" class="setting-input" id="setting-pause-min" value="${BATCH_PAUSE_MIN/60000}" min="1" max="120">
      </div>
      <div class="setting-row">
        <span class="setting-label">Pause max (min):</span>
        <input type="number" class="setting-input" id="setting-pause-max" value="${BATCH_PAUSE_MAX/60000}" min="1" max="180">
      </div>
      <div class="toggle-row">
        <span class="toggle-label">Skip private accounts:</span>
        <label class="toggle-switch">
          <input type="checkbox" id="setting-skip-private" checked>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
    <div class="buttons">
      <button class="btn btn-pause" id="btn-pause">⏸️ Pause</button>
      <button class="btn btn-stop" id="btn-stop">⏹️ Stop</button>
    </div>
    <div class="status running" id="status-text">🟢 Running...</div>
  `;
  document.body.appendChild(panel);

  // Event listeners
  document.getElementById('close-panel').onclick = () => {
    shouldStop = true;
    panel.remove();
  };

  document.getElementById('btn-pause').onclick = () => {
    isPaused = !isPaused;
    const btn = document.getElementById('btn-pause');
    const status = document.getElementById('status-text');
    if (isPaused) {
      btn.innerHTML = '▶️ Resume';
      btn.classList.add('paused');
      status.className = 'status paused';
      status.innerHTML = '🟡 Paused';
    } else {
      btn.innerHTML = '⏸️ Pause';
      btn.classList.remove('paused');
      status.className = 'status running';
      status.innerHTML = '🟢 Running...';
    }
  };

  document.getElementById('btn-stop').onclick = () => {
    shouldStop = true;
    document.getElementById('status-text').className = 'status stopped';
    document.getElementById('status-text').innerHTML = '🔴 Stopped';
  };

  // Settings listeners
  document.getElementById('setting-max').onchange = (e) => {
    MAX_UNFOLLOWS = parseInt(e.target.value) || 190;
    updateUI();
  };
  document.getElementById('setting-min-delay').onchange = (e) => {
    MIN_DELAY = (parseInt(e.target.value) || 3) * 1000;
  };
  document.getElementById('setting-max-delay').onchange = (e) => {
    MAX_DELAY = (parseInt(e.target.value) || 35) * 1000;
  };
  document.getElementById('setting-pause-min').onchange = (e) => {
    BATCH_PAUSE_MIN = (parseInt(e.target.value) || 15) * 60 * 1000;
  };
  document.getElementById('setting-pause-max').onchange = (e) => {
    BATCH_PAUSE_MAX = (parseInt(e.target.value) || 20) * 60 * 1000;
  };

  return panel;
}

function updateUI(unfollowed = 0, skipped = 0, currentUser = '', total = 0) {
  // In continuous mode "unfollowed" is the running total across all batches.
  // Progress and "remaining" are shown relative to the CURRENT batch, so they
  // reset visually each cooldown rather than overflowing past 100%.
  const inBatch = MAX_UNFOLLOWS > 0 ? (unfollowed % MAX_UNFOLLOWS) : unfollowed;
  // When a batch lands exactly on the cap, show it as a full batch, not 0.
  const batchDone = (unfollowed > 0 && inBatch === 0) ? MAX_UNFOLLOWS : inBatch;
  const remaining = Math.max(0, MAX_UNFOLLOWS - batchDone);
  const progress = MAX_UNFOLLOWS > 0 ? Math.round((batchDone / MAX_UNFOLLOWS) * 100) : 0;

  const statUnfollowed = document.getElementById('stat-unfollowed');
  const statSkipped = document.getElementById('stat-skipped');
  const statRemaining = document.getElementById('stat-remaining');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const currentUserEl = document.getElementById('current-user');

  if (statUnfollowed) statUnfollowed.textContent = unfollowed;   // running total
  if (statSkipped) statSkipped.textContent = skipped;
  if (statRemaining) statRemaining.textContent = remaining;       // left in batch
  if (progressBar) progressBar.style.width = `${Math.min(progress, 100)}%`;
  if (progressText) progressText.textContent = `${Math.min(progress, 100)}% of batch`;
  if (currentUserEl && currentUser) currentUserEl.innerHTML = `Processing: <strong>@${currentUser}</strong>`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay() {
  return MIN_DELAY + Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY));
}

function randomBatchPause() {
  return BATCH_PAUSE_MIN + Math.floor(Math.random() * (BATCH_PAUSE_MAX - BATCH_PAUSE_MIN));
}

// Long cooldown between batches. Counts down second-by-second in the panel and
// console, and remains responsive to Pause and Stop the whole time.
async function batchCooldown(totalSoFar) {
  const ms = randomBatchPause();
  const endAt = Date.now() + ms;
  const statusText = document.getElementById('status-text');
  const currentUserEl = document.getElementById('current-user');

  if (statusText) {
    statusText.className = 'status paused';
    statusText.innerHTML = '😴 Cooling down...';
  }

  console.log(`%c😴 Batch of ${MAX_UNFOLLOWS} done (total ${totalSoFar}). Cooling down ${Math.round(ms / 60000)} min...`,
    "color:#f7931a;font-weight:bold;");

  while (Date.now() < endAt && !shouldStop) {
    // While the user manually pauses, freeze the countdown by pushing endAt out.
    if (isPaused) { await sleep(500); continue; }

    const remaining = endAt - Date.now();
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    if (currentUserEl) {
      currentUserEl.innerHTML = `😴 Next batch in <strong>${mins}:${String(secs).padStart(2, '0')}</strong>`;
    }
    await sleep(1000);
  }

  if (!shouldStop && statusText) {
    statusText.className = 'status running';
    statusText.innerHTML = '🟢 Running...';
  }
}

function txt(el) {
  return (el?.innerText || el?.textContent || "").trim().toLowerCase();
}

function isMutual(cell) {
  const NEEDLES = ["follows you", "شما را دنبال می‌کند"];

  // 1. Twitter's dedicated badge testid (most reliable when present).
  if (cell.querySelector('[data-testid="userFollowIndicator"]')) return true;

  // 2. The badge may be an aria-label with NO text node, so neither innerText
  //    nor textContent would see it. Scan every aria-label in the cell.
  for (const el of cell.querySelectorAll('[aria-label]')) {
    const label = (el.getAttribute('aria-label') || "").toLowerCase();
    if (NEEDLES.some(n => label.includes(n))) return true;
  }

  // 3. Visible + hidden text. innerText skips visually-hidden a11y spans, so we
  //    also read textContent and combine both sources.
  const inner   = (cell?.innerText   || "").toLowerCase();
  const content = (cell?.textContent || "").toLowerCase();
  const combined = inner + " " + content;
  return NEEDLES.some(n => combined.includes(n));
}

// === NEW: Private/locked account detection ===
function isPrivate(cell) {
  // 1. Check SVG aria-labels for "protected" (Twitter's own accessibility label for locked accounts)
  const svgs = cell.querySelectorAll('svg');
  for (const svg of svgs) {
    const label = (svg.getAttribute('aria-label') || '').toLowerCase();
    if (label.includes('protected') || label.includes('private') || label.includes('locked')) {
      return true;
    }
  }

  // 2. Check any element with an aria-label indicating a protected account
  const labeled = cell.querySelectorAll('[aria-label]');
  for (const el of labeled) {
    const label = (el.getAttribute('aria-label') || '').toLowerCase();
    if (label.includes('protected') || label.includes('private') || label.includes('locked')) {
      return true;
    }
  }

  // 3. Check for visually-hidden screen-reader text (Twitter uses <span> inside SVG titles)
  const svgTitles = cell.querySelectorAll('svg title');
  for (const title of svgTitles) {
    const t = txt(title);
    if (t.includes('protected') || t.includes('private') || t.includes('locked')) {
      return true;
    }
  }

  // 4. Fallback: look for the lock SVG path signature Twitter uses.
  // The lock icon path typically contains a rounded-top rectangle (body) + arc (shackle).
  // We match by checking for a path with a "d" attribute containing the typical lock curve.
  const paths = cell.querySelectorAll('svg path[d]');
  for (const path of paths) {
    const d = path.getAttribute('d') || '';
    // Twitter's lock SVG path contains a characteristic arc segment for the shackle
    if (d.includes('M12 4a3 3 0 0 0-3 3v2h6V7a3 3 0 0 0-3-3') ||
        d.includes('M16.5 10H15V7a3 3') ||
        (d.includes('M') && d.includes('a') && d.includes('H') && d.length > 30 && d.length < 120 &&
         path.closest('svg')?.getAttribute('viewBox') === '0 0 24 24')) {
      // Additional heuristic: lock icons are small (near username area) — only flag if
      // the SVG is inside a heading or name element, not a button
      const parentBtn = path.closest('[role="button"], button');
      if (!parentBtn) return true;
    }
  }

  return false;
}
// ============================================

function getUsername(cell) {
  const link = cell.querySelector('a[href^="/"][role="link"], a[href^="/"]:not([href*="status"]):not([href*="intent"])');
  if (link) {
    return link.getAttribute("href").split("/")[1] || "unknown";
  }
  return "unknown";
}

function findUnfollowButton(cell) {
  // Most reliable: Twitter gives the unfollow button a data-testid ending in
  // "-unfollow" (e.g. "1234567890-unfollow"). Target it directly.
  const byTestId = cell.querySelector('[data-testid$="-unfollow"]');
  if (byTestId) return byTestId;

  // Fallback by text — but ONLY on elements whose own label is short.
  // The entire UserCell is itself a div[role="button"] that navigates to the
  // profile, and its text contains "Following" because the real button is
  // nested inside it. Matching that outer div opens the profile and breaks
  // the script. The length bound ensures we match the actual button (label
  // is just "Following"/"Unfollow"), never the whole cell container.
  const btns = cell.querySelectorAll('div[role="button"], button');
  return Array.from(btns).find(b => {
    const t = (b.innerText || b.textContent || "").trim().toLowerCase();
    if (t.length > 25) return false;
    return t.includes("following") || t.includes("unfollow") || t.includes("دنبال می‌کنید");
  });
}

async function waitConfirm(timeout = 7000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const btn =
      document.querySelector('[data-testid="confirmationSheetConfirm"]') ||
      document.querySelector('div[role="button"][data-testid*="unfollow"]') ||
      document.querySelector('button[data-testid*="unfollow"]') ||
      Array.from(document.querySelectorAll("button")).find(b => txt(b).includes("unfollow"));

    if (btn) return btn;
    await sleep(300);
  }
  return null;
}

async function waitWhilePaused() {
  while (isPaused && !shouldStop) {
    await sleep(500);
  }
}

const logEntries = [];

function logAction(username, action, reason = "") {
  const time = new Date().toLocaleTimeString();
  logEntries.push({ time, username, action, reason });
  const colors = {
    unfollowed: "color: green; font-weight: bold;",
    skipped: "color: orange;",
    error: "color: red; font-weight: bold;",
  };
  console.log(`%c[${time}] ${action.toUpperCase()} - @${username} ${reason}`, colors[action] || "");
}

(async function main() {
  createUI();
  console.log("%c🚀 Started CONTINUOUS Unfollow — runs in batches with cooldowns (Dec 2025)", "color:#1DA1F2;font-weight:bold;");

  let total = 0, batchCount = 0, skipped = 0, batchNum = 1;

  // Twitter's following list is VIRTUALIZED: only ~20-40 cells exist in the
  // DOM at any moment, and off-screen cells are removed/recycled as you
  // scroll. So we cannot capture the cell list once — it goes stale and we'd
  // only ever see the first screenful. Instead we re-query the DOM every
  // iteration, track which accounts we've already handled by username, and
  // scroll to load more when the visible batch is exhausted.
  const processed = new Set();        // usernames already acted on
  let emptyScrolls = 0;               // consecutive scrolls revealing nothing new
  const MAX_EMPTY_SCROLLS = 8;        // give up after this many (end of list)

  updateUI(total, skipped, '', MAX_UNFOLLOWS);

  // CONTINUOUS mode: instead of stopping at MAX_UNFOLLOWS, we treat it as a
  // batch size. After each batch we take a 15–20 min cooldown, then resume.
  // The loop only ends when the user stops it or the list runs out.
  while (!shouldStop) {
    await waitWhilePaused();
    if (shouldStop) break;

    // Reached the per-batch cap → long cooldown, then start a fresh batch.
    if (batchCount >= MAX_UNFOLLOWS) {
      await batchCooldown(total);
      if (shouldStop) break;
      batchCount = 0;
      batchNum++;
      console.log(`%c🔄 Starting batch #${batchNum}...`, "color:#1DA1F2;font-weight:bold;");
      continue;
    }

    // Re-query fresh each pass so we always work with live, attached nodes.
    const cells = Array.from(document.querySelectorAll('[data-testid="UserCell"], [data-testid="cellInnerDiv"]'));

    // Pick the first un-processed cell that represents a real account.
    let target = null, username = null;
    for (const cell of cells) {
      if (!cell.querySelector('a[href^="/"]')) continue;   // ad / non-user row
      const u = getUsername(cell);
      if (u === "unknown" || processed.has(u)) continue;
      target = cell; username = u; break;
    }

    // Nothing new in the current viewport → scroll down to load more.
    if (!target) {
      const last = cells[cells.length - 1];
      if (last) last.scrollIntoView({ block: "end", behavior: "instant" });
      window.scrollBy(0, 800);
      await sleep(1200);   // let Twitter render the next batch

      emptyScrolls++;
      if (emptyScrolls >= MAX_EMPTY_SCROLLS) {
        console.log("%c🏁 No more accounts to load — reached end of list.", "color:#f7931a;font-weight:bold;");
        break;
      }
      continue;
    }
    emptyScrolls = 0;   // found a fresh cell; reset the end-of-list counter

    // Mark up front so we never revisit this account, regardless of outcome.
    processed.add(username);

    if (isMutual(target)) {
      logAction(username, "skipped", "Mutual follow");
      skipped++;
      updateUI(total, skipped, username, MAX_UNFOLLOWS);
      continue;
    }

    const skipPrivate = document.getElementById('setting-skip-private')?.checked ?? true;
    if (skipPrivate && isPrivate(target)) {
      logAction(username, "skipped", "Private/locked account");
      skipped++;
      updateUI(total, skipped, username, MAX_UNFOLLOWS);
      continue;
    }

    // Bring the cell into view BEFORE locating the button, then find the
    // button on the live element — scrolling can recycle/re-render nodes,
    // so the button must be looked up on the current, on-screen cell.
    target.scrollIntoView({ block: "center", behavior: "instant" });
    await sleep(400);

    const btn = findUnfollowButton(target);
    if (!btn) {
      logAction(username, "skipped", "No unfollow/following button");
      skipped++;
      updateUI(total, skipped, username, MAX_UNFOLLOWS);
      continue;
    }

    updateUI(total, skipped, username, MAX_UNFOLLOWS);

    try {
      // Block any <a> tags in the cell from navigating during the click, in
      // case the click bubbles to an ancestor profile link.
      const anchors = Array.from(target.querySelectorAll('a'));
      const blockNav = (e) => e.preventDefault();
      anchors.forEach(a => a.addEventListener('click', blockNav, true));

      btn.click();

      await sleep(100);
      anchors.forEach(a => a.removeEventListener('click', blockNav, true));

      const confirmBtn = await waitConfirm();
      if (confirmBtn) {
        confirmBtn.click();
        total++; batchCount++;
        logAction(username, "unfollowed");
      } else {
        logAction(username, "skipped", "No confirmation dialog - assuming unfollowed");
        total++; batchCount++;
      }
      updateUI(total, skipped, username, MAX_UNFOLLOWS);
    } catch (err) {
      logAction(username, "error", `Exception: ${err.message}`);
      skipped++;
      updateUI(total, skipped, username, MAX_UNFOLLOWS);
    }

    if (shouldStop) break;
    await waitWhilePaused();

    const d = randomDelay();
    const currentUserEl = document.getElementById('current-user');
    if (currentUserEl) currentUserEl.innerHTML = `⏳ Waiting ${Math.round(d / 1000)}s...`;
    console.log(`⏳ Waiting ${Math.round(d / 1000)} seconds before next unfollow...`);
    await sleep(d);
  }

  const statusText = document.getElementById('status-text');
  const currentUserEl = document.getElementById('current-user');
  if (statusText) {
    statusText.className = 'status stopped';
    statusText.innerHTML = '✅ Complete!';
  }
  if (currentUserEl) currentUserEl.innerHTML = `🎉 Done! Unfollowed ${total} users`;

  console.log(`%c=== SESSION COMPLETE ===`, "color:#1DA1F2; font-weight:bold;");
  console.log(`Total unfollowed: ${total}, Skipped: ${skipped}, Batches: ${batchNum}`);
  console.table(logEntries);

  window.unfollowScriptRunning = false;
})();

})();
