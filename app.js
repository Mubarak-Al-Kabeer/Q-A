/* ═══════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════ */

// ⚠️ رابط النشر (Web App URL) — يتغير إذا أنشأت Deployment جديد (مو "إدارة النشر ← نسخة جديدة")
const API_URL =
  "https://script.google.com/macros/s/AKfycbyDMRhlABfveRXvD0LLTS9x9QqbKMRLRF9E4rBd8YXP9G7RQBtI7bv_SCvh32e7bNn68Q/exec";

/* ═══════════════════════════════════════════════════════
   CATEGORIES & POINTS
═══════════════════════════════════════════════════════ */

const CATEGORIES = [
  "التشريح",
  "اكتشف الحالة",
  "الأدوات والمعدات",
  "العلامات الحيوية",
  "الأدوية",
  "الطوارئ والإسعافات"
];

const CASE_CATEGORY_INDEX = 1;

const POINTS       = [100, 200, 300, 400, 600];
const TIER_CLASSES = ["tier-1", "tier-2", "tier-3", "tier-4", "tier-5"];

/* ═══════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════ */

let currentUser     = null;
let currentGame     = null;
let currentQuestion = null;

let gameState = {
  team1Score: 0,
  team2Score: 0,
  turn: 1,
  usedQuestions: [],
  pool: []
};

/* ═══════════════════════════════════════════════════════
   TIMER — دقيقة لكل فريق
═══════════════════════════════════════════════════════ */

const TIMER_SECONDS = 60;
const CIRCUMFERENCE = 2 * Math.PI * 26;   // 163.36

let timerInterval = null;
let timerLeft     = TIMER_SECONDS;
let timerRunning  = false;

function startTimer() {
  if (timerRunning || timerLeft <= 0) return;
  timerRunning = true;
  timerInterval = setInterval(() => {
    timerLeft--;
    updateTimerUI();
    if (timerLeft <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerLeft = 0;
      updateTimerUI();
      playBeep();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
}

function resetTimer() {
  pauseTimer();
  timerLeft = TIMER_SECONDS;
  updateTimerUI();
}

function updateTimerUI() {
  const numEl    = el("timerNum");
  const circleEl = el("timerCircle");
  const labelEl  = el("timerTeamLabel");

  if (numEl) {
    numEl.textContent = timerLeft;
    numEl.classList.toggle("done", timerLeft === 0);
  }

  if (circleEl) {
    const pct = timerLeft / TIMER_SECONDS;
    circleEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
    circleEl.classList.remove("warning", "danger");
    if (timerLeft <= 10)      circleEl.classList.add("danger");
    else if (timerLeft <= 20) circleEl.classList.add("warning");
  }

  if (labelEl && currentGame) {
    labelEl.textContent = gameState.turn === 1
      ? (currentGame.team1 || "الفريق الأول")
      : (currentGame.team2 || "الفريق الثاني");
  }
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 200, 400].forEach(delay => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay / 1000);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.3);
      osc.start(ctx.currentTime + delay / 1000);
      osc.stop(ctx.currentTime + delay / 1000 + 0.35);
    });
  } catch {}
}

/* ═══════════════════════════════════════════════════════
   API  (يرسل رمز الجلسة تلقائياً مع كل طلب)
═══════════════════════════════════════════════════════ */

