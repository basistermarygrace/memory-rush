/* =====================================================
   MEMORY RUSH: THE LOST FILES  -  script.js (game logic)
   ===================================================== */

/* ---------- 1. SETTINGS (the rules live here) ---------- */

// For testing only: change to 3 or 4 to jump to that level. Put back to 1 before submitting!
const DEBUG_START_LEVEL = 1;

const SYMBOLS = ["📄","📁","🖼️","🎵","🎬","📊","📝","💾","🔒","📷","📦","🗂️","📎","📌"];

const LEVEL_NAMES = ["homework.docx", "family_photos.zip", "thesis_final.pdf", "master_backup.cloud"];

// Difficulty settings (times are in milliseconds, timers in seconds)
const DIFFICULTY = {
  easy:   { label: "Easy",   delay: 300, preview: 0, timer: { 3: 120, 4: 150 } },
  medium: { label: "Medium", delay: 300, preview: 0, timer: { 3: 90,  4: 120 } },
  hard:   { label: "Hard",   delay: 300,  preview: 0, timer: { 3: 75,  4: 100 } },
  expert: { label: "Expert", delay: 300,  preview: 0, timer: { 3: 60,  4: 90  } }
};

// Card table (v = virus, b = bonus, p = normal pairs). Same as the table you approved.
const CARD_TABLE = {
  1: { easy: {v:0,b:0,p:6},  medium: {v:0,b:0,p:6},  hard: {v:0,b:0,p:6},  expert: {v:0,b:0,p:6} },
  2: { easy: {v:2,b:0,p:8},  medium: {v:2,b:0,p:8},  hard: {v:4,b:0,p:7},  expert: {v:4,b:0,p:7} },
  3: { easy: {v:2,b:2,p:10}, medium: {v:3,b:1,p:10}, hard: {v:4,b:2,p:9},  expert: {v:5,b:1,p:9} },
  4: { easy: {v:3,b:3,p:12}, medium: {v:4,b:2,p:12}, hard: {v:6,b:2,p:11}, expert: {v:8,b:2,p:10} }
};

// Points
const PTS = { match: 10, wrong: 2, virus: 10, bonus: 20, life: 25, second: 1 };
const MAX_LIVES = 3;
const TOTAL_LEVELS = 4;

// Text for the first-time popups
const HOWTO_TEXT =
  "Flip two cards. Same picture = match (+10).\n" +
  "Wrong match = -2 points.\n" +
  "You have 3 lives in every level.\n" +
  "Finish all 4 levels to win!";

const LEVEL_INTRO = {
  1: "Level 1: Matching and lives\nFlip two cards and find the pairs.\nYou have 3 lives.",
  2: "Level 2: Virus cards 🦠\nA virus card takes 10 points and 1 life. Avoid it!",
  3: "Level 3: Bonus cards ⭐ and timer\nBonus cards give +20 points.\nNow the clock is running!",
  4: "Final Challenge\nViruses, bonus cards and the timer, all together. Good luck!"
};

/* ---------- 2. GAME STATE (what the game remembers) ---------- */

const state = {
  name: "", diff: "easy",
  level: 1, score: 0, lives: MAX_LIVES,
  matched: 0, totalPairs: 0,
  first: null, second: null,
  lock: false, active: false,
  timeLeft: 0, timerId: null,
  startTime: 0,
  cards: [],
  submitted: false,
  runId: 0            // changes every new game/level so old timeouts do nothing
};

/* ---------- 3. SMALL HELPERS ---------- */

const $ = (id) => document.getElementById(id);

function show(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(screenId).classList.add("active");
}

function shuffle(arr) {                      // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getRank(score) {
  if (score >= 600) return "Memory Master 🏆";
  if (score >= 400) return "Memory Agent 🕵️";
  if (score >= 200) return "File Hunter 🔎";
  return "File Rookie 📁";
}

// localStorage = small notes saved inside THIS browser
function seen(key) {
  try { return localStorage.getItem("mr_" + key) === "1"; } catch (e) { return false; }
}
function markSeen(key) {
  try { localStorage.setItem("mr_" + key, "1"); } catch (e) {}
}

// Popup
let modalCallback = null;
function showModal(title, text, onOk) {
  $("modal-title").textContent = title;
  $("modal-text").textContent = text;
  modalCallback = onOk || null;
  $("modal").classList.remove("hidden");
  $("modal-ok").focus();
}
$("modal-ok").addEventListener("click", () => {
  $("modal").classList.add("hidden");
  const cb = modalCallback;
  modalCallback = null;
  if (cb) cb();
});

/* ---------- 4. HOME + MENU BUTTONS ---------- */

