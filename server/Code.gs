/************************************************************
 * 🩺 سين جيم الطبي — Google Apps Script Backend (v5)
 * الشيتات: Accounts | Questions | Categories | Games | Answers
 *
 * أعمدة شيت Questions (15 عمود بهذا الترتيب بالضبط):
 * A id | B category | C points | D question | E answer | F active
 * G hasChoices | H choiceA | I choiceB | J choiceC | K choiceD
 * L imageUrl | M audioUrl | N videoUrl | O specialty
 *
 * specialty: ALL (أو فاضي) = السؤال يطلع لكل التخصصات
 *            أو رمز تخصص: EMS / NURSING / PHARMACY / LAB / RADIOLOGY / MEDICINE
 *            أو أكثر من تخصص بفاصلة: EMS,NURSING
 *
 * أعمدة شيت Categories:
 * A category (لازم يطابق عمود category في الأسئلة حرفياً) | B label (الاسم اللي ينعرض)
 * C icon | D group | E specialties (ALL أو رموز بفاصلة) | F active
 *
 * الميديا: رابط عادي، أو رابط Google Drive، أو gen:اسم (يولّدها media.js في المتصفح)
 * أسئلة الاختيارات: عمود answer = الحرف A أو B أو C أو D
 ************************************************************/

const ADMIN_ACCOUNT  = "3854";
// ⚠️ رمز المسؤول ما ينكتب هنا. حطه في: إعدادات المشروع ⚙️ ← Script properties ← ADMIN_CODE
// إذا ما حطيته، يبقى الرمز الموجود حالياً في شيت Accounts كما هو.
const ADMIN_CODE     = PropertiesService.getScriptProperties().getProperty("ADMIN_CODE") || "";
const SPREADSHEET_ID = "1lPPBag5VfAEwjQPi8X1ttfJ1nU9NEqxEUAhHm5xTpMg";
const SESSION_SECONDS = 21600;

const SHEET_ACCOUNTS   = "Accounts";
const SHEET_QUESTIONS  = "Questions";
const SHEET_CATEGORIES = "Categories";
const SHEET_GAMES      = "Games";
const SHEET_ANSWERS    = "Answers";
const DEFAULT_GAMES    = 5;

// حماية من تخمين الرمز: بعد 5 محاولات غلط ينقفل الحساب 10 دقائق
const MAX_FAILS    = 5;
const LOCK_SECONDS = 600;

const POINTS         = [100, 200, 300, 400, 500];
const FINAL_BOSS_CAT = "Final Boss";

const SPECIALTIES = [
  { code: "EMS", name: "إسعاف", icon: "🚑", sub: "طوارئ · إنعاش · إصابات" },
  { code: "NURSING", name: "تمريض", icon: "🩺", sub: "أدوية · محاليل · رعاية" },
  { code: "PHARMACY", name: "صيدلة", icon: "💊", sub: "أدوية · تداخلات · سموم" },
  { code: "LAB", name: "مختبرات", icon: "🧪", sub: "تحاليل · دم · ميكروبات" },
  { code: "RADIOLOGY", name: "أشعة", icon: "🩻", sub: "X-Ray · CT · MRI" },
  { code: "MEDICINE", name: "طب", icon: "🎓", sub: "تشريح · أمراض · تشخيص" }
];

const ACCOUNT_HEADERS  = ["accountNumber","nickname","phone","email","code","status","role","gamesRemaining","createdAt"];
const QUESTION_HEADERS = [
  "id","category","points","question","answer","active",
  "hasChoices","choiceA","choiceB","choiceC","choiceD",
  "imageUrl","audioUrl","videoUrl","specialty"
];
const CATEGORY_HEADERS = ["category","label","icon","group","specialties","active"];
const GAME_HEADERS     = ["gameId","accountNumber","team1","team2","createdAt","status","specialty","team1Score","team2Score","winner","finishedAt"];
const ANSWER_HEADERS   = ["gameId","accountNumber","team1","team2","category","questionId","question","points","team","correct","createdAt"];

const EXPIRED = { success: false, expired: true, message: "انتهت الجلسة، سجّل الدخول من جديد" };

/* ═══ SPREADSHEET (نفتح الملف مرة وحدة لكل طلب) ═══════════ */

let _ss = null;
const _sheets = {};