async function apiRequest(data, silentExpire = false) {
  try {
    const payload = { ...data, token: currentUser?.token || "" };
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    if (!text) return { success: false, message: "استجابة فارغة من السيرفر" };

    let result;
    try { result = JSON.parse(text); }
    catch { return { success: false, message: "السيرفر أرسل بيانات غير صالحة (تأكد من إعدادات النشر)" }; }

    if (result?.expired && currentUser && !silentExpire) {
      logout();
      setMsg("loginMessage", result.message || "انتهت الجلسة، سجّل الدخول من جديد", "error");
    }
    return result;
  } catch (err) {
    return { success: false, message: "تعذّر الاتصال: " + err.message };
  }
}

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function escJs(v) {
  return String(v ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
function el(id) { return document.getElementById(id); }
function setMsg(id, text, type = "") {
  const m = el(id); if (!m) return;
  m.textContent = text; m.className = "msg " + type;
}
function togglePw(inputId, btn) {
  const inp = el(inputId); if (!inp) return;
  inp.type = inp.type === "password" ? "text" : "password";
  btn.textContent = inp.type === "password" ? "👁" : "🙈";
}

/* ═══════════════════════════════════════════════════════
   USER HELPERS
═══════════════════════════════════════════════════════ */

function normalizeUser(result, accountNumber) {
  let user = result?.user || result?.data || result?.account || null;
  if (!user && result && typeof result === "object") {
    if (result.accountNumber || result.nickname || result.status || result.role) user = result;
  }
  if (!user) return null;
  return {
    ...user,
    accountNumber:  user.accountNumber ?? user.account_number ?? accountNumber,
    nickname:       user.nickname ?? user.name ?? user.nickName ?? "",
    phone:          user.phone ?? user.mobile ?? "",
    email:          user.email ?? "",
    status:         String(user.status ?? user.Status ?? user.state ?? "").trim().toUpperCase(),
    role:           String(user.role ?? user.Role ?? "").trim().toUpperCase(),
    gamesRemaining: Number(user.gamesRemaining ?? user.remainingGames ?? 0),
    token:          user.token ?? ""
  };
}
function isApproved(user) {
  const s = String(user?.status ?? "").trim().toUpperCase();
  return s === "APPROVED" || s === "ACCEPTED" || s === "ACTIVE";
}
/* للعرض فقط — السيرفر هو اللي يتحقق فعلياً من صلاحية المسؤول */
function isAdmin() {
  const role = String(currentUser?.role ?? "").trim().toUpperCase();
  return role === "ADMIN" || role === "ADMINISTRATOR";
}

/* ═══════════════════════════════════════════════════════
   SCREENS
═══════════════════════════════════════════════════════ */

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const scr = el(id);
  if (scr) { scr.classList.add("active"); window.scrollTo(0, 0); }
}

/* ═══════════════════════════════════════════════════════
   LOGIN / REGISTER / FORGOT
═══════════════════════════════════════════════════════ */

async function login() {
  const account = el("loginAccount")?.value.trim();
  const code    = el("loginCode")?.value.trim();
  if (!account || !code) { setMsg("loginMessage", "أدخل رقم الحساب والرمز", "error"); return; }

  const btn = document.querySelector("#loginScreen .btn-primary");
  if (btn) btn.disabled = true;
  setMsg("loginMessage", "جاري التحقق…");

  const result = await apiRequest({ action: "login", accountNumber: account, code });
  if (btn) btn.disabled = false;

  if (!result?.success) { setMsg("loginMessage", result?.message || "رقم الحساب أو الرمز غير صحيح", "error"); return; }

  const user = normalizeUser(result, account);
  if (!user) { setMsg("loginMessage", "السيرفر لم يُرسل بيانات المستخدم", "error"); return; }
  if (!user.token) { setMsg("loginMessage", "السيرفر لم يُرسل رمز الجلسة — تأكد من نشر النسخة الجديدة من Code.gs", "error"); return; }

  if (user.status === "REJECTED") {
    setMsg("loginMessage", "تم رفض حسابك، تواصل مع المسؤول", "error");
    return;
  }

  currentUser = user;
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
  setMsg("loginMessage", "");
  afterLogin();
}

function afterLogin() {
  showScreen("gameScreen");
  updateTopbar();
  if (isAdmin())               { showAdminMenu(); return; }
  if (isApproved(currentUser)) { showGameSetup(); return; }
  const w = el("waitingAccount"); if (w) w.textContent = currentUser.accountNumber || "—";
  showScreen("waitingScreen");
}

async function register() {
  const nickname = el("registerNickname")?.value.trim();
  const phone    = el("registerPhone")?.value.trim();
  const email    = el("registerEmail")?.value.trim();
  const code     = el("registerCode")?.value.trim();
  if (!nickname || !phone || !email || !code) { setMsg("registerMessage", "أكمل جميع الحقول", "error"); return; }
  setMsg("registerMessage", "جاري إنشاء الحساب…");
  const result = await apiRequest({ action: "register", nickname, phone, email, code });
  if (!result?.success) { setMsg("registerMessage", result?.message || "تعذّر إنشاء الحساب", "error"); return; }
  const num = result.accountNumber || "—";
  const msgEl = el("registerMessage");
  if (msgEl) {
    msgEl.className = "msg success";
    msgEl.innerHTML = `تم إنشاء الحساب ✅<br>رقمك: <strong style="font-size:1.2rem;color:#ffc338">${esc(num)}</strong>`;
  }
  const w = el("waitingAccount"); if (w) w.textContent = num;
  setTimeout(() => showScreen("waitingScreen"), 1600);
}

async function forgotCode() {
  const accountNumber = el("forgotAccount")?.value.trim();
  const phone         = el("forgotPhone")?.value.trim();
  const email         = el("forgotEmail")?.value.trim();
  if (!accountNumber || !phone || !email) { setMsg("forgotMessage", "أدخل جميع البيانات", "error"); return; }
  setMsg("forgotMessage", "جاري التحقق…");
  const result = await apiRequest({ action: "forgotCode", accountNumber, phone, email });
  setMsg("forgotMessage",
    result?.message || (result?.success ? "تم التحقق" : "البيانات غير صحيحة"),
    result?.success ? "success" : "error");
}

/* ═══════════════════════════════════════════════════════
   TOPBAR & ZONES
═══════════════════════════════════════════════════════ */

function updateTopbar() {
  if (!currentUser) return;
  const nn = el("playerNickname"); if (nn) nn.textContent = currentUser.nickname || currentUser.accountNumber || "";
  const gr = el("gamesRemaining"); if (gr) gr.textContent = isAdmin() ? "∞" : (currentUser.gamesRemaining ?? 0);
  const badge = el("gamesRemainingBadge"); if (badge) badge.style.display = isAdmin() ? "none" : "";
}

function showAdminMenu() {
  el("adminMenu").style.display     = "block";
  el("gameSetupArea").style.display = "none";
  el("adminPanel").style.display    = "none";
}
function showGameSetup() {
  el("adminMenu").style.display     = "none";
  el("adminPanel").style.display    = "none";
  el("gameSetupArea").style.display = "block";
  const b = el("adminBackBtn"); if (b) b.style.display = isAdmin() ? "block" : "none";
}
async function showAdminPanel() {
  if (!isAdmin()) { alert("غير مصرح لك"); return; }
  el("adminMenu").style.display     = "none";
  el("gameSetupArea").style.display = "none";
  el("adminPanel").style.display    = "block";
  await loadAccounts();
}

/* ═══════════════════════════════════════════════════════
   ACCOUNTS (ADMIN)
═══════════════════════════════════════════════════════ */

async function loadAccounts() {
  if (!isAdmin()) return;
  const list = el("accountsList"); if (!list) return;
  list.innerHTML = '<div class="loading-text">جاري تحميل الحسابات…</div>';

  const result = await apiRequest({ action: "getAccounts" });
  if (!result?.success) {
    list.innerHTML = `<div class="loading-text">${esc(result?.message || "تعذّر التحميل")}</div>`;
    return;
  }

  const accounts = Array.isArray(result.accounts) ? result.accounts : Array.isArray(result.data) ? result.data : [];
  const pending  = accounts.filter(a => String(a.status || "").toUpperCase() === "PENDING").length;
  const approved = accounts.filter(a => String(a.status || "").toUpperCase() === "APPROVED").length;
  const te = el("totalAccounts");    if (te) te.textContent = accounts.length;
  const pe = el("pendingAccounts");  if (pe) pe.textContent = pending;
  const ae = el("approvedAccounts"); if (ae) ae.textContent = approved;

  if (!accounts.length) { list.innerHTML = '<div class="loading-text">لا توجد حسابات</div>'; return; }
  list.innerHTML = "";

  accounts.forEach(acc => {
    const st = String(acc.status || "").toUpperCase();
    let stTxt = "غير معروف", stCls = "s-unknown";
    if (st === "APPROVED" || st === "ACCEPTED" || st === "ACTIVE") { stTxt = "مقبول"; stCls = "s-approved"; }
    else if (st === "PENDING")  { stTxt = "انتظار"; stCls = "s-pending"; }
    else if (st === "REJECTED") { stTxt = "مرفوض";  stCls = "s-rejected"; }
    const num = acc.accountNumber || acc.account_number || "";

    const row = document.createElement("div");
    row.className = "acc-row";
    row.innerHTML = `
      <div class="acc-num">${esc(num)}</div>
      <div><div class="acc-name">${esc(acc.nickname || "—")}</div><div class="acc-email">${esc(acc.email || "")}</div></div>
      <div class="acc-phone">${esc(acc.phone || "—")}</div>
      <div class="acc-status ${stCls}">${stTxt}</div>
      <div class="acc-actions">
        ${st !== "APPROVED" ? `<button class="btn-approve" onclick="changeStatus('${escJs(num)}','APPROVED')">✓ قبول</button>` : ""}
        ${st !== "REJECTED" ? `<button class="btn-reject" onclick="changeStatus('${escJs(num)}','REJECTED')">✗ رفض</button>` : ""}
        <button class="btn-games" onclick="editGames('${escJs(num)}',${Number(acc.gamesRemaining || 0)})">🎮 ألعاب</button>
      </div>`;
    list.appendChild(row);
  });
}

async function changeStatus(accountNumber, status) {
  if (!isAdmin()) return;
  if (!confirm(status === "APPROVED" ? "قبول هذا الحساب؟" : "رفض هذا الحساب؟")) return;
  const result = await apiRequest({
    action: "updateAccountStatus",
    accountNumber: String(accountNumber),
    status
  });
  if (!result?.success) { if (!result?.expired) alert(result?.message || "تعذّر التحديث"); return; }
  await loadAccounts();
}

async function editGames(accountNumber, current) {
  const input = prompt(`عدد الألعاب الحالي: ${current}\nأدخل العدد الجديد:`, current);
  if (input === null) return;
  const n = parseInt(input, 10);
  if (isNaN(n) || n < 0) { alert("رقم غير صحيح"); return; }
  const result = await apiRequest({
    action: "updateGames",
    targetAccountNumber: String(accountNumber),
    games: n
  });
  if (!result?.success) { if (!result?.expired) alert(result?.message || "تعذّر التحديث"); return; }
  await loadAccounts();
}

/* ═══════════════════════════════════════════════════════
   START GAME
   (نحمّل الأسئلة أولاً حتى لا يُخصم من رصيد اللاعب إذا فشل التحميل)
═══════════════════════════════════════════════════════ */

async function startGame() {
  const t1 = el("team1")?.value.trim();
  const t2 = el("team2")?.value.trim();
  if (!t1 || !t2) { setMsg("gameMessage", "أدخل اسمَي الفريقين", "error"); return; }
  if (t1 === t2)  { setMsg("gameMessage", "يجب أن يكون اسم الفريقين مختلفاً", "error"); return; }

  const startBtn = document.querySelector("#gameSetupArea .btn-start");
  if (startBtn) startBtn.disabled = true;

  setMsg("gameMessage", "جاري تحميل الأسئلة…");
  const qResult = await apiRequest({ action: "getAllQuestions" });
  if (!qResult?.success || !Array.isArray(qResult.questions) || !qResult.questions.length) {
    setMsg("gameMessage", qResult?.message || "لا توجد أسئلة حالياً، تواصل مع المسؤول", "error");
    if (startBtn) startBtn.disabled = false;
    return;
  }
  const pool = qResult.questions;

  if (!isAdmin()) {
    setMsg("gameMessage", "جاري التحقق…");
    const result = await apiRequest({ action: "createGame", team1: t1, team2: t2 });
    if (!result?.success) {
      setMsg("gameMessage", result?.message || "تعذّر البدء", "error");
      if (startBtn) startBtn.disabled = false;
      return;
    }
    currentUser.gamesRemaining = result.gamesRemaining ?? (currentUser.gamesRemaining - 1);
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    updateTopbar();
    currentGame = { gameId: result.gameId, team1: t1, team2: t2 };
  } else {
    currentGame = { gameId: null, team1: t1, team2: t2 };
  }

  if (startBtn) startBtn.disabled = false;
  setMsg("gameMessage", "");

  gameState = { team1Score: 0, team2Score: 0, turn: 1, usedQuestions: [], pool };
  currentQuestion = null;

  const bt1 = el("bTeam1"); if (bt1) bt1.textContent = t1;
  const bt2 = el("bTeam2"); if (bt2) bt2.textContent = t2;

  resetTimer();
  updateScoreboard();
  buildBoard();
  showStageIdle();
  showScreen("boardScreen");
}

/* ═══════════════════════════════════════════════════════
   BOARD
═══════════════════════════════════════════════════════ */

function buildBoard() {
  const board = el("categoryBoard"); if (!board) return;
  board.innerHTML = "";

  CATEGORIES.forEach((cat, ci) => {
    const col = document.createElement("div");
    col.className = "cat-col";

    const title = document.createElement("div");
    title.className   = ci === CASE_CATEGORY_INDEX ? "cat-title special" : "cat-title";
    title.textContent = ci === CASE_CATEGORY_INDEX ? "🔍 " + cat : cat;
    col.appendChild(title);

    POINTS.forEach((pts, pi) => {
      const btn = document.createElement("button");
      btn.className   = `pts-btn ${TIER_CLASSES[pi]}`;
      btn.textContent = pts;
      const key = ci + "-" + pi;
      if (gameState.usedQuestions.includes(key)) { btn.classList.add("used"); btn.disabled = true; }
      else btn.onclick = () => openQuestion(ci, pi, pts, cat, btn);
      col.appendChild(btn);
    });

    board.appendChild(col);
  });
}

/* ═══════════════════════════════════════════════════════
   QUESTION STAGE
═══════════════════════════════════════════════════════ */

function showStageIdle() {
  const idle = el("stageIdle"), q = el("stageQuestion");
  if (idle) idle.style.display = "flex";
  if (q)    q.style.display    = "none";
}
function showStageQuestion() {
  const idle = el("stageIdle"), q = el("stageQuestion");
  if (idle) idle.style.display = "none";
  if (q)    q.style.display    = "block";
}

function openQuestion(catIdx, ptIdx, pts, cat, btn) {
  const key = catIdx + "-" + ptIdx;
  if (gameState.usedQuestions.includes(key)) return;
  btn.classList.add("used");
  btn.disabled = true;
  gameState.usedQuestions.push(key);

  const isCase  = catIdx === CASE_CATEGORY_INDEX;
  const matches = gameState.pool.filter(q => q.category === cat && Number(q.points) === pts);

  if (matches.length) {
    const picked = matches[Math.floor(Math.random() * matches.length)];
    gameState.pool.splice(gameState.pool.indexOf(picked), 1);
    currentQuestion = {
      id: picked.id, category: cat, points: pts,
      text: picked.question || "—", answer: picked.answer || "—", isCase
    };
  } else {
    currentQuestion = {
      id: null, category: cat, points: pts, isCase,
      text: isCase ? `[ سيناريو ${cat} — ${pts} نقطة ] — لم يُضَف بعد`
                   : `[ سؤال ${cat} — ${pts} نقطة ] — لم يُضَف بعد`,
      answer: "الإجابة غير مضافة"
    };
  }

  renderQuestion();

  // الدقيقة تبدأ تلقائياً للفريق صاحب الدور
  resetTimer();
  startTimer();
}

function renderQuestion() {
  if (!currentQuestion) return;
  const cat = el("qCategory"), pts = el("qPoints");
  const txt = el("qText"), ansTxt = el("answerText");
  const reveal = el("revealArea"), answer = el("answerArea");
  const t1btn = el("teamBtn1"), t2btn = el("teamBtn2");

  if (cat) cat.textContent = currentQuestion.isCase ? "🔍 " + currentQuestion.category : currentQuestion.category;
  if (pts) pts.textContent = currentQuestion.points + " نقطة";
  if (txt) txt.textContent = currentQuestion.text;
  if (ansTxt) ansTxt.textContent = currentQuestion.answer;
  if (reveal) reveal.style.display = "block";
  if (answer) answer.style.display = "none";
  if (t1btn) t1btn.textContent = "✅ " + (currentGame?.team1 || "الفريق الأول") + " أجاب صح";
  if (t2btn) t2btn.textContent = "✅ " + (currentGame?.team2 || "الفريق الثاني") + " أجاب صح";

  showStageQuestion();
  el("questionStage")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showAnswer() {
  const reveal = el("revealArea"), answer = el("answerArea");
  if (reveal) reveal.style.display = "none";
  if (answer) { answer.style.display = "block"; answer.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  pauseTimer();
}

function awardTeam(which) {
  if (!currentQuestion) return;
  const q = currentQuestion;

  if (which === 1) gameState.team1Score += Number(q.points);
  if (which === 2) gameState.team2Score += Number(q.points);

  gameState.turn = gameState.turn === 1 ? 2 : 1;
  updateScoreboard();
  currentQuestion = null;
  showStageIdle();
  resetTimer();

  if (currentGame?.gameId) {
    apiRequest({
      action: "submitAnswer",
      gameId: currentGame.gameId,
      team1: currentGame.team1, team2: currentGame.team2,
      category: q.category,
      questionId: q.id || "", question: q.text || "", points: q.points || 0,
      team: which === 1 ? currentGame.team1 : which === 2 ? currentGame.team2 : "",
      correct: which === 1 || which === 2
    }, true).catch(() => {});   // true = لا تسجّل خروج وسط اللعبة إذا انتهت الجلسة
  }
}

/* ═══════════════════════════════════════════════════════
   SCOREBOARD
═══════════════════════════════════════════════════════ */

function updateScoreboard() {
  const s1 = el("score1"), s2 = el("score2");
  const turn = el("currentTurn"), c1 = el("team1Card"), c2 = el("team2Card");
  if (s1) s1.textContent = gameState.team1Score;
  if (s2) s2.textContent = gameState.team2Score;
  if (turn) turn.textContent = gameState.turn === 1
    ? (currentGame?.team1 || "الفريق الأول") : (currentGame?.team2 || "الفريق الثاني");
  if (c1) c1.classList.toggle("active-team", gameState.turn === 1);
  if (c2) c2.classList.toggle("active-team", gameState.turn === 2);
  updateTimerUI();
}

function swapTurn() {
  gameState.turn = gameState.turn === 1 ? 2 : 1;
  updateScoreboard();
  resetTimer();
}

/* ═══════════════════════════════════════════════════════
   BACK / LOGOUT / RESTORE
═══════════════════════════════════════════════════════ */

function confirmBack() {
  if (!confirm("هل تريد الخروج من اللعبة الحالية؟")) return;
  backToSetup();
}
function backToSetup() {
  resetTimer();
  currentQuestion = null;
  showStageIdle();
  showScreen("gameScreen");
  if (isAdmin()) showAdminMenu(); else showGameSetup();
}
function logout() {
  resetTimer();
  currentUser = currentGame = currentQuestion = null;
  gameState = { team1Score: 0, team2Score: 0, turn: 1, usedQuestions: [], pool: [] };
  localStorage.removeItem("currentUser");
  ["loginAccount", "loginCode"].forEach(id => { const i = el(id); if (i) i.value = ""; });
  setMsg("loginMessage", "");
  showScreen("loginScreen");
}

function restoreSession() {
  try {
    const saved = localStorage.getItem("currentUser");
    if (!saved) return;
    const user = JSON.parse(saved);
    // جلسة قديمة بدون رمز، أو حساب غير مقبول → يرجع لشاشة الدخول ويتحقق من السيرفر من جديد
    if (!user || !user.token) { localStorage.removeItem("currentUser"); return; }
    currentUser = user;
    if (!isAdmin() && !isApproved(currentUser)) {
      currentUser = null;
      localStorage.removeItem("currentUser");
      return;
    }
    showScreen("gameScreen");
    updateTopbar();
    if (isAdmin()) showAdminMenu(); else showGameSetup();
  } catch { localStorage.removeItem("currentUser"); }
}

document.addEventListener("DOMContentLoaded", () => {
  restoreSession();
  // زر Enter يسجّل الدخول
  ["loginAccount", "loginCode"].forEach(id => {
    el(id)?.addEventListener("keydown", e => { if (e.key === "Enter") login(); });
  });
});