// Clean a name: trim spaces and squeeze many spaces into one
function cleanName(raw) {
  return raw.replace(/\s+/g, " ").trim();
}

/* ---------- DIFFICULTY UNLOCKING (saved per player name) ---------- */
const DIFF_ORDER = ["easy", "medium", "hard", "expert"];

// How many difficulties this name has unlocked (1 = only Easy, 4 = all)
function getUnlocked(name) {
  try {
    const v = parseInt(localStorage.getItem("mr_unlock_" + cleanName(name).toLowerCase()), 10);
    return v >= 1 && v <= 4 ? v : 1;
  } catch (e) { return 1; }
}
function setUnlocked(name, count) {
  try { localStorage.setItem("mr_unlock_" + cleanName(name).toLowerCase(), String(count)); } catch (e) {}
}

// Lock/unlock the buttons. useHighest = true -> select the highest unlocked mode
function refreshDifficultyButtons(useHighest) {
  const unlocked = getUnlocked(state.name);
  if (useHighest || DIFF_ORDER.indexOf(state.diff) >= unlocked) {
    state.diff = DIFF_ORDER[unlocked - 1];
  }
  document.querySelectorAll(".diff-btn").forEach(btn => {
    const idx = DIFF_ORDER.indexOf(btn.dataset.diff);
    const locked = idx >= unlocked;
    btn.disabled = locked;
    btn.classList.toggle("locked", locked);
    btn.classList.toggle("selected", btn.dataset.diff === state.diff);
  });
}

$("start-btn").addEventListener("click", () => {
  const name = cleanName($("player-name").value);
  if (name.length < 2) {
    $("name-error").textContent = "Please enter a name (at least 2 letters).";
    $("player-name").focus();
    return;
  }
  $("name-error").textContent = "";
  state.name = name;
  $("diff-player").textContent = name;
  refreshDifficultyButtons(true);      // select the highest unlocked mode
  show("screen-difficulty");
});

$("player-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("start-btn").click();
});

$("instructions-btn").addEventListener("click", () => show("screen-instructions"));
$("instructions-ok").addEventListener("click", () => show("screen-home"));

$("diff-group").addEventListener("click", (e) => {
  const btn = e.target.closest(".diff-btn");
  if (!btn) return;
  document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  state.diff = btn.dataset.diff;
});

$("diff-back-btn").addEventListener("click", () => show("screen-home"));
$("begin-btn").addEventListener("click", startGame);

/* ---------- 5. START A GAME / A LEVEL ---------- */

function startGame() {
  stopTimer();
  state.runId++;
  state.level = DEBUG_START_LEVEL;
  state.score = 0;
  state.submitted = false;
  state.startTime = Date.now();
  show("screen-game");

  // First-time player: show How to Play first, then the level popup
  if (!seen("howto")) {
    markSeen("howto");
    showModal("How to Play", HOWTO_TEXT, () => startLevel());
  } else {
    startLevel();
  }
}

function buildDeck(level) {
  const cfg = CARD_TABLE[level][state.diff];
  const symbols = shuffle(SYMBOLS.slice()).slice(0, cfg.p);
  const deck = [];
  symbols.forEach(s => {
    deck.push({ type: "normal", symbol: s });
    deck.push({ type: "normal", symbol: s });
  });
  for (let i = 0; i < cfg.v; i++) deck.push({ type: "virus", symbol: "🦠" });
  for (let i = 0; i < cfg.b; i++) deck.push({ type: "bonus", symbol: "⭐" });
  return { deck: shuffle(deck), pairs: cfg.p };
}

function gridSize(total) {
  const portrait = window.innerHeight > window.innerWidth;
  if (!portrait) {
    return { 12: [4,3], 18: [6,3], 24: [6,4], 30: [6,5] }[total];
  }
  return { 12: [3,4], 18: [3,6], 24: [4,6], 30: [5,6] }[total];
}

function startLevel() {
  stopTimer();
  state.runId++;
  const myRun = state.runId;

  state.lives = MAX_LIVES;
  state.matched = 0;
  state.first = null;
  state.second = null;
  state.lock = true;       // locked until the popup + preview are finished
  state.active = true;

  const built = buildDeck(state.level);
  state.cards = built.deck;
  state.totalPairs = built.pairs;

  // Timer only in Level 3 and 4
  const secs = DIFFICULTY[state.diff].timer[state.level];
  state.timeLeft = secs || 0;
  $("hud-timer-box").classList.toggle("hidden", !secs);
  $("hud-timer").textContent = state.timeLeft;

  $("hud-diff").textContent = DIFFICULTY[state.diff].label;
  $("hud-player").textContent = state.name;
  $("file-banner").textContent = "📄 Recovering: " + LEVEL_NAMES[state.level - 1];

  renderBoard();
  updateHud();
  show("screen-game");

  // Level popup (only the first time this browser sees this level)
  const key = "level" + state.level;
  if (!seen(key)) {
    markSeen(key);
    showModal("Level " + state.level, LEVEL_INTRO[state.level], () => beginPlay(myRun));
  } else {
    beginPlay(myRun);
  }
}

