/* ═══════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════ */

// ⚠️ رابط النشر (Web App URL) — يتغير إذا أنشأت Deployment جديد
const API_URL =
  "https://script.google.com/macros/s/AKfycbyEk4p3tzoLU0cy8Un0omcjZhP0XbfDIzNeIH-Qo88XhYhDylz1X8J-Yq7SWQa5EFcJvw/exec";

/* ═══════════════════════════════════════════════════════
   CATEGORIES & POINTS
═══════════════════════════════════════════════════════ */

// 25 فئة مقسمة على 4 مجموعات — الأسماء لازم تطابق عمود category في الشيت حرفياً
const CATEGORY_GROUPS = [
  { key: "KNOWLEDGE", title: "🧠 المعرفة",  cats: ["التشريح", "Heart Master", "Blood Lab", "Bone Artist", "Medical Abbreviations"] },
  { key: "EMS",       title: "🚑 الطوارئ",  cats: ["ER Master", "الأدوات والمعدات", "BLS/CPR", "ACLS", "Trauma", "SAMPLE/OPQRST", "العلامات الحيوية"] },
  { key: "VISUAL",    title: "👁 بصري",     cats: ["Hospital Detective", "X-Ray Detective", "What's This?", "What's Wrong?", "Medical Memory"] },
  { key: "FUN",       title: "🎉 تحديات",   cats: ["Real or Myth", "5 Second Challenge", "Speed Round", "Audio Challenge", "Video Challenge", "Battle 1v1", "Wild Card", "Final Boss"] }
];
const CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.cats);

// حدود اختيار الفئات — العدد لازم يكون زوجي حتى يتساوى عدد الأسئلة للفريقين
const MIN_CATS    = 4;
const MAX_CATS    = 10;
const RANDOM_CATS = 6;

// 5 مستويات نقاط
const POINTS       = [100, 200, 300, 400, 500];
const TIER_CLASSES = ["tier-1", "tier-2", "tier-3", "tier-4", "tier-5"];

// قواعد اللعب
const TIMER_SECONDS     = 60;   // وقت الفريق صاحب الدور
const STEAL_SECONDS     = 20;   // وقت السرقة للخصم
const FIRE_STREAK       = 3;    // كم إجابة متتالية حتى يصير الفريق 🔥
const FIRE_BONUS        = 100;  // نقاط إضافية لكل إجابة صح وهو 🔥
const FINAL_ROUND_TILES = 4;    // آخر كم خانة تصير مضاعفة
const FINAL_BOSS_CAT    = "Final Boss";

const HELPERS = {
  pit:    { icon: "🕳️", name: "الحفرة",        when: "before", desc: "قبل فتح السؤال: إذا جاوبتوا صح تنخصم نفس النقاط من الخصم" },
  double: { icon: "2×", name: "دبل",           when: "before", desc: "قبل فتح السؤال: صح = النقاط ×2 · غلط = تنخصم النقاط منكم" },
  diag:   { icon: "🩺", name: "تشخيص تفريقي", when: "during", desc: "أثناء السؤال: يحق لكم تعطون إجابتين" },
  fifty:  { icon: "✂️", name: "حذف خيارين",    when: "during", desc: "أثناء سؤال الاختيارات: يحذف خيارين غلط" }
};

const SURPRISES = {
  emergency: { icon: "🚑", title: "حالة طارئة!",  sub: "نقاط هذا السؤال مضاعفة ×2" },
  gift:      { icon: "🎁", title: "هدية!",         sub: "النقاط لكم بدون سؤال" },
  bomb:      { icon: "💣", title: "قنبلة!",        sub: "إذا ما جاوبتوا صح تنخصم النقاط منكم" }
};

/* ═══════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════ */

let currentUser = null;
let currentGame = null;
let Q           = null;               // السؤال المفتوح حالياً

let pendingTeams     = null;          // أسماء الفريقين قبل بدء اللعب
let activeCategories = [];            // الفئات المختارة للمباراة الحالية
const selectedCats   = new Set();     // اختيار صفحة الفئات

let gameState = freshGameState([]);

function freshGameState(pool) {
  const helpers = () => ({ pit: true, double: true, diag: true, fifty: true });
  const stats   = () => ({ correct: 0, steals: 0, helpers: 0 });
  return {
    team1Score: 0, team2Score: 0, turn: 1,
    usedQuestions: [], pool,
    helpers:    { 1: helpers(), 2: helpers() },
    armed:      { pit: false, double: false },
    streak:     { 1: 0, 2: 0 },
    bestStreak: { 1: 0, 2: 0 },
    stats:      { 1: stats(), 2: stats() },
    surprises:  {},
    totalTiles: 0
  };
}

/* ═══════════════════════════════════════════════════════
   SOUND FX — كل الأصوات مولَّدة بالمتصفح (بدون ملفات)
═══════════════════════════════════════════════════════ */

const SFX = (() => {
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem("sj_muted") === "1"; } catch {}

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(c, type, f0, t0, dur, vol, f1) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, c.currentTime + t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, c.currentTime + t0 + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol, c.currentTime + t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.02);
  }
  function noise(c, t0, dur, vol, freq, q) {
    const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = "bandpass"; f.frequency.value = freq || 1200; f.Q.value = q || 0.8;
    g.gain.setValueAtTime(vol, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    s.connect(f); f.connect(g); g.connect(c.destination);
    s.start(c.currentTime + t0);
  }

  const S = {
    click:     c => tone(c, "triangle", 900, 0, 0.05, 0.08),
    tick:      c => tone(c, "square", 1400, 0, 0.04, 0.06),
    heartbeat: c => { tone(c, "sine", 70, 0, 0.12, 0.35, 45); tone(c, "sine", 62, 0.17, 0.12, 0.25, 40); },
    drumroll:  c => {
      let t = 0, gap = 0.09;
      while (t < 1.15) { noise(c, t, 0.06, 0.22, 220, 1.2); t += gap; gap = Math.max(0.035, gap * 0.92); }
      noise(c, 1.2, 0.7, 0.35, 6000, 0.6);          // صنج
      tone(c, "sine", 80, 1.2, 0.35, 0.5, 40);       // ضربة
    },
    reveal:    c => { tone(c, "sine", 300, 0, 0.35, 0.18, 1200); tone(c, "triangle", 600, 0.05, 0.35, 0.1, 1800); },
    correct:   c => [523, 659, 784, 1047].forEach((f, i) => tone(c, "triangle", f, i * 0.09, 0.32, 0.22)),
    wrong:     c => { tone(c, "sawtooth", 220, 0, 0.45, 0.16, 90); tone(c, "square", 110, 0.02, 0.45, 0.08, 60); },
    steal:     c => { for (let k = 0; k < 3; k++) { tone(c, "sawtooth", 600, k * 0.3, 0.15, 0.1, 1100); tone(c, "sawtooth", 1100, k * 0.3 + 0.15, 0.15, 0.1, 600); } },
    flatline:  c => tone(c, "sine", 1000, 0, 1.4, 0.2),
    coin:      c => { tone(c, "square", 988, 0, 0.08, 0.1); tone(c, "square", 1319, 0.08, 0.25, 0.1); },
    fire:      c => { noise(c, 0, 0.6, 0.3, 500, 0.5); tone(c, "sawtooth", 200, 0, 0.6, 0.08, 900); },
    surprise:  c => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(c, "sine", f, i * 0.06, 0.25, 0.14)),
    bomb:      c => { noise(c, 0, 0.9, 0.5, 150, 0.4); tone(c, "sine", 120, 0, 0.8, 0.5, 30); },
    win:       c => {
      [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [784, 0.7], [1047, 0.85]].forEach(([f, t]) => tone(c, "triangle", f, t, 0.35, 0.22));
      [523, 659, 784].forEach(f => tone(c, "sine", f, 1.0, 1.2, 0.12));
      noise(c, 1.0, 1.2, 0.2, 7000, 0.5);
    }
  };

  return {
    play(name) {
      if (muted || !S[name]) return;
      try { const c = ac(); if (c) S[name](c); } catch {}
    },
    toggle() {
      muted = !muted;
      try { localStorage.setItem("sj_muted", muted ? "1" : "0"); } catch {}
      return muted;
    },
    get muted() { return muted; }
  };
})();