function getSpreadsheet() {
  if (_ss) return _ss;
  _ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!_ss) throw new Error("لم يتم العثور على Google Sheet — ضع SPREADSHEET_ID في أعلى الملف.");
  return _ss;
}
function getSheet(name) {
  if (_sheets[name]) return _sheets[name];
  const ss = getSpreadsheet();
  return (_sheets[name] = ss.getSheetByName(name) || ss.insertSheet(name));
}

/* ═══ SETUP ══════════════════════════════════════════════ */

function ensureSheetsExist() {
  const acc = getSheet(SHEET_ACCOUNTS);
  if (acc.getLastRow() === 0) {
    acc.getRange("A:E").setNumberFormat("@");
    acc.appendRow(ACCOUNT_HEADERS);
  }
  [[SHEET_QUESTIONS, QUESTION_HEADERS], [SHEET_CATEGORIES, CATEGORY_HEADERS],
   [SHEET_GAMES, GAME_HEADERS], [SHEET_ANSWERS, ANSWER_HEADERS]].forEach(([name, headers]) => {
    const sh = getSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(headers);
  });
  return true;
}

function fixAccountFormats() {
  getSheet(SHEET_ACCOUNTS).getRange("A:E").setNumberFormat("@");
  Logger.log("تم ضبط الأعمدة A:E كنص");
}

/* شغّلها مرة وحدة قبل لصق الأسئلة: تجهّز الهيدر (15 عمود) وتخلي كل الأعمدة نص
   حتى لا يحوّل الشيت "15:2" لوقت أو "B" لشي ثاني */
function prepareQuestionsSheet() {
  const q = getSheet(SHEET_QUESTIONS);
  q.getRange(1, 1, 1, QUESTION_HEADERS.length).setValues([QUESTION_HEADERS]).setFontWeight("bold");
  q.getRange("A:O").setNumberFormat("@");
  q.setFrozenRows(1);
  // الأسئلة القديمة بدون تخصص = لكل التخصصات
  const last = q.getLastRow();
  if (last > 1) {
    const col = q.getRange(2, 15, last - 1, 1);
    const vals = col.getValues().map(r => [String(r[0] || "").trim() || "ALL"]);
    col.setValues(vals);
  }
  Logger.log("تم تجهيز شيت Questions");
}

/* شغّلها مرة وحدة قبل لصق الفئات */
function prepareCategoriesSheet() {
  const c = getSheet(SHEET_CATEGORIES);
  c.getRange(1, 1, 1, CATEGORY_HEADERS.length).setValues([CATEGORY_HEADERS]).setFontWeight("bold");
  c.getRange("A:F").setNumberFormat("@");
  c.setFrozenRows(1);
  Logger.log("تم تجهيز شيت Categories");
}

function appendTextRow(sheet, values) {
  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, 5).setNumberFormat("@");
  sheet.getRange(row, 1, 1, values.length).setValues([values]);
  return row;
}

function ensureAdminAccount() {
  const sheet = getSheet(SHEET_ACCOUNTS);
  const vals  = sheet.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0] || "").trim() === ADMIN_ACCOUNT) {
      if (String(vals[i][5] || "").toUpperCase() !== "APPROVED" || String(vals[i][6] || "").toUpperCase() !== "ADMIN")
        sheet.getRange(i + 1, 6, 1, 2).setValues([["APPROVED", "ADMIN"]]);
      if (ADMIN_CODE && String(vals[i][4] || "").trim() !== ADMIN_CODE)
        sheet.getRange(i + 1, 5).setNumberFormat("@").setValue(ADMIN_CODE);
      return true;
    }
  }
  if (!ADMIN_CODE) { Logger.log("حساب المسؤول غير موجود — حط ADMIN_CODE في Script properties"); return false; }
  appendTextRow(sheet, [ADMIN_ACCOUNT, "المسؤول", "", "", ADMIN_CODE, "APPROVED", "ADMIN", 999999, new Date()]);
  return true;
}

/* ═══ SESSIONS ═══════════════════════════════════════════ */

function makeToken(accountNumber) {
  const t = Utilities.getUuid();
  CacheService.getScriptCache().put("tok_" + t, String(accountNumber), SESSION_SECONDS);
  return t;
}

