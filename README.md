# X/Twitter Mass Unfollow Non-Followers 2025 – Ultra Safe Script

**The most accurate & safest console script to mass unfollow non-followers on X.com (Twitter)**
No extension · No API · Zero bans · Actively maintained

> This is an enhanced version of the original script created by **Shayan Taherkhani**. The core script, design, and approach are his work — see [Credits](#credits). This release adds private-account skipping, more reliable mutual detection, virtualized-list handling, and several bug fixes (see [What's New](#whats-new)).

## Why this script is the best

- 100% accurate detection of the "Following" button (works even after UI updates)
- Reliably skips people who follow you back — mutuals are never unfollowed
- Optionally skips private/locked accounts (toggle in the panel)
- Real username logging (@username)
- Human-like random delays (configurable; defaults to 3–35 seconds)
- Strict limit: max 190 unfollows per run (fully under X rate limits)
- Automatically scrolls to load more accounts as it works
- No confirmation dialog? Script detects and logs it
- Safe to paste more than once — prevents double execution and re-run crashes
- Beautiful colored console output + final table report
- Floating control panel with live stats, pause/resume, and stop
- Works on desktop Chrome / Firefox / Edge

## What's New

This version builds on the original with the following improvements:

- **Skip private accounts** — a new `isPrivate()` check (with a UI toggle) detects locked/protected accounts via testid, aria-label, SVG title, and lock-icon signatures, and skips them.
- **Reliable mutual detection** — `isMutual()` was reworked so it no longer accidentally unfollows people who follow you back. It now checks Twitter's follow-indicator testid, aria-labels, and both visible and hidden text.
- **Fixed accidental profile clicks** — `findUnfollowButton()` now targets the real unfollow button by its data-testid and ignores oversized matches, so it no longer clicks the cell-wide profile link and navigates away.
- **Handles X's virtualized list** — the main loop now re-queries the DOM each pass, tracks handled accounts by username, and auto-scrolls to load more. This fixes both the early stop after ~20–40 accounts and the recurring "No unfollow/following button" errors.
- **Adjusted timing** — the minimum delay between unfollows is now 3 seconds (configurable in the panel).
- **Fixed re-run crash** — the whole script is wrapped in an IIFE, eliminating the "redeclaration of let MAX_UNFOLLOWS" error when pasted more than once.

## How to Use (30 seconds)

1. Go to → `https://x.com/yourusername/following`
2. Open DevTools → Console tab (`F12` or `Ctrl+Shift+J`)
3. Paste the entire script from [`unfollow.js`](unfollow.js)
4. Press Enter and relax

The script auto-scrolls to load more profiles as it runs, so manual scrolling is no longer required — though pre-loading a few hundred profiles first can help on very large lists.

> Script stops automatically after 190 unfollows (or when it reaches the end of your list). Want more? Just run it again.

## Screenshot

![Script in action](Capture.JPG)

## Credits

Original author: **Shayan Taherkhani**
Website: https://shayantaherkhani.ir
X/Twitter: [@tah3rkhani](https://twitter.com/tah3rkhani)

All credit for the original script and concept goes to Shayan. This enhanced version preserves his work and attribution.

## Legal Note

This script automates the public web interface and is provided as-is. Automating actions may be against X's Terms of Service — use at your own risk. X.com may change their UI at any time.