/* ═══════════════════════════════════════════════════════
   TIMER — مع نبض قلب يتسارع
═══════════════════════════════════════════════════════ */

const CIRCUMFERENCE = 2 * Math.PI * 26;   // 163.36
const timer = { total: TIMER_SECONDS, left: TIMER_SECONDS, running: false, iv: null, beat: null };

function timerSet(total) {
  timerStop();
  timer.total = total;
  timer.left  = total;
  renderTimer();
}
function timerStart() {
  if (timer.running || timer.left <= 0) return;
  timer.running = true;
  timer.iv = setInterval(timerTick, 1000);
  heartLoop();
  renderTimer();
}
function timerStop() {
  clearInterval(timer.iv);
  clearTimeout(timer.beat);
  timer.running = false;
  renderTimer();
}
function timerTick() {
  timer.left--;
  if (timer.left > 0 && timer.left <= 5) SFX.play("tick");
  if (timer.left <= 0) {
    timer.left = 0;
    timerStop();
    SFX.play("flatline");
    onTimeUp();
    return;
  }
  renderTimer();
}
function heartLoop() {
  if (!timer.running) return;
  SFX.play("heartbeat");
  const gap = timer.left > timer.total / 2 ? 1000 : timer.left > 10 ? 700 : 420;
  timer.beat = setTimeout(heartLoop, gap);
}
function toggleTimer() {
  if (!Q || Q.phase === "done") return;
  if (timer.running) timerStop(); else timerStart();
}
function restartTimer() {
  if (!Q || Q.phase === "done") return;
  timerSet(Q.phase === "steal" ? STEAL_SECONDS : TIMER_SECONDS);
  timerStart();
}

function renderTimer() {
  const numEl = el("timerNum"), circleEl = el("timerCircle"), btn = el("btnTimerToggle");
  if (numEl) {
    numEl.textContent = timer.left;
    numEl.classList.toggle("done", timer.left === 0);
  }
  if (circleEl) {
    circleEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - timer.left / timer.total);
    circleEl.classList.remove("warning", "danger");
    if (timer.left <= 10)      circleEl.classList.add("danger");
    else if (timer.left <= 20) circleEl.classList.add("warning");
  }
  if (btn) btn.textContent = timer.running ? "⏸" : "▶";
  const ov = el("questionOverlay");
  if (ov) ov.classList.toggle("danger-on", timer.running && timer.left <= 10);
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
// تحويل أي قيمة قادمة من الشيت لنص آمن (الأرقام مثل 5 أو 206 تصير "5" و"206")
function str(v) { return v === null || v === undefined ? "" : String(v); }
function isTrue(v) { return v === true || String(v).trim().toUpperCase() === "TRUE"; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function teamName(n) {
  return n === 1 ? (currentGame?.team1 || "الفريق الأول") : (currentGame?.team2 || "الفريق الثاني");
}
function other(n) { return n === 1 ? 2 : 1; }
function fmtPts(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n); }

function toast(text, type = "") {
  const layer = el("toastLayer"); if (!layer) return;
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = text;
  layer.appendChild(t);
  setTimeout(() => t.classList.add("out"), 2400);
  setTimeout(() => t.remove(), 2900);
}