function sessionAccount(token) {
  const t = String(token || "").trim();
  if (!t) return "";
  const cache = CacheService.getScriptCache();
  const n = cache.get("tok_" + t);
  if (!n) return "";
  cache.put("tok_" + t, n, SESSION_SECONDS);
  return n;
}

function getSessionAccount(token) {
  const n = sessionAccount(token);
  return n ? findAccount(n) : null;
}

function isAdminAccount(acc) {
  return acc && (acc.accountNumber === ADMIN_ACCOUNT || acc.role === "ADMIN");
}

function adminGuard(token) {
  const acc = getSessionAccount(token);
  if (!acc) return EXPIRED;
  if (!isAdminAccount(acc)) return { success: false, message: "غير مصرح لك" };
  return null;
}

/* ═══ حماية من التخمين ═══════════════════════════════════ */

function attemptsLocked(kind, key) {
  return Number(CacheService.getScriptCache().get(kind + "_" + key) || 0) >= MAX_FAILS;
}
function noteFailedAttempt(kind, key) {
  const c = CacheService.getScriptCache(), k = kind + "_" + key;
  c.put(k, String(Number(c.get(k) || 0) + 1), LOCK_SECONDS);
}
function clearAttempts(kind, key) {
  CacheService.getScriptCache().remove(kind + "_" + key);
}
const LOCKED_MSG = { success: false, message: "محاولات كثيرة غلط — حاول مرة ثانية بعد 10 دقائق" };

/* ═══ HTTP ═══════════════════════════════════════════════ */

function doGet() {
  return jsonRes({ success: true, message: "🩺 سين جيم الطبي API يعمل بنجاح" });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return jsonRes({ success: false, message: "لم تُرسَل بيانات" });
    const data   = JSON.parse(e.postData.contents);
    const action = String(data.action || "").trim();
    ensureSheetsExist();
    const h = {
      login:               () => loginUser(data),
      register:            () => registerUser(data),
      forgotCode:          () => forgotCode(data),
      getCategories:       () => getCategories(data),
      createGame:          () => createGame(data),
      getAllQuestions:     () => getAllQuestions(data),
      submitAnswer:        () => submitAnswer(data),
      finishGame:          () => finishGame(data),
      getAccounts:         () => getAccounts(data),
      updateAccountStatus: () => updateAccountStatus(data),
      updateGames:         () => updateGames(data)
    };
    if (h[action]) return jsonRes(h[action]());
    return jsonRes({ success: false, message: "أمر غير معروف: " + action });
  } catch (err) {
    Logger.log(err);
    return jsonRes({ success: false, message: "خطأ في الخادم: " + err.message });
  }
}

function jsonRes(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ═══ ACCOUNT HELPERS ════════════════════════════════════ */

function findAccount(accountNumber) {
  const wanted = String(accountNumber || "").trim();
  const vals   = getSheet(SHEET_ACCOUNTS).getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0] || "").trim() === wanted) {
      return {
        row: i + 1,
        accountNumber: String(vals[i][0] || "").trim(),
        nickname: String(vals[i][1] || ""),
        phone: String(vals[i][2] || ""),
        email: String(vals[i][3] || ""),
        code: String(vals[i][4] || ""),
        status: String(vals[i][5] || "").toUpperCase(),
        role: String(vals[i][6] || "USER").toUpperCase(),
        gamesRemaining: Number(vals[i][7]) || 0
      };
    }
  }
  return null;
}

/* ═══ LOGIN ══════════════════════════════════════════════ */

function loginUser(data) {
  const accountNumber = String(data.accountNumber || "").trim();
  const code          = String(data.code || "").trim();
  if (!accountNumber || !code) return { success: false, message: "أدخل رقم الحساب والرمز" };
  if (attemptsLocked("login", accountNumber)) return LOCKED_MSG;
  ensureAdminAccount();
  const vals = getSheet(SHEET_ACCOUNTS).getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    const row = vals[i];
    if (String(row[0] || "").trim() === accountNumber && String(row[4] || "").trim() === code) {
      clearAttempts("login", accountNumber);
      const user = {
        accountNumber: String(row[0] || "").trim(),
        nickname: String(row[1] || ""),
        phone: String(row[2] || ""),
        email: String(row[3] || ""),
        status: String(row[5] || "").toUpperCase(),
        role: String(row[6] || "USER").toUpperCase(),
        gamesRemaining: Number(row[7]) || 0
      };
      if (accountNumber === ADMIN_ACCOUNT) { user.status = "APPROVED"; user.role = "ADMIN"; }
      user.token = makeToken(user.accountNumber);
      return { success: true, message: "تم تسجيل الدخول بنجاح", user };
    }
  }
  noteFailedAttempt("login", accountNumber);
  return { success: false, message: "رقم الحساب أو الرمز غير صحيح" };
}