// Preview the cards, then let the player play
function beginPlay(myRun) {
  if (myRun !== state.runId) return;
  const previewMs = DIFFICULTY[state.diff].preview;
  const els = document.querySelectorAll("#board .card");

  const go = () => {
    if (myRun !== state.runId) return;
    els.forEach(el => el.classList.remove("flipped"));
    state.lock = false;
    if (state.timeLeft > 0) startTimer();
  };

  if (previewMs > 0) {
    els.forEach(el => el.classList.add("flipped"));
    setTimeout(go, previewMs);
  } else {
    go();
  }
}

/* ---------- 6. DRAW THE BOARD ---------- */

function renderBoard() {
  const board = $("board");
  board.innerHTML = "";
  const [cols, rows] = gridSize(state.cards.length);
  board.style.setProperty("--cols", cols);
  board.style.setProperty("--rows", rows);

  state.cards.forEach((card, i) => {
    const btn = document.createElement("button");
    btn.className = "card";
    btn.setAttribute("aria-label", "Card " + (i + 1));
    btn.innerHTML =
      '<div class="card-inner">' +
        '<div class="card-cover"></div>' +
        '<div class="card-face">' + card.symbol + '</div>' +
      '</div>';
    btn.addEventListener("click", () => onCardClick(i, btn));
    board.appendChild(btn);
    card.el = btn;
    card.done = false;       // true when matched or already used (virus/bonus)
  });
}

function updateHud() {
  $("hud-level").textContent = state.level;
  $("hud-score").textContent = state.score;
  $("hud-pairs").textContent = state.matched + "/" + state.totalPairs;
  $("hud-lives").textContent = "❤️".repeat(state.lives) + "🖤".repeat(MAX_LIVES - state.lives);
}

/* ---------- 7. WHAT HAPPENS WHEN A CARD IS CLICKED ---------- */

function onCardClick(i) {
  if (!state.active || state.lock) return;      // blocked (game over / checking / preview)
  const card = state.cards[i];
  if (card.done || card.el.classList.contains("flipped")) return;

  card.el.classList.add("flipped");

  // --- special cards work right away ---
  if (card.type === "virus") {
    card.done = true;
    card.el.classList.add("virus", "locked");
    state.score = Math.max(0, state.score - PTS.virus);
    state.lives--;
    updateHud();
    if (state.lives <= 0) gameOver("No lives left!");
    return;
  }
  if (card.type === "bonus") {
    card.done = true;
    card.el.classList.add("bonus", "locked");
    state.score += PTS.bonus;
    updateHud();
    return;
  }

  // --- normal cards ---
  if (!state.first) { state.first = card; return; }

  state.second = card;
  state.lock = true;                            // block clicks while checking
  const a = state.first, b = state.second;

  if (a.symbol === b.symbol) {
    // MATCH
    [a, b].forEach(c => { c.done = true; c.el.classList.add("matched", "locked"); });
    state.score += PTS.match;
    state.matched++;
    state.first = state.second = null;
    state.lock = false;
    updateHud();
    if (state.matched === state.totalPairs) levelCleared();
  } else {
    // WRONG MATCH
    state.score = Math.max(0, state.score - PTS.wrong);
    updateHud();
    const myRun = state.runId;
    setTimeout(() => {
      if (myRun !== state.runId) return;
      a.el.classList.remove("flipped");
      b.el.classList.remove("flipped");
      state.first = state.second = null;
      state.lock = false;
    }, DIFFICULTY[state.diff].delay);
  }
}

/* ---------- 8. TIMER ---------- */