function animateNumber(node, from, to, ms = 900) {
  if (!node) return;
  const t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
    node.textContent = Math.round(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function showOverlay(id, on) {
  const o = el(id); if (!o) return;
  o.classList.toggle("show", on);
  o.setAttribute("aria-hidden", on ? "false" : "true");
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
function isApprovedStatus(s) {
  s = String(s ?? "").trim().toUpperCase();
  return s === "APPROVED" || s === "ACCEPTED" || s === "ACTIVE";
}
function isApproved(user) { return isApprovedStatus(user?.status); }
// للعرض فقط — السيرفر هو اللي يتحقق فعلياً من صلاحية المسؤول
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
    msgEl.innerHTML = `تم إنشاء الحساب ✅<br>رقمك: <strong class="big-num">${esc(num)}</strong>`;
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
  renderResumeCard();
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
  const approved = accounts.filter(a => isApprovedStatus(a.status)).length;
  const te = el("totalAccounts");    if (te) te.textContent = accounts.length;
  const pe = el("pendingAccounts");  if (pe) pe.textContent = pending;
  const ae = el("approvedAccounts"); if (ae) ae.textContent = approved;

  if (!accounts.length) { list.innerHTML = '<div class="loading-text">لا توجد حسابات</div>'; return; }
  list.innerHTML = "";

  accounts.forEach(acc => {
    const st = String(acc.status || "").toUpperCase();
    const ok = isApprovedStatus(st);
    let stTxt = "غير معروف", stCls = "s-unknown";
    if (ok)                     { stTxt = "مقبول"; stCls = "s-approved"; }
    else if (st === "PENDING")  { stTxt = "انتظار"; stCls = "s-pending"; }
    else if (st === "REJECTED") { stTxt = "مرفوض";  stCls = "s-rejected"; }
    const num = acc.accountNumber || acc.account_number || "";

    const row = document.createElement("div");
    row.className = "acc-row glass";
    row.innerHTML = `
      <div class="acc-num">${esc(num)}</div>
      <div><div class="acc-name">${esc(acc.nickname || "—")}</div><div class="acc-email">${esc(acc.email || "")}</div></div>
      <div class="acc-phone">${esc(acc.phone || "—")}</div>
      <div class="acc-status ${stCls}">${stTxt}</div>
      <div class="acc-actions">
        ${!ok ? `<button class="btn-approve" onclick="changeStatus('${escJs(num)}','APPROVED')">✓ قبول</button>` : ""}
        ${st !== "REJECTED" ? `<button class="btn-reject" onclick="changeStatus('${escJs(num)}','REJECTED')">✗ رفض</button>` : ""}
        <button class="btn-games" onclick="editGames('${escJs(num)}',${Number(acc.gamesRemaining || 0)})">🎟️ ${Number(acc.gamesRemaining || 0)}</button>
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
  if (!isAdmin()) return;
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
   صفحة اختيار الفئات
═══════════════════════════════════════════════════════ */

function goToCategories() {
  const t1 = el("team1")?.value.trim();
  const t2 = el("team2")?.value.trim();
  if (!t1 || !t2) { setMsg("gameMessage", "أدخل اسمَي الفريقين", "error"); return; }
  if (t1 === t2)  { setMsg("gameMessage", "يجب أن يكون اسم الفريقين مختلفاً", "error"); return; }
  setMsg("gameMessage", "");
  pendingTeams = { t1, t2 };

  const teamsEl = el("catsTeams");
  if (teamsEl) teamsEl.innerHTML = `<span class="tc t1">${esc(t1)}</span><b>VS</b><span class="tc t2">${esc(t2)}</span>`;
  const minEl = el("catsMin"); if (minEl) minEl.textContent = MIN_CATS;
  const maxEl = el("catsMax"); if (maxEl) maxEl.textContent = MAX_CATS;
  setMsg("categoriesMessage", "");
  renderCategoryPicker();
  showScreen("categoriesScreen");
}

function backToTeams() { showScreen("gameScreen"); }

function renderCategoryPicker() {
  const wrap = el("catsGroups"); if (!wrap) return;
  wrap.innerHTML = "";
  CATEGORY_GROUPS.forEach(g => {
    const box = document.createElement("div");
    box.className = "cats-group glass";
    const head = document.createElement("div");
    head.className = "cats-group-head";
    head.innerHTML = `<span>${esc(g.title)}</span>`;
    const all = document.createElement("button");
    all.className = "btn-link";
    all.textContent = "تحديد المجموعة";
    all.onclick = () => {
      let hit = false;
      g.cats.forEach(c => {
        if (selectedCats.has(c)) return;
        if (selectedCats.size >= MAX_CATS) { hit = true; return; }
        selectedCats.add(c);
      });
      renderCategoryPicker();
      setMsg("categoriesMessage", hit ? "الحد الأقصى " + MAX_CATS + " فئات" : "", hit ? "error" : "");
    };
    head.appendChild(all);
    box.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "cats-grid";
    g.cats.forEach(c => {
      const chip = document.createElement("button");
      chip.className = "cat-chip" + (selectedCats.has(c) ? " on" : "") + (c === FINAL_BOSS_CAT ? " boss" : "");
      chip.textContent = c;
      chip.onclick = () => toggleCat(c);
      grid.appendChild(chip);
    });
    box.appendChild(grid);
    wrap.appendChild(box);
  });
  updateCatsCount();
}

function toggleCat(c) {
  SFX.play("click");
  if (selectedCats.has(c)) {
    selectedCats.delete(c);
    setMsg("categoriesMessage", "");
  } else {
    if (selectedCats.size >= MAX_CATS) { setMsg("categoriesMessage", "الحد الأقصى " + MAX_CATS + " فئات", "error"); return; }
    selectedCats.add(c);
    setMsg("categoriesMessage", "");
  }
  renderCategoryPicker();
}
function clearCats() { selectedCats.clear(); setMsg("categoriesMessage", ""); renderCategoryPicker(); }
function pickRandomCats(n) {
  selectedCats.clear();
  shuffle(CATEGORIES).slice(0, n).forEach(c => selectedCats.add(c));
  SFX.play("surprise");
  renderCategoryPicker();
}
function updateCatsCount() {
  const c = el("catsCount"); if (c) c.textContent = selectedCats.size;
  const t = el("catsTotal"); if (t) t.textContent = MAX_CATS;
}

/* ═══════════════════════════════════════════════════════
   START GAME
   (نحمّل الأسئلة أولاً حتى لا يُخصم من رصيد اللاعب إذا فشل التحميل)
═══════════════════════════════════════════════════════ */

async function startGame() {
  if (!pendingTeams) { showScreen("gameScreen"); return; }
  const { t1, t2 } = pendingTeams;

  if (selectedCats.size < MIN_CATS) {
    setMsg("categoriesMessage", "اختر " + MIN_CATS + " فئات على الأقل", "error");
    return;
  }
  if (selectedCats.size > MAX_CATS) {
    setMsg("categoriesMessage", "الحد الأقصى " + MAX_CATS + " فئات", "error");
    return;
  }
  if (selectedCats.size % 2) {
    setMsg("categoriesMessage", "اختر عدداً زوجياً من الفئات حتى يتساوى عدد الأسئلة للفريقين", "error");
    return;
  }
  // نحافظ على ترتيب الفئات الأصلي، والـ Final Boss دائماً آخر عمود
  activeCategories = CATEGORIES.filter(c => selectedCats.has(c) && c !== FINAL_BOSS_CAT);
  if (selectedCats.has(FINAL_BOSS_CAT)) activeCategories.push(FINAL_BOSS_CAT);

  const startBtn = el("btnStartPlay");
  if (startBtn) startBtn.disabled = true;

  setMsg("categoriesMessage", "جاري تحميل الأسئلة…");
  const qResult = await apiRequest({ action: "getAllQuestions" });
  if (!qResult?.success || !Array.isArray(qResult.questions) || !qResult.questions.length) {
    setMsg("categoriesMessage", qResult?.message || "لا توجد أسئلة حالياً، تواصل مع المسؤول", "error");
    if (startBtn) startBtn.disabled = false;
    return;
  }
  const pool = qResult.questions;

  if (!isAdmin()) {
    setMsg("categoriesMessage", "جاري التحقق…");
    const result = await apiRequest({ action: "createGame", team1: t1, team2: t2 });
    if (!result?.success) {
      setMsg("categoriesMessage", result?.message || "تعذّر البدء", "error");
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
  setMsg("categoriesMessage", "");

  gameState = freshGameState(pool);
  gameState.totalTiles = activeCategories.length * POINTS.length;
  gameState.surprises  = placeSurprises();
  Q = null;

  enterBoard();
  saveGame();
  SFX.play("win");
  toast("🚀 يلا! " + t1 + " يبدأ", "info");
}

// مفاجآت مخفية: 1 أو 2 حسب حجم اللوحة (مو في Final Boss)
function placeSurprises() {
  const keys = [];
  activeCategories.forEach((c, ci) => {
    if (c === FINAL_BOSS_CAT) return;
    POINTS.forEach((_, pi) => keys.push(ci + "-" + pi));
  });
  const count = gameState.totalTiles >= 30 ? 2 : 1;
  const types = shuffle(Object.keys(SURPRISES)).slice(0, count);
  const out = {};
  shuffle(keys).slice(0, count).forEach((k, i) => { out[k] = types[i]; });
  return out;
}

function enterBoard() {
  const bt1 = el("bTeam1"); if (bt1) bt1.textContent = currentGame.team1;
  const bt2 = el("bTeam2"); if (bt2) bt2.textContent = currentGame.team2;
  const s1 = el("score1"); if (s1) s1.textContent = gameState.team1Score;
  const s2 = el("score2"); if (s2) s2.textContent = gameState.team2Score;
  updateMuteBtn();
  updateScoreboard(false);
  buildBoard();
  // حركة دخول الأعمدة مرة وحدة بس (مو كل ما تنبني اللوحة)
  const board = el("categoryBoard");
  board.classList.add("intro");
  setTimeout(() => board.classList.remove("intro"), 1500);
  showScreen("boardScreen");
}

/* ═══════════════════════════════════════════════════════
   BOARD
═══════════════════════════════════════════════════════ */

function tilesLeft() { return gameState.totalTiles - gameState.usedQuestions.length; }
// الخانات العادية المتبقية (بدون Final Boss) — هي اللي تحدد الجولة الحاسمة
function normalTilesLeft() {
  let n = 0;
  activeCategories.forEach((c, ci) => {
    if (c === FINAL_BOSS_CAT) return;
    POINTS.forEach((_, pi) => { if (!gameState.usedQuestions.includes(ci + "-" + pi)) n++; });
  });
  return n;
}

function buildBoard() {
  const board = el("categoryBoard"); if (!board) return;
  board.innerHTML = "";
  const n = activeCategories.length;
  board.style.setProperty("--cols", n <= 6 ? n : Math.ceil(n / 2));
  const finalRound = normalTilesLeft() <= FINAL_ROUND_TILES;

  activeCategories.forEach((cat, ci) => {
    const col = document.createElement("div");
    col.className = "cat-col" + (cat === FINAL_BOSS_CAT ? " boss-col" : "");
    col.style.setProperty("--i", ci);

    const title = document.createElement("div");
    title.className   = "cat-title";
    title.textContent = cat;
    col.appendChild(title);

    POINTS.forEach((pts, pi) => {
      const btn = document.createElement("button");
      btn.className   = `pts-btn ${TIER_CLASSES[pi]}`;
      btn.innerHTML   = `<span>${pts}</span>`;
      const key = ci + "-" + pi;
      if (gameState.usedQuestions.includes(key)) { btn.classList.add("used"); btn.disabled = true; }
      else {
        if (finalRound && cat !== FINAL_BOSS_CAT) btn.classList.add("hot");
        btn.onclick = () => openTile(ci, pi, btn);
      }
      col.appendChild(btn);
    });

    board.appendChild(col);
  });

  const tl = el("tilesLeft"); if (tl) tl.textContent = tilesLeft();
  const fb = el("finalRoundBanner");
  if (fb) fb.style.display = finalRound && normalTilesLeft() > 0 ? "block" : "none";
}

/* ═══════════════════════════════════════════════════════
   وسائل المساعدة
═══════════════════════════════════════════════════════ */

function renderHelpers() {
  [1, 2].forEach(team => {
    const wrap = el("helpers" + team); if (!wrap) return;
    wrap.innerHTML = "";
    Object.entries(HELPERS).forEach(([key, h]) => {
      const b = document.createElement("button");
      const available = gameState.helpers[team][key];
      const armed = team === gameState.turn && gameState.armed[key];
      b.className = "helper-btn" + (available ? "" : " spent") + (armed ? " armed" : "");
      b.innerHTML = `<span class="h-ico">${h.icon}</span><span class="h-name">${h.name}</span>`;
      b.title = h.name + " — " + h.desc;
      const canArm = h.when === "before" && team === gameState.turn && !Q && (available || armed);
      b.disabled = !canArm;
      if (canArm) b.onclick = () => armHelper(team, key);
      wrap.appendChild(b);
    });
  });

  const bar = el("armedBar");
  if (bar) {
    const on = Object.keys(gameState.armed).filter(k => gameState.armed[k]);
    bar.style.display = on.length ? "block" : "none";
    bar.innerHTML = on.length
      ? `<b>${esc(teamName(gameState.turn))}</b> فعّل: ${on.map(k => HELPERS[k].icon + " " + HELPERS[k].name).join(" + ")} — اختاروا السؤال!`
      : "";
  }
}

function armHelper(team, key) {
  if (Q || team !== gameState.turn) return;
  if (gameState.armed[key]) {
    gameState.armed[key] = false;          // تراجع قبل فتح السؤال
    gameState.helpers[team][key] = true;
  } else {
    if (!gameState.helpers[team][key]) return;
    gameState.armed[key] = true;
    gameState.helpers[team][key] = false;
    SFX.play("fire");
    toast(HELPERS[key].icon + " " + teamName(team) + " فعّل " + HELPERS[key].name, "gold");
  }
  renderHelpers();
  saveGame();
}

function refundArmed(team, armed) {
  Object.keys(armed).forEach(k => { if (armed[k]) gameState.helpers[team][k] = true; });
}

function renderQHelpers() {
  const wrap = el("qHelpers"); if (!wrap) return;
  wrap.innerHTML = "";
  if (!Q || Q.isBoss || Q.phase !== "main") return;
  const team = Q.owner;
  ["diag", "fifty"].forEach(key => {
    const h = HELPERS[key];
    if (key === "fifty" && !Q.hasChoices) return;
    const b = document.createElement("button");
    const available = gameState.helpers[team][key];
    const used = Q[key];
    b.className = "helper-btn big t" + team + (used ? " armed" : available ? "" : " spent");
    b.innerHTML = `<span class="h-ico">${h.icon}</span><span class="h-name">${h.name}</span>`;
    b.title = h.desc;
    b.disabled = !available || used;
    b.onclick = () => useQHelper(key);
    wrap.appendChild(b);
  });
}

function useQHelper(key) {
  if (!Q || Q.phase !== "main" || Q[key] || !gameState.helpers[Q.owner][key]) return;
  gameState.helpers[Q.owner][key] = false;
  gameState.stats[Q.owner].helpers++;
  Q[key] = true;
  SFX.play("fire");
  if (key === "fifty") {
    const wrong = ["A", "B", "C", "D"].filter(l => l !== Q.answer && Q["choice" + l] && !Q.gone.includes(l));
    shuffle(wrong).slice(0, 2).forEach(l => Q.gone.push(l));
    applyChoiceStates();
    toast("✂️ انحذف خياران", "gold");
  } else {
    toast("🩺 " + teamName(Q.owner) + ": يحق لكم إجابتين", "gold");
  }
  renderBadges();
  renderQHelpers();
  saveGame();
}

/* ═══════════════════════════════════════════════════════
   فتح سؤال
═══════════════════════════════════════════════════════ */

function playedKey() { return "sj_played_" + (currentUser?.accountNumber || "guest"); }
function getPlayed() {
  try { return new Set(JSON.parse(localStorage.getItem(playedKey()) || "[]")); } catch { return new Set(); }
}
function markPlayed(id) {
  if (!id) return;
  try {
    const arr = [...getPlayed()].filter(x => x !== id);
    arr.push(id);
    localStorage.setItem(playedKey(), JSON.stringify(arr.slice(-3000)));
  } catch {}
}

// يسحب سؤال عشوائي للفئة والنقاط — ويفضّل الأسئلة اللي ما انلعبت قبل على هذا الحساب
function drawQuestion(cat, pts) {
  const matches = gameState.pool.filter(q => String(q.category || "").trim() === cat && Number(q.points) === pts);
  if (!matches.length) return null;
  const played = getPlayed();
  const fresh = matches.filter(q => !played.has(String(q.id)));
  const list = fresh.length ? fresh : matches;
  const picked = list[Math.floor(Math.random() * list.length)];
  gameState.pool.splice(gameState.pool.indexOf(picked), 1);
  markPlayed(String(picked.id || ""));
  return picked;
}

function openTile(ci, pi, btn) {
  const key = ci + "-" + pi;
  if (Q || gameState.usedQuestions.includes(key)) return;

  const cat    = activeCategories[ci];
  const pts    = POINTS[pi];
  const owner  = gameState.turn;
  const isBoss = cat === FINAL_BOSS_CAT;
  const finalRound = !isBoss && normalTilesLeft() <= FINAL_ROUND_TILES;
  const surprise   = isBoss ? null : (gameState.surprises[key] || null);

  btn.classList.add("flipping");
  gameState.usedQuestions.push(key);

  const armed = { ...gameState.armed };
  gameState.armed = { pit: false, double: false };
  if (isBoss || surprise === "gift") refundArmed(owner, armed);
  else Object.keys(armed).forEach(k => { if (armed[k]) gameState.stats[owner].helpers++; });

  const picked = surprise === "gift" ? null : drawQuestion(cat, pts);
  const base = picked ? {
    id:         picked.id,
    text:       picked.question || "—",
    answer:     str(picked.answer) || "—",
    imageUrl:   str(picked.imageUrl || picked.image_url),
    audioUrl:   str(picked.audioUrl || picked.audio_url),
    videoUrl:   str(picked.videoUrl || picked.video_url),
    hasChoices: isTrue(picked.hasChoices ?? picked.has_choices),
    choiceA:    str(picked.choiceA ?? picked.choice_a),
    choiceB:    str(picked.choiceB ?? picked.choice_b),
    choiceC:    str(picked.choiceC ?? picked.choice_c),
    choiceD:    str(picked.choiceD ?? picked.choice_d)
  } : {
    id: null,
    text:       `[ سؤال ${cat} — ${pts} نقطة ] — لم يُضَف بعد`,
    answer:     "الإجابة غير مضافة",
    imageUrl: "", audioUrl: "", videoUrl: "",
    hasChoices: false, choiceA: "", choiceB: "", choiceC: "", choiceD: ""
  };
  if (base.hasChoices) {
    base.answer = base.answer.trim().toUpperCase();
    // سؤال اختيارات بدون حرف صحيح أو بخيار ناقص → نعامله كسؤال مفتوح
    const letters = ["A", "B", "C", "D"].filter(l => base["choice" + l]);
    if (!letters.includes(base.answer) || letters.length < 2) base.hasChoices = false;
  }

  Q = {
    ...base, key, category: cat, points: pts, owner,
    isBoss, finalRound, surprise,
    armed: isBoss || surprise === "gift" ? { pit: false, double: false } : armed,
    mult: (surprise === "emergency" ? 2 : 1) * (finalRound ? 2 : 1),
    phase: "splash", answerShown: false,
    diag: false, fifty: false, picks: [], gone: [], wrongPicks: [],
    bets: null, bossJudge: { 1: false, 2: false }, deltas: null
  };

  renderHelpers();
  saveGame();
  playSplash();
}

function playSplash() {
  const q = Q;
  const sur = q.surprise ? SURPRISES[q.surprise] : null;
  el("splashTag").textContent  = sur ? sur.icon + " " + sur.title : q.isBoss ? "👑 السؤال الأخير" : "دور " + teamName(q.owner);
  el("splashCat").textContent  = sur ? sur.sub : q.category;
  el("splashPts").textContent  = (q.points * q.mult) + " نقطة";
  el("splashBadges").innerHTML = badgesHtml(q);
  const splash = el("qSplash");
  splash.className = "q-splash show" + (sur ? " surprise s-" + q.surprise : "") + (q.isBoss ? " boss" : "") + " team-" + q.owner;
  el("qCard").classList.remove("show");
  showOverlay("questionOverlay", true);
  el("questionOverlay").className = "overlay q-overlay show team-" + q.owner;

  SFX.play(sur ? (q.surprise === "bomb" ? "bomb" : "surprise") : "drumroll");

  setTimeout(() => {
    if (Q !== q) return;
    splash.classList.remove("show");
    if (q.surprise === "gift") { finishGift(); return; }
    if (q.isBoss) { openBets(); return; }
    q.phase = "main";
    showQuestionCard();
    timerSet(TIMER_SECONDS);
    timerStart();
    saveGame();
  }, sur ? 2000 : 1600);
}

function badgesHtml(q) {
  const b = [];
  if (q.finalRound)            b.push('<span class="badge hot">🔥 الجولة الحاسمة ×2</span>');
  if (q.surprise === "emergency") b.push('<span class="badge red">🚑 طارئة ×2</span>');
  if (q.surprise === "bomb")   b.push('<span class="badge red">💣 قنبلة</span>');
  if (q.armed?.pit)            b.push('<span class="badge gold">🕳️ حفرة</span>');
  if (q.armed?.double)         b.push('<span class="badge gold">2× دبل</span>');
  if (q.diag)                  b.push('<span class="badge cyan">🩺 إجابتين</span>');
  if (q.fifty)                 b.push('<span class="badge cyan">✂️ حذف خيارين</span>');
  if (q.bets)                  b.push('<span class="badge gold">👑 رهان</span>');
  return b.join("");
}
function renderBadges() { const b = el("qBadges"); if (b && Q) b.innerHTML = badgesHtml(Q); }

/* ═══════════════════════════════════════════════════════
   QUESTION CARD
═══════════════════════════════════════════════════════ */

// إيقاف أي صوت أو فيديو شغّال وتفريغ منطقة الميديا
function clearMedia() {
  const media = el("qMediaWrap");
  if (!media) return;
  media.querySelectorAll("audio,video").forEach(m => { try { m.pause(); } catch {} });
  media.innerHTML = "";
  media.style.display = "none";
}

// نص الإجابة الصحيحة: لو السؤال بخيارات نعرض الحرف مع نص الخيار
function answerDisplay(q) {
  if (q.hasChoices) {
    const txt = q["choice" + q.answer];
    if (txt) return q.answer + " — " + txt;
  }
  return q.answer;
}

// روابط Google Drive و YouTube تنعرض داخل iframe (أضمن من <video> لروابط Drive)
function embedUrl(ref) {
  const r = String(ref || "");
  const d = r.match(/drive\.google\.com\/file\/d\/([^/?#]+)/) || r.match(/drive\.google\.com\/(?:open|uc)\?[^#]*id=([^&#]+)/);
  if (d) return "https://drive.google.com/file/d/" + d[1] + "/preview";
  const y = r.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (y) return "https://www.youtube.com/embed/" + y[1];
  return "";
}
function makeFrame(url, cls) {
  const f = document.createElement("iframe");
  f.src = url; f.className = cls || "";
  f.allow = "autoplay; fullscreen"; f.setAttribute("allowfullscreen", "");
  return f;
}

function renderMedia(q) {
  const media = el("qMediaWrap");
  clearMedia();
  if (!media) return;
  const resolve = (ref, kind) =>
    (typeof window.resolveMediaUrl === "function") ? window.resolveMediaUrl(ref, kind) : ref;

  if (q.imageUrl) {
    const src = resolve(q.imageUrl, "image");
    if (src) {
      const img = document.createElement("img");
      img.alt = "صورة السؤال";
      img.src = src;
      img.onerror = () => { img.replaceWith(Object.assign(document.createElement("div"),
        { className: "media-error", textContent: "تعذّر تحميل الصورة" })); };
      media.appendChild(img);
    }
  }
  if (q.audioUrl) {
    const emb = embedUrl(q.audioUrl);
    const src = emb ? "" : resolve(q.audioUrl, "audio");
    if (emb) media.appendChild(makeFrame(emb, "frame-audio"));
    else if (src) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.preload  = "auto";
      audio.src = src;
      media.appendChild(audio);
    }
  }
  if (q.videoUrl) {
    const emb = embedUrl(q.videoUrl);
    const src = emb ? "" : resolve(q.videoUrl, "video");
    if (emb) media.appendChild(makeFrame(emb, "frame-video"));
    else if (src) {
      const video = document.createElement("video");
      video.controls = true;
      video.setAttribute("playsinline", "");
      video.src = src;
      media.appendChild(video);
    }
  }
  media.style.display = media.children.length ? "block" : "none";
}

function showQuestionCard() {
  const q = Q;
  el("qCategory").textContent = q.category;
  el("qPoints").textContent   = q.isBoss ? "رهان" : (q.points * q.mult) + " نقطة";
  el("qText").textContent     = q.text;
  el("answerText").textContent = answerDisplay(q);
  el("answerArea").style.display = q.answerShown ? "block" : "none";
  el("resultArea").style.display = "none";
  renderBadges();
  renderMedia(q);

  const choices = el("choicesArea");
  if (q.hasChoices) {
    ["A", "B", "C", "D"].forEach(l => {
      const b = el("choice" + l);
      b.textContent = q["choice" + l] ? l + " — " + q["choice" + l] : "";
      b.style.display = q["choice" + l] ? "" : "none";
    });
    choices.style.display = "grid";
    applyChoiceStates();
  } else {
    choices.style.display = "none";
  }

  const card = el("qCard");
  card.classList.remove("show", "shake");
  void card.offsetWidth;
  card.classList.add("show");
  card.scrollTop = 0;
  renderPhase();
}

function applyChoiceStates() {
  if (!Q || !Q.hasChoices) return;
  const active = Q.phase === "main" || Q.phase === "steal";
  ["A", "B", "C", "D"].forEach(l => {
    const b = el("choice" + l);
    b.className = "choice-btn";
    if (Q.gone.includes(l))       b.classList.add("gone");
    if (Q.wrongPicks.includes(l)) b.classList.add("wrong");
    if (Q.picks.includes(l) && !Q.wrongPicks.includes(l)) b.classList.add("picked");
    if (Q.answerShown && l === Q.answer) b.classList.add("correct");
    b.disabled = !active || Q.isBoss || Q.gone.includes(l) || Q.wrongPicks.includes(l);
  });
}

function renderPhase() {
  const q = Q; if (!q) return;
  const banner = el("phaseBanner");
  const ov = el("questionOverlay");
  let who = q.owner, text = "";
  if (q.isBoss) text = "👑 الفريقين يجاوبون — كل واحد على ورقة";
  else if (q.phase === "main")  text = "🎯 دور " + teamName(q.owner);
  else if (q.phase === "steal") { who = other(q.owner); text = "⚡ فرصة سرقة لـ " + teamName(who); }
  else if (q.phase === "judge") text = "⚖️ منو جاوب صح؟";
  else if (q.phase === "done")  text = "";
  banner.textContent = text;
  banner.className = "phase-banner" + (text ? " show" : "") + " team-" + who + (q.phase === "steal" ? " steal" : "");
  ov.classList.remove("team-1", "team-2");
  ov.classList.add("team-" + who);
  applyChoiceStates();
  renderQHelpers();
  renderControls();
}

function btnHtml(label, fn, cls = "", key = "") {
  return `<button class="ctrl-btn ${cls}" onclick="${fn}">${label}${key ? `<kbd>${key}</kbd>` : ""}</button>`;
}

function renderControls() {
  const box = el("qControls"); if (!box || !Q) return;
  const q = Q, o = q.owner, s = other(q.owner);
  let h = "";

  if (q.isBoss) {
    if (!q.answerShown) h = btnHtml("👁 كشف الإجابة", "revealAnswer()", "primary", "Enter");
    else {
      h = [1, 2].map(t => `<button class="judge-toggle t${t} ${q.bossJudge[t] ? "ok" : "no"}" onclick="toggleBossJudge(${t})">
            <span>${esc(teamName(t))}</span><b>${q.bossJudge[t] ? "✅ صح" : "❌ غلط"}</b><small>${q.bets[t]}</small></button>`).join("")
        + btnHtml("اعتماد النتيجة ✓", "finishBoss()", "primary", "Enter");
    }
  } else if (q.phase === "main" || q.phase === "steal") {
    h = btnHtml("👁 كشف الإجابة", "revealAnswer()", "primary", "Enter");
    if (q.phase === "main") h += btnHtml("❌ غلط ← سرقة", "startSteal()", "danger", "S");
    else h += btnHtml("✕ ما أحد عرف", "finish(0)", "ghost", "0");
  } else if (q.phase === "judge") {
    h = btnHtml("✅ " + esc(teamName(o)) + " صح", `finish(${o})`, "team t" + o, String(o))
      + btnHtml("⚡ " + esc(teamName(s)) + " سرقها", `finish(${s})`, "team t" + s, String(s))
      + btnHtml("✕ لا أحد", "finish(0)", "ghost", "0");
  } else if (q.phase === "done") {
    h = btnHtml("التالي ←", "closeQuestion()", "primary big", "Enter");
  }
  box.innerHTML = h;
}

/* ═══════════════════════════════════════════════════════
   مجريات السؤال
═══════════════════════════════════════════════════════ */

function selectChoice(letter) {
  const q = Q;
  if (!q || !q.hasChoices || q.isBoss || !(q.phase === "main" || q.phase === "steal")) return;
  if (q.gone.includes(letter) || q.wrongPicks.includes(letter) || q.picks.includes(letter)) return;
  const team = q.phase === "main" ? q.owner : other(q.owner);
  q.picks.push(letter);

  if (letter === q.answer) { finish(team); return; }

  q.wrongPicks.push(letter);
  SFX.play("wrong");
  shakeCard();
  // تشخيص تفريقي: الفريق صاحب الدور يحق له اختيار ثاني
  if (q.phase === "main" && q.diag && q.wrongPicks.length < 2) {
    toast("🩺 عندكم محاولة ثانية", "gold");
    applyChoiceStates();
    saveGame();
    return;
  }
  if (q.phase === "main") startSteal();
  else finish(0);
}

function startSteal() {
  const q = Q;
  if (!q || q.phase !== "main" || q.isBoss) return;
  const left = q.hasChoices ? ["A", "B", "C", "D"].filter(l => q["choice" + l] && !q.gone.includes(l) && !q.wrongPicks.includes(l)) : [1];
  if (left.length <= 1 && q.hasChoices) { finish(0); return; }   // ما بقى شي يتسرق
  q.phase = "steal";
  SFX.play("steal");
  shakeCard();
  timerSet(STEAL_SECONDS);
  timerStart();
  renderPhase();
  saveGame();
}

function onTimeUp() {
  const q = Q;
  if (!q) return;
  if (q.isBoss) { if (!q.answerShown) revealAnswer(); return; }
  if (q.phase === "main") { startSteal(); return; }
  if (q.phase === "steal") {
    if (q.hasChoices) finish(0);
    else revealAnswer();
  }
}

function revealAnswer() {
  const q = Q;
  if (!q || q.answerShown || q.phase === "done") return;
  timerStop();
  q.answerShown = true;
  SFX.play("reveal");
  const a = el("answerArea");
  a.style.display = "block";
  a.classList.remove("pop"); void a.offsetWidth; a.classList.add("pop");
  if (!q.isBoss) q.phase = "judge";
  renderPhase();
  a.scrollIntoView({ behavior: "smooth", block: "nearest" });
  saveGame();
}

function shakeCard() {
  const c = el("qCard");
  c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake");
}

// حساب النقاط: winner = الفريق اللي جاوب صح (1 أو 2) أو 0 لا أحد
function computeDeltas(q, winner) {
  const d = { 1: 0, 2: 0 }, notes = [];
  const base = q.points * q.mult;
  const o = q.owner, s = other(o);
  const fireBonus = t => gameState.streak[t] >= FIRE_STREAK ? FIRE_BONUS : 0;

  if (winner === o) {
    d[o] += base * (q.armed.double ? 2 : 1);
    if (q.armed.double) notes.push("2× دبل");
    if (q.armed.pit) { d[s] -= base; notes.push("🕳️ الحفرة على " + teamName(s)); }
    if (fireBonus(o)) { d[o] += FIRE_BONUS; notes.push("🔥 +" + FIRE_BONUS); }
  } else {
    if (winner === s) {
      d[s] += base;
      notes.push("⚡ سرقة");
      if (fireBonus(s)) { d[s] += FIRE_BONUS; notes.push("🔥 +" + FIRE_BONUS); }
    }
    if (q.armed.double)       { d[o] -= base; notes.push("2× الدبل خسر"); }
    if (q.surprise === "bomb") { d[o] -= base; notes.push("💣 انفجرت القنبلة"); }
  }
  return { d, notes };
}

// السلسلة تنكسر فقط إذا الفريق فشل في سؤاله هو (مو لما الخصم يجاوب سؤاله صح)
function applyStreak(winner, owner) {
  if (winner) {
    gameState.streak[winner]++;
    gameState.bestStreak[winner] = Math.max(gameState.bestStreak[winner], gameState.streak[winner]);
  }
  if (winner !== owner) gameState.streak[owner] = 0;
  if (winner && gameState.streak[winner] === FIRE_STREAK) {
    setTimeout(() => { SFX.play("fire"); toast("🔥 " + teamName(winner) + " On Fire! +" + FIRE_BONUS + " على كل إجابة صح", "fire"); }, 700);
  }
}

function finish(winner) {
  const q = Q;
  if (!q || q.isBoss || q.phase === "done" || q.phase === "splash") return;
  timerStop();
  const { d, notes } = computeDeltas(q, winner);
  gameState.team1Score += d[1];
  gameState.team2Score += d[2];
  if (winner) {
    gameState.stats[winner].correct++;
    if (winner !== q.owner) gameState.stats[winner].steals++;
  }
  applyStreak(winner, q.owner);
  q.deltas = d;
  q.answerShown = true;
  q.phase = "done";

  el("answerArea").style.display = "block";
  showResult(winner, d, notes);
  renderPhase();
  sendAnswerLog(q, winner);
  saveGame();
}

function showResult(winner, d, notes) {
  const r = el("resultArea");
  const title = winner ? "✅ " + teamName(winner) + (winner !== Q.owner ? " سرقها!" : " جاوب صح!") : "✕ ما أحد جاوب صح";
  const chips = [1, 2].filter(t => d[t]).map(t =>
    `<span class="delta-chip t${t} ${d[t] < 0 ? "neg" : ""}">${esc(teamName(t))} ${fmtPts(d[t])}</span>`).join("");
  r.innerHTML = `<div class="result-title ${winner ? "win t" + winner : "none"}">${title}</div>
                 <div class="result-chips">${chips}</div>
                 ${notes.length ? `<div class="result-notes">${notes.map(esc).join(" · ")}</div>` : ""}`;
  r.style.display = "block";
  r.classList.remove("pop"); void r.offsetWidth; r.classList.add("pop");
  if (winner) { SFX.play("correct"); setTimeout(() => SFX.play("coin"), 350); burstConfetti(40); }
  else SFX.play("wrong");
  if (d[1] < 0 || d[2] < 0) setTimeout(() => SFX.play("bomb"), 250);
  r.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function finishGift() {
  const q = Q;
  const d = { 1: 0, 2: 0 };
  d[q.owner] = q.points * q.mult;
  gameState.team1Score += d[1];
  gameState.team2Score += d[2];
  q.deltas = d;
  q.phase = "done";
  toast("🎁 " + teamName(q.owner) + " " + fmtPts(d[q.owner]), "gold");
  burstConfetti(60);
  SFX.play("coin");
  closeQuestion();
}

function sendAnswerLog(q, winner) {
  if (!currentGame?.gameId) return;
  apiRequest({
    action: "submitAnswer",
    gameId: currentGame.gameId,
    team1: currentGame.team1, team2: currentGame.team2,
    category: q.category,
    questionId: q.id || "", question: q.text || "", points: q.points || 0,
    team: winner === 1 ? currentGame.team1 : winner === 2 ? currentGame.team2 : "",
    correct: winner === 1 || winner === 2
  }, true).catch(() => {});
}

function closeQuestion() {
  const q = Q;
  if (!q || q.phase !== "done") return;
  timerStop();
  clearMedia();
  showOverlay("questionOverlay", false);
  el("questionOverlay").classList.remove("danger-on");
  el("qCard").classList.remove("show");

  const prev = { 1: gameState.team1Score - (q.deltas?.[1] || 0), 2: gameState.team2Score - (q.deltas?.[2] || 0) };
  Q = null;
  gameState.turn = other(gameState.turn);
  updateScoreboard(true, prev, q.deltas);
  buildBoard();
  saveGame();

  if (tilesLeft() <= 0) { setTimeout(showWinner, 1300); return; }
  if (!q.isBoss && normalTilesLeft() === FINAL_ROUND_TILES) {
    setTimeout(() => { SFX.play("fire"); toast("🔥 الجولة الحاسمة بدأت — كل النقاط ×2!", "fire"); }, 600);
  }
}

/* ═══════════════════════════════════════════════════════
   FINAL BOSS — الرهان
═══════════════════════════════════════════════════════ */

function betMax(team) {
  const s = team === 1 ? gameState.team1Score : gameState.team2Score;
  return Math.max(s, Q?.points || 0);
}

function openBets() {
  [1, 2].forEach(t => {
    el("betLabel" + t).textContent = teamName(t);
    el("betMax" + t).textContent = "الحد الأقصى: " + betMax(t);
    const i = el("bet" + t); i.value = ""; i.type = "password"; i.disabled = false;
  });
  el("betReveal").style.display = "none";
  el("btnBetConfirm").style.display = "";
  setMsg("betMessage", "");
  showOverlay("betOverlay", true);
  setTimeout(() => el("bet1")?.focus(), 200);
}

function confirmBets() {
  const q = Q; if (!q || !q.isBoss) return;
  const bets = {};
  for (const t of [1, 2]) {
    const v = parseInt(el("bet" + t).value, 10);
    if (isNaN(v) || v < 0 || v > betMax(t)) {
      setMsg("betMessage", "رهان " + teamName(t) + " لازم يكون بين 0 و " + betMax(t), "error");
      return;
    }
    bets[t] = v;
  }
  q.bets = bets;
  el("btnBetConfirm").style.display = "none";
  [1, 2].forEach(t => { el("bet" + t).disabled = true; });
  const rv = el("betReveal");
  rv.innerHTML = [1, 2].map(t => `<div class="bet-show t${t}"><span>${esc(teamName(t))}</span><strong id="betShow${t}">0</strong></div>`).join("");
  rv.style.display = "flex";
  SFX.play("drumroll");
  setTimeout(() => { animateNumber(el("betShow1"), 0, bets[1], 900); animateNumber(el("betShow2"), 0, bets[2], 900); }, 300);
  setTimeout(() => {
    if (Q !== q) return;
    showOverlay("betOverlay", false);
    q.phase = "main";
    showQuestionCard();
    timerSet(TIMER_SECONDS);
    timerStart();
    saveGame();
  }, 2600);
  saveGame();
}

function toggleBossJudge(t) {
  if (!Q?.isBoss || !Q.answerShown || Q.phase === "done") return;
  Q.bossJudge[t] = !Q.bossJudge[t];
  SFX.play("click");
  renderControls();
}

function finishBoss() {
  const q = Q;
  if (!q || !q.isBoss || !q.answerShown || q.phase === "done") return;
  timerStop();
  const d = { 1: 0, 2: 0 };
  [1, 2].forEach(t => {
    d[t] = q.bossJudge[t] ? q.bets[t] : -q.bets[t];
    if (q.bossJudge[t]) gameState.stats[t].correct++;
  });
  gameState.team1Score += d[1];
  gameState.team2Score += d[2];
  [1, 2].forEach(t => {
    if (q.bossJudge[t]) { gameState.streak[t]++; gameState.bestStreak[t] = Math.max(gameState.bestStreak[t], gameState.streak[t]); }
    else gameState.streak[t] = 0;
  });
  q.deltas = d;
  q.phase = "done";
  const winner = q.bossJudge[1] && !q.bossJudge[2] ? 1 : q.bossJudge[2] && !q.bossJudge[1] ? 2 : 0;
  const r = el("resultArea");
  r.innerHTML = `<div class="result-title ${winner ? "win t" + winner : "none"}">👑 نتيجة الرهان</div>
    <div class="result-chips">${[1, 2].map(t => `<span class="delta-chip t${t} ${d[t] < 0 ? "neg" : ""}">${esc(teamName(t))} ${fmtPts(d[t])}</span>`).join("")}</div>`;
  r.style.display = "block";
  r.classList.remove("pop"); void r.offsetWidth; r.classList.add("pop");
  SFX.play(q.bossJudge[1] || q.bossJudge[2] ? "correct" : "wrong");
  renderPhase();
  sendAnswerLog(q, winner);
  saveGame();
}

/* ═══════════════════════════════════════════════════════
   SCOREBOARD
═══════════════════════════════════════════════════════ */

function updateScoreboard(animate = false, prev = null, deltas = null) {
  const turn = el("currentTurn"), c1 = el("team1Card"), c2 = el("team2Card");
  [1, 2].forEach(t => {
    const node = el("score" + t), val = t === 1 ? gameState.team1Score : gameState.team2Score;
    if (!node) return;
    if (animate && prev && prev[t] !== val) animateNumber(node, prev[t], val);
    else node.textContent = val;
    node.classList.toggle("neg", val < 0);
    if (animate && deltas && deltas[t]) floatDelta(t, deltas[t]);
    const fire = el("fire" + t);
    if (fire) fire.classList.toggle("show", gameState.streak[t] >= FIRE_STREAK);
  });
  if (turn) {
    turn.textContent = teamName(gameState.turn);
    turn.className = "t" + gameState.turn;
  }
  if (c1) c1.classList.toggle("active-team", gameState.turn === 1);
  if (c2) c2.classList.toggle("active-team", gameState.turn === 2);
  const lead = gameState.team1Score === gameState.team2Score ? 0 : gameState.team1Score > gameState.team2Score ? 1 : 2;
  if (c1) c1.classList.toggle("leading", lead === 1);
  if (c2) c2.classList.toggle("leading", lead === 2);
  renderHelpers();
}

function floatDelta(team, val) {
  const layer = el("delta" + team); if (!layer) return;
  const f = document.createElement("div");
  f.className = "float-delta" + (val < 0 ? " neg" : "");
  f.textContent = fmtPts(val);
  layer.appendChild(f);
  setTimeout(() => f.remove(), 1800);
}

function swapTurn() {
  if (Q) return;
  refundArmed(gameState.turn, gameState.armed);
  gameState.armed = { pit: false, double: false };
  gameState.turn = other(gameState.turn);
  SFX.play("click");
  updateScoreboard();
  saveGame();
}

/* ═══════════════════════════════════════════════════════
   نهاية المباراة
═══════════════════════════════════════════════════════ */

function confirmEndGame() {
  if (Q) return;
  if (!confirm("إنهاء المباراة الآن وإعلان النتيجة؟")) return;
  showWinner();
}

function showWinner() {
  const s1 = gameState.team1Score, s2 = gameState.team2Score;
  const w = s1 === s2 ? 0 : s1 > s2 ? 1 : 2;
  el("winnerSub").textContent  = w ? "🏆 الفائز" : "🤝 النتيجة";
  el("winnerName").textContent = w ? teamName(w) : "تعادل!";
  el("winnerName").className   = "winner-name" + (w ? " t" + w : "");
  el("wTeam1").textContent = teamName(1);
  el("wTeam2").textContent = teamName(2);
  const st = gameState.stats;
  const row = (label, k) => `<div class="ws-row"><b>${st[1][k]}</b><span>${label}</span><b>${st[2][k]}</b></div>`;
  el("winnerStats").innerHTML =
    row("✅ إجابات صحيحة", "correct") + row("⚡ سرقات", "steals") + row("🛟 وسائل مستخدمة", "helpers") +
    `<div class="ws-row"><b>${gameState.bestStreak[1]}</b><span>🔥 أطول سلسلة</span><b>${gameState.bestStreak[2]}</b></div>`;
  showOverlay("winnerOverlay", true);
  el("winnerOverlay").querySelector(".winner-card").className = "winner-card glass" + (w ? " w" + w : "");
  animateNumber(el("wScore1"), 0, s1, 1400);
  animateNumber(el("wScore2"), 0, s2, 1400);
  SFX.play("win");
  startConfetti(w);

  if (currentGame?.gameId) {
    apiRequest({ action: "finishGame", gameId: currentGame.gameId, team1Score: s1, team2Score: s2,
                 winner: w ? teamName(w) : "" }, true).catch(() => {});
  }
  clearSavedGame();
}

function playAgain() {
  closeWinner();
  if (currentGame) {
    const t1 = el("team1"), t2 = el("team2");
    if (t1) t1.value = currentGame.team1;
    if (t2) t2.value = currentGame.team2;
  }
}
function closeWinner() {
  stopConfetti();
  showOverlay("winnerOverlay", false);
  backToSetup();
}

/* ═══════════════════════════════════════════════════════
   CONFETTI
═══════════════════════════════════════════════════════ */

let confetti = { parts: [], raf: null, until: 0 };
const CONFETTI_COLORS = ["#22d3ee", "#39ff8a", "#fbbf24", "#f472b6", "#a78bfa", "#ffffff"];

function confettiCanvas() {
  const c = el("confettiCanvas");
  if (!c) return null;
  if (c.width !== innerWidth || c.height !== innerHeight) { c.width = innerWidth; c.height = innerHeight; }
  return c;
}
function spawnConfetti(n, colors) {
  for (let i = 0; i < n; i++) {
    confetti.parts.push({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5,
      vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4,
      r: 4 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}
function startConfetti(winner) {
  const colors = winner === 1 ? ["#3b82f6", "#60a5fa", "#fbbf24", "#fff"] : winner === 2 ? ["#f43f5e", "#fb7185", "#fbbf24", "#fff"] : CONFETTI_COLORS;
  confetti.parts = [];
  confetti.until = performance.now() + 4500;
  confetti.colors = colors;
  spawnConfetti(180, colors);
  if (!confetti.raf) confetti.raf = requestAnimationFrame(confettiStep);
}
function burstConfetti(n) {
  // دفعة صغيرة فوق نافذة السؤال (نفس الكانفس لكن داخل الـ overlay الحالي)
  const layer = el("toastLayer"); if (!layer) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    p.className = "burst";
    p.style.setProperty("--x", (Math.random() * 100) + "vw");
    p.style.setProperty("--dx", ((Math.random() - 0.5) * 30) + "vw");
    p.style.setProperty("--c", CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
    p.style.setProperty("--d", (0.9 + Math.random() * 0.9) + "s");
    layer.appendChild(p);
    setTimeout(() => p.remove(), 2000);
  }
}
function confettiStep(now) {
  const c = confettiCanvas();
  if (!c) { confetti.raf = null; return; }
  const g = c.getContext("2d");
  g.clearRect(0, 0, c.width, c.height);
  if (now < confetti.until && confetti.parts.length < 320) spawnConfetti(4, confetti.colors);
  confetti.parts.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.rot += p.vr;
    g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
    g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
    g.restore();
  });
  confetti.parts = confetti.parts.filter(p => p.y < c.height + 30);
  if (confetti.parts.length || now < confetti.until) confetti.raf = requestAnimationFrame(confettiStep);
  else confetti.raf = null;
}
function stopConfetti() {
  cancelAnimationFrame(confetti.raf);
  confetti.raf = null;
  confetti.parts = [];
  const c = el("confettiCanvas");
  if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
}

/* ═══════════════════════════════════════════════════════
   حفظ المباراة (حتى لا تضيع عند تحديث الصفحة)
═══════════════════════════════════════════════════════ */

const SAVE_TTL_MS = 12 * 60 * 60 * 1000;
function saveKey() { return "sj_game_" + (currentUser?.accountNumber || "guest"); }

function saveGame() {
  if (!currentGame) return;
  try {
    localStorage.setItem(saveKey(), JSON.stringify({ savedAt: Date.now(), currentGame, activeCategories, gameState, Q }));
  } catch {}
}
function loadSavedGame() {
  try {
    const s = JSON.parse(localStorage.getItem(saveKey()) || "null");
    if (!s || !s.currentGame || !s.gameState || Date.now() - s.savedAt > SAVE_TTL_MS) return null;
    return s;
  } catch { return null; }
}
function clearSavedGame() { try { localStorage.removeItem(saveKey()); } catch {} }

function renderResumeCard() {
  const card = el("resumeCard"); if (!card) return;
  const s = loadSavedGame();
  if (!s) { card.style.display = "none"; return; }
  const g = s.gameState;
  el("resumeText").textContent =
    `${s.currentGame.team1} (${g.team1Score}) ضد ${s.currentGame.team2} (${g.team2Score}) — باقي ${g.totalTiles - g.usedQuestions.length} سؤال`;
  card.style.display = "flex";
}

function resumeSavedGame() {
  const s = loadSavedGame();
  if (!s) { renderResumeCard(); return; }
  currentGame      = s.currentGame;
  activeCategories = s.activeCategories;
  gameState        = s.gameState;
  Q                = s.Q;
  enterBoard();
  if (!Q) return;

  // نرجّع السؤال اللي كان مفتوح
  showOverlay("questionOverlay", true);
  el("questionOverlay").className = "overlay q-overlay show team-" + Q.owner;
  if (Q.phase === "splash") {
    if (Q.surprise === "gift") { finishGift(); return; }
    if (Q.isBoss) { openBets(); return; }
    Q.phase = "main";
  }
  if (Q.isBoss && !Q.bets) { openBets(); return; }
  showQuestionCard();
  if (Q.phase === "done" && Q.deltas) {
    el("answerArea").style.display = "block";
    const r = el("resultArea");
    r.innerHTML = `<div class="result-title none">تم احتساب النقاط</div>`;
    r.style.display = "block";
  }
  timerSet(Q.phase === "steal" ? STEAL_SECONDS : TIMER_SECONDS);
}

function discardSavedGame() {
  if (!confirm("حذف المباراة المحفوظة؟")) return;
  clearSavedGame();
  renderResumeCard();
}

/* ═══════════════════════════════════════════════════════
   أدوات المقدّم: الصوت · ملء الشاشة · الاختصارات
═══════════════════════════════════════════════════════ */

function toggleMute() {
  const m = SFX.toggle();
  updateMuteBtn();
  toast(m ? "🔇 الصوت مكتوم" : "🔊 الصوت شغّال");
}
function updateMuteBtn() { const b = el("btnMute"); if (b) b.textContent = SFX.muted ? "🔇" : "🔊"; }

function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  } catch {}
}
function toggleKeys(on) { showOverlay("keysOverlay", on); }

function onKey(e) {
  const tag = (e.target?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea") {
    if (e.key === "Enter" && el("betOverlay").classList.contains("show")) confirmBets();
    return;
  }
  if (!el("boardScreen").classList.contains("active")) return;
  const k = e.key.toLowerCase();

  if (k === "escape") { toggleKeys(false); return; }
  if (k === "h" || k === "?") { toggleKeys(!el("keysOverlay").classList.contains("show")); return; }
  if (k === "m") { toggleMute(); return; }
  if (k === "f") { toggleFullscreen(); return; }
  if (!Q) return;

  if (k === " ") { e.preventDefault(); toggleTimer(); return; }
  if (k === "enter") {
    e.preventDefault();
    if (Q.phase === "done") closeQuestion();
    else if (Q.isBoss && Q.answerShown) finishBoss();
    else if (Q.phase === "main" || Q.phase === "steal") revealAnswer();
    return;
  }
  if (k === "s" && Q.phase === "main" && !Q.isBoss) { startSteal(); return; }
  if (Q.isBoss && Q.answerShown && (k === "1" || k === "2")) { toggleBossJudge(Number(k)); return; }
  if (k === "1" || k === "2") { if (Q.phase === "judge") finish(Number(k)); return; }
  if (k === "0" && (Q.phase === "judge" || Q.phase === "steal")) finish(0);
}

/* ═══════════════════════════════════════════════════════
   BACK / LOGOUT / RESTORE
═══════════════════════════════════════════════════════ */

function confirmBack() {
  if (!confirm("الخروج للقائمة؟ المباراة تنحفظ وتقدر تكمّلها بعدين")) return;
  backToSetup();
}
function backToSetup() {
  timerStop();
  clearMedia();
  Q = null;
  ["questionOverlay", "betOverlay", "keysOverlay"].forEach(id => showOverlay(id, false));
  showScreen("gameScreen");
  if (isAdmin()) showAdminMenu(); else showGameSetup();
}
function logout() {
  timerStop();
  clearMedia();
  stopConfetti();
  ["questionOverlay", "betOverlay", "keysOverlay", "winnerOverlay"].forEach(id => showOverlay(id, false));
  currentUser = currentGame = Q = null;
  gameState = freshGameState([]);
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
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", () => { if (confetti.raf) confettiCanvas(); });
});