/* ═══ REGISTER ═══════════════════════════════════════════ */

function registerUser(data) {
  const nickname = String(data.nickname || "").trim();
  const phone    = String(data.phone || "").trim();
  const email    = String(data.email || "").trim();
  const code     = String(data.code || "").trim();
  if (!nickname || !phone || !email || !code) return { success: false, message: "أكمل جميع الحقول" };
  if (code.length < 3) return { success: false, message: "الرمز يجب أن يكون 3 أحرف على الأقل" };
  // القفل يمنع حسابين ياخذون نفس الرقم لو سجلوا بنفس اللحظة
  return withLock(() => {
    const sheet = getSheet(SHEET_ACCOUNTS);
    const vals  = sheet.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      const e = String(vals[i][3] || "").trim().toLowerCase();
      if (e && e === email.toLowerCase()) return { success: false, message: "البريد الإلكتروني مستخدم مسبقاً" };
    }
    const accountNumber = generateAccountNumber(vals);
    appendTextRow(sheet, [accountNumber, nickname, phone, email, code, "PENDING", "USER", DEFAULT_GAMES, new Date()]);
    return { success: true, message: "تم إنشاء الحساب", accountNumber };
  });
}

function generateAccountNumber(vals) {
  let n = 1000;
  while (vals.some(r => String(r[0] || "").trim() === String(n))) n++;
  return String(n);
}

/* ═══ FORGOT CODE ════════════════════════════════════════ */

function forgotCode(data) {
  const accountNumber = String(data.accountNumber || "").trim();
  const phone         = String(data.phone || "").trim();
  const email         = String(data.email || "").trim().toLowerCase();
  if (!accountNumber || !phone || !email) return { success: false, message: "أدخل جميع البيانات" };
  if (attemptsLocked("forgot", accountNumber)) return LOCKED_MSG;
  const vals = getSheet(SHEET_ACCOUNTS).getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    const row = vals[i];
    if (String(row[0] || "").trim() === accountNumber &&
        String(row[2] || "").trim() === phone &&
        String(row[3] || "").trim().toLowerCase() === email) {
      clearAttempts("forgot", accountNumber);
      return { success: true, message: "رمزك هو: " + String(row[4] || "") };
    }
  }
  noteFailedAttempt("forgot", accountNumber);
  return { success: false, message: "البيانات غير صحيحة" };
}

/* ═══ التخصصات والفئات ═══════════════════════════════════ */

function parseSpecialties(v) {
  const list = String(v == null ? "" : v).toUpperCase().split(/[\s,،]+/).filter(Boolean);
  return list.length ? list : ["ALL"];
}
function matchesSpecialty(list, code) {
  return !code || list.indexOf("ALL") >= 0 || list.indexOf(String(code).toUpperCase()) >= 0;
}

function readCategories() {
  const vals = getSheet(SHEET_CATEGORIES).getDataRange().getValues();
  const out = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    const category = cellText(r[0]);
    if (!category || !isActiveFlag(r[5])) continue;
    out.push({
      category,
      label:       cellText(r[1]) || category,
      icon:        cellText(r[2]),
      group:       cellText(r[3]) || "فئات أخرى",
      specialties: parseSpecialties(r[4])
    });
  }
  return out;
}

function getCategories(data) {
  const account = getSessionAccount(data.token);
  if (!account) return EXPIRED;
  return { success: true, specialties: SPECIALTIES, categories: readCategories() };
}

/* ═══ CREATE GAME ════════════════════════════════════════ */