function startTimer() {
  stopTimer();
  state.timerId = setInterval(() => {
    state.timeLeft--;
    $("hud-timer").textContent = state.timeLeft;
    if (state.timeLeft <= 0) {
      stopTimer();
      gameOver("Time is up!");
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

/* ---------- 9. LEVEL CLEARED / GAME OVER / RESULTS ---------- */

function levelCleared() {
  stopTimer();
  state.active = false;

  // End-of-stage bonus (given once, because this function runs once per stage)
  const lifeBonus = state.lives * PTS.life;
  const timeBonus = Math.max(0, state.timeLeft) * PTS.second;
  state.score += lifeBonus + timeBonus;
  updateHud();

  if (state.level >= TOTAL_LEVELS) {
    showResults(true, "You recovered all the files!");
    return;
  }

  $("between-title").textContent = "Level " + state.level + " cleared! 🎉";
  $("between-info").textContent =
    "Life bonus: +" + lifeBonus +
    (timeBonus ? "   Time bonus: +" + timeBonus : "") +
    "   Score: " + state.score;
  show("screen-between");
}

$("next-level-btn").addEventListener("click", () => {
  state.level++;
  startLevel();
});

function gameOver(reason) {
  stopTimer();
  state.active = false;
  state.lock = true;
  state.runId++;                       // cancel any waiting timeouts
  showModal("Game Over 💥", reason, () => showResults(false, reason));
}

function showResults(won, message) {
  state.active = false;
  const seconds = Math.round((Date.now() - state.startTime) / 1000);
  const reached = state.level;

  $("result-heading").textContent = won ? "You Win! 🎉" : "Game Over";
  $("result-rank").textContent = getRank(state.score);
  $("res-name").textContent = state.name;
  $("res-score").textContent = state.score;
  $("res-diff").textContent = DIFFICULTY[state.diff].label;
  $("res-time").textContent = seconds + " s";
  $("res-level").textContent = reached + " of " + TOTAL_LEVELS;
    // Unlock the next difficulty when the player WINS
  let unlockMsg = "";
  if (won) {
    const idx = DIFF_ORDER.indexOf(state.diff);
    if (idx + 1 < DIFF_ORDER.length && getUnlocked(state.name) < idx + 2) {
      setUnlocked(state.name, idx + 2);
      unlockMsg = "  🔓 " + DIFFICULTY[DIFF_ORDER[idx + 1]].label + " unlocked!";
    }
  }
  $("res-outcome").textContent = won ? "Completed" + unlockMsg : message;
  show("screen-results");

  // Submit ONCE per game
  if (state.submitted) return;
  state.submitted = true;

  const payload = {
    name: state.name,
    score: state.score,
    difficulty: state.diff,
    level: reached,
    completed: won,
    seconds: seconds
  };

  if (typeof window.submitScoreToDb !== "function") {
    $("submit-status").textContent = "Leaderboard is not connected yet.";
    return;
  }
  $("submit-status").textContent = "Saving your score...";
  window.submitScoreToDb(payload)
    .then(() => { $("submit-status").textContent = "Score saved to the leaderboard! ✅"; })
    .catch(() => { $("submit-status").textContent = "Could not save the score. Check your internet."; });
}

$("play-again-btn").addEventListener("click", () => {
  refreshDifficultyButtons(false);     // keep the current mode if still unlocked
  show("screen-difficulty");
});
/* ---------- 10. RESTART ---------- */

$("restart-btn").addEventListener("click", () => {
  if (confirm("Restart from Level 1? Your score will reset.")) startGame();
});

/* ---------- 11. LEADERBOARD SCREEN ---------- */

$("leaderboard-btn").addEventListener("click", openLeaderboard);
$("lb-back-btn").addEventListener("click", () => show("screen-home"));
function openLeaderboard() {
  show("screen-leaderboard");
  const body = $("lb-body");
  const msg = $("lb-message");
  body.innerHTML = "";
  msg.textContent = "Loading...";

  if (typeof window.fetchLeaderboard !== "function") {
    msg.textContent = "Leaderboard is not connected yet.";
    return;
  }

  window.fetchLeaderboard()
    .then(rows => {
      body.innerHTML = "";
      if (!rows || rows.length === 0) {
        msg.textContent = "No scores yet. Be the first!";
        return;
      }
      msg.textContent = "";
      rows.forEach((r, i) => {
        const tr = document.createElement("tr");
        const cells = [
          i + 1,
          r.display_name,
          r.best_score,
          r.best_difficulty,
          r.completed_final ? "Completed" : "Level " + r.highest_level,
          new Date(r.achieved_at).toLocaleDateString()
        ];
        cells.forEach(c => {
          const td = document.createElement("td");
          td.textContent = c;
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    })
    .catch(err => {
      console.error("Leaderboard error:", err);
      msg.textContent = "Cannot load the leaderboard. Check your internet.";
    });
}

/* ---------- RESULTS BUTTONS (make sure they work) ---------- */
$("play-again-btn").addEventListener("click", () => {
  refreshDifficultyButtons(false);
  show("screen-difficulty");
});
$("menu-btn").addEventListener("click", () => show("screen-home"));
$("results-lb-btn").addEventListener("click", openLeaderboard);