function createGame(data) {
  if (!sessionAccount(data.token)) return EXPIRED;
  const team1 = String(data.team1 || "").trim();
  const team2 = String(data.team2 || "").trim();
  const specialty = String(data.specialty || "").trim().toUpperCase();
  if (!team1 || !team2) return { success: false, message: "بيانات اللعبة ناقصة" };
  if (team1 === team2) return { success: false, message: "يجب أن يكون اسم الفريقين مختلفاً" };

  // القفل يمنع خصم لعبة وحدة بس لو ضغط "ابدأ" مرتين بسرعة
  return withLock(() => {
    const account = getSessionAccount(data.token);
    if (!account) return EXPIRED;
    const isAdm = isAdminAccount(account);
    if (account.status !== "APPROVED" && !isAdm) return { success: false, message: "الحساب غير معتمد" };
    let gamesRemaining = account.gamesRemaining;
    if (!isAdm) {
      if (gamesRemaining <= 0) return { success: false, message: "لا توجد ألعاب متبقية. تواصل مع المسؤول." };
      gamesRemaining--;
      updateAccountGames(account.accountNumber, gamesRemaining);
    }
    const gameId = "GAME-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    getSheet(SHEET_GAMES).appendRow([gameId, account.accountNumber, team1, team2, new Date(), "ACTIVE", specialty]);
    return { success: true, message: "تم إنشاء اللعبة", gameId, team1, team2, gamesRemaining };
  });
}

/* ═══ FINISH GAME ════════════════════════════════════════ */

function finishGame(data) {
  const account = getSessionAccount(data.token);
  if (!account) return EXPIRED;
  const gameId = String(data.gameId || "").trim();
  if (!gameId) return { success: false, message: "رقم اللعبة مفقود" };
  const sheet = getSheet(SHEET_GAMES), vals = sheet.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) !== gameId) continue;
    if (String(vals[i][1]) !== account.accountNumber && !isAdminAccount(account)) return { success: false, message: "غير مصرح لك" };
    sheet.getRange(i + 1, 6).setValue("FINISHED");
    sheet.getRange(i + 1, 8, 1, 4).setValues([[
      Number(data.team1Score) || 0, Number(data.team2Score) || 0, String(data.winner || ""), new Date()
    ]]);
    return { success: true, message: "تم تسجيل نهاية اللعبة" };
  }
  return { success: false, message: "اللعبة غير موجودة" };
}

/* ═══ QUESTIONS ══════════════════════════════════════════ */

function isActiveFlag(v) {
  const a = String(v == null ? "" : v).trim().toUpperCase();
  return a === "" || a === "TRUE" || a === "1" || a === "YES";
}
function isTrueFlag(v) {
  return v === true || String(v == null ? "" : v).trim().toUpperCase() === "TRUE";
}
// نص آمن: الأرقام (مثل خيار 5 أو 206) تتحول لنص، والفراغ يبقى فراغ
function cellText(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}

function readQuestions(specialty) {
  const vals = getSheet(SHEET_QUESTIONS).getDataRange().getValues();
  const questions = [];
  for (let i = 1; i < vals.length; i++) {
    const row = vals[i];
    if (!cellText(row[0]) && !cellText(row[3])) continue;   // صف فاضي
    if (!isActiveFlag(row[5])) continue;                     // العمود F = active
    const sp = parseSpecialties(row[14]);                    // العمود O = specialty
    if (!matchesSpecialty(sp, specialty)) continue;

    const hasChoices = isTrueFlag(row[6]);
    questions.push({
      id:         cellText(row[0]),
      category:   cellText(row[1]),
      points:     Number(row[2]),
      question:   cellText(row[3]),
      // في أسئلة الاختيارات نخلي الحرف كبير (A/B/C/D)
      answer:     hasChoices ? cellText(row[4]).toUpperCase() : cellText(row[4]),
      hasChoices: hasChoices,
      choiceA:    cellText(row[7]),
      choiceB:    cellText(row[8]),
      choiceC:    cellText(row[9]),
      choiceD:    cellText(row[10]),
      imageUrl:   cellText(row[11]),
      audioUrl:   cellText(row[12]),
      videoUrl:   cellText(row[13]),
      specialty:  sp.join(",")
    });
  }
  return questions;
}

/* كل الأسئلة الفعّالة دفعة واحدة (مفلترة على التخصص إذا انرسل) */
function getAllQuestions(data) {
  const account = getSessionAccount(data.token);
  if (!account) return EXPIRED;
  if (account.status !== "APPROVED" && !isAdminAccount(account)) return { success: false, message: "الحساب غير معتمد" };
  return { success: true, questions: readQuestions(String(data.specialty || "").trim()) };
}

/* ═══ SUBMIT ANSWER ══════════════════════════════════════ */

function submitAnswer(data) {
  const account = getSessionAccount(data.token);
  if (!account) return EXPIRED;
  const correct = data.correct === true || String(data.correct).toLowerCase() === "true";
  getSheet(SHEET_ANSWERS).appendRow([
    String(data.gameId    || ""), account.accountNumber,
    String(data.team1     || ""), String(data.team2 || ""),
    String(data.category  || ""), String(data.questionId || ""),
    String(data.question  || ""), Number(data.points) || 0,
    String(data.team      || ""), correct, new Date()
  ]);
  return { success: true, message: "تم تسجيل الإجابة" };
}

/* ═══ ACCOUNTS (ADMIN) ═══════════════════════════════════ */

function getAccounts(data) {
  const denied = adminGuard(data.token);
  if (denied) return denied;
  const vals = getSheet(SHEET_ACCOUNTS).getDataRange().getValues();
  const accounts = [];
  for (let i = 1; i < vals.length; i++) {
    if (!vals[i][0]) continue;
    accounts.push({
      accountNumber:  String(vals[i][0] || "").trim(),
      nickname:       String(vals[i][1] || ""),
      phone:          String(vals[i][2] || ""),
      email:          String(vals[i][3] || ""),
      status:         String(vals[i][5] || "").toUpperCase(),
      role:           String(vals[i][6] || "").toUpperCase(),
      gamesRemaining: Number(vals[i][7]) || 0,
      createdAt:      vals[i][8]
    });
  }
  return { success: true, accounts };
}

function updateAccountStatus(data) {
  const denied = adminGuard(data.token);
  if (denied) return denied;
  const targetAcc = String(data.accountNumber || "").trim();
  const status    = String(data.status || "").toUpperCase();
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) return { success: false, message: "حالة غير صحيحة" };
  if (!targetAcc) return { success: false, message: "رقم الحساب مفقود" };
  if (targetAcc === ADMIN_ACCOUNT) return { success: false, message: "لا يمكن تعديل حساب المسؤول" };
  return setAccountStatus(targetAcc, status);
}

function setAccountStatus(accountNumber, status) {
  const sheet = getSheet(SHEET_ACCOUNTS);
  const vals  = sheet.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0] || "").trim() === String(accountNumber || "").trim()) {
      sheet.getRange(i + 1, 6).setValue(status);
      return { success: true, message: "تم تحديث الحساب", accountNumber, status };
    }
  }
  return { success: false, message: "الحساب غير موجود" };
}

function updateGames(data) {
  const denied = adminGuard(data.token);
  if (denied) return denied;
  const target = String(data.targetAccountNumber || "").trim();
  const games  = Number(data.games);
  if (!target || isNaN(games) || games < 0) return { success: false, message: "بيانات غير صحيحة" };
  if (!updateAccountGames(target, games)) return { success: false, message: "الحساب غير موجود" };
  return { success: true, message: "تم تحديث عدد الألعاب", gamesRemaining: games };
}

function updateAccountGames(accountNumber, games) {
  const sheet = getSheet(SHEET_ACCOUNTS);
  const vals  = sheet.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0] || "").trim() === String(accountNumber || "").trim()) {
      sheet.getRange(i + 1, 8).setValue(Number(games));
      return true;
    }
  }
  return false;
}

/* ═══ TESTS (شغّلها من المحرر) ═══════════════════════════ */

function testAll() {
  ensureSheetsExist();
  Logger.log("حساب المسؤول: " + (ensureAdminAccount() ? "✅" : "❌ حط ADMIN_CODE في Script properties"));
  Logger.log("عدد الفئات الفعّالة: " + readCategories().length);
  Logger.log("عدد الأسئلة الفعّالة: " + readQuestions("").length);
  SPECIALTIES.forEach(s => Logger.log(s.icon + " " + s.name + ": " + readQuestions(s.code).length + " سؤال"));
}

/* تقرير فحص كامل: لكل تخصص ← كل فئة ← كل مستوى نقاط
   يطلع الخانات الناقصة + أخطاء الاختيارات + الفئات اللي في الأسئلة وما لها صف في Categories */
function checkQuestions() {
  const cats = readCategories();
  const all  = readQuestions("");
  const problems = [], missing = [], ids = {};
  const catNames = {};
  cats.forEach(c => { catNames[c.category] = true; });

  all.forEach(q => {
    if (ids[q.id]) problems.push("ID مكرر: " + q.id);
    ids[q.id] = true;
    if (!catNames[q.category]) problems.push(q.id + ": الفئة '" + q.category + "' مو موجودة في شيت Categories (ما راح تطلع)");
    if (q.category !== FINAL_BOSS_CAT && POINTS.indexOf(q.points) < 0) problems.push(q.id + ": نقاط غير صحيحة (" + q.points + ")");
    if (q.hasChoices) {
      if (["A", "B", "C", "D"].indexOf(q.answer) < 0) problems.push(q.id + ": إجابة الاختيارات لازم تكون A/B/C/D");
      if (!q.choiceA || !q.choiceB || !q.choiceC || !q.choiceD) problems.push(q.id + ": خيار فاضي");
    }
  });

  SPECIALTIES.forEach(sp => {
    const qs = all.filter(q => matchesSpecialty(parseSpecialties(q.specialty), sp.code));
    cats.filter(c => matchesSpecialty(c.specialties, sp.code)).forEach(c => {
      if (c.category === FINAL_BOSS_CAT) {
        if (!qs.some(q => q.category === FINAL_BOSS_CAT)) missing.push("[" + sp.code + "] " + FINAL_BOSS_CAT + " — ما فيه ولا سؤال");
        return;
      }
      POINTS.forEach(p => {
        const n = qs.filter(q => q.category === c.category && q.points === p).length;
        if (!n) missing.push("[" + sp.code + "] " + c.category + " — " + p);
      });
    });
  });

  Logger.log("إجمالي الأسئلة الفعّالة: " + all.length + " · الفئات: " + cats.length);
  Logger.log(missing.length ? "خانات ناقصة (" + missing.length + "):\n" + missing.join("\n") : "✅ كل الخانات فيها أسئلة");
  Logger.log(problems.length ? "مشاكل:\n" + problems.join("\n") : "✅ لا توجد مشاكل");
}

/* ═══ ربط ملفات الميديا من مجلد Drive تلقائياً ═══════════
   1) ارفع الصور/الفيديوهات/الصوتيات في مجلد Drive وسمّ كل ملف برقم السؤال
      مثال: Q261.jpg  أو  Q421.mp4  أو  Q401.mp3
   2) ضع رقم المجلد (الجزء الأخير من رابط المجلد) في MEDIA_FOLDER_ID
   3) شغّل fillMediaFromFolder — تكتب الروابط في أعمدة imageUrl / audioUrl / videoUrl
      وتخلي كل ملف "أي شخص معه الرابط يقدر يعرضه" */
const MEDIA_FOLDER_ID = "PUT_FOLDER_ID_HERE";

function fillMediaFromFolder() {
  if (MEDIA_FOLDER_ID === "PUT_FOLDER_ID_HERE") { Logger.log("ضع رقم المجلد في MEDIA_FOLDER_ID أولاً"); return; }
  const sheet = getSheet(SHEET_QUESTIONS);
  const vals  = sheet.getDataRange().getValues();
  const rowById = {};
  for (let i = 1; i < vals.length; i++) rowById[String(vals[i][0]).trim().toUpperCase()] = i + 1;

  const files = DriveApp.getFolderById(MEDIA_FOLDER_ID).getFiles();
  let done = 0; const missing = [];
  while (files.hasNext()) {
    const f    = files.next();
    const id   = f.getName().replace(/\.[^.]+$/, "").trim().toUpperCase();
    const row  = rowById[id];
    if (!row) { missing.push(f.getName()); continue; }
    const mime = f.getMimeType();
    const col  = mime.indexOf("image/") === 0 ? 12 : mime.indexOf("audio/") === 0 ? 13 : mime.indexOf("video/") === 0 ? 14 : 0;
    if (!col) { missing.push(f.getName() + " (نوع غير مدعوم)"); continue; }
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    sheet.getRange(row, col).setValue("https://drive.google.com/file/d/" + f.getId() + "/view");
    done++;
  }
  Logger.log("تم ربط " + done + " ملف");
  if (missing.length) Logger.log("ملفات ما لقيت لها سؤال:\n" + missing.join("\n"));
}
