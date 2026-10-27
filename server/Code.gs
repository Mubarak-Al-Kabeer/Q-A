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
const ADMIN_CODE     = readAdminCode_();

// يقبل ADMIN_CODE حتى لو انكتب الاسم بحروف صغيرة أو فيه مسافة أو بدون _
function readAdminCode_() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const key = Object.keys(props).find(k => k.replace(/[\s_\-]/g, "").toUpperCase() === "ADMINCODE");
  return key ? String(props[key]).trim() : "";
}
function propertyNames_() {
  const names = Object.keys(PropertiesService.getScriptProperties().getProperties());
  return names.length ? names.map(n => "'" + n + "'").join("، ") : "(ولا وحدة)";
}
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

function getSpreadsheet_() {
  if (_ss) return _ss;
  _ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!_ss) throw new Error("لم يتم العثور على Google Sheet — ضع SPREADSHEET_ID في أعلى الملف.");
  return _ss;
}
function getSheet_(name) {
  if (_sheets[name]) return _sheets[name];
  const ss = getSpreadsheet_();
  const want = name.trim().toLowerCase();
  const found = ss.getSheetByName(name) || ss.getSheets().find(sh => sh.getName().trim().toLowerCase() === want);
  if (!found) Logger.log("⚠️ التبويب '" + name + "' مو موجود — تم إنشاؤه فاضي");
  return (_sheets[name] = found || ss.insertSheet(name));
}

/* ═══ SETUP ══════════════════════════════════════════════ */

function ensureSheetsExist() {
  const acc = getSheet_(SHEET_ACCOUNTS);
  if (acc.getLastRow() === 0) {
    acc.getRange("A:E").setNumberFormat("@");
    acc.appendRow(ACCOUNT_HEADERS);
  }
  [[SHEET_QUESTIONS, QUESTION_HEADERS], [SHEET_CATEGORIES, CATEGORY_HEADERS],
   [SHEET_GAMES, GAME_HEADERS], [SHEET_ANSWERS, ANSWER_HEADERS]].forEach(([name, headers]) => {
    const sh = getSheet_(name);
    if (sh.getLastRow() === 0) sh.appendRow(headers);
  });
  return true;
}

function fixAccountFormats() {
  getSheet_(SHEET_ACCOUNTS).getRange("A:E").setNumberFormat("@");
  Logger.log("تم ضبط الأعمدة A:E كنص");
}

/* شغّلها مرة وحدة قبل لصق الأسئلة: تجهّز الهيدر (15 عمود) وتخلي كل الأعمدة نص
   حتى لا يحوّل الشيت "15:2" لوقت أو "B" لشي ثاني */
function prepareQuestionsSheet() {
  const q = getSheet_(SHEET_QUESTIONS);
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
  const c = getSheet_(SHEET_CATEGORIES);
  c.getRange(1, 1, 1, CATEGORY_HEADERS.length).setValues([CATEGORY_HEADERS]).setFontWeight("bold");
  c.getRange("A:F").setNumberFormat("@");
  c.setFrozenRows(1);
  Logger.log("تم تجهيز شيت Categories");
}

function appendTextRow_(sheet, values) {
  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, 5).setNumberFormat("@");
  sheet.getRange(row, 1, 1, values.length).setValues([values]);
  return row;
}

function ensureAdminAccount() {
  const sheet = getSheet_(SHEET_ACCOUNTS);
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
  if (!ADMIN_CODE) {
    Logger.log("حساب المسؤول غير موجود — ADMIN_CODE ما انقرأ. الخصائص اللي يشوفها السكربت: " + propertyNames_());
    return false;
  }
  appendTextRow_(sheet, [ADMIN_ACCOUNT, "المسؤول", "", "", ADMIN_CODE, "APPROVED", "ADMIN", 999999, new Date()]);
  return true;
}

/* ═══ SESSIONS ═══════════════════════════════════════════ */

function makeToken_(accountNumber) {
  const t = Utilities.getUuid();
  CacheService.getScriptCache().put("tok_" + t, String(accountNumber), SESSION_SECONDS);
  return t;
}

function sessionAccount_(token) {
  const t = String(token || "").trim();
  if (!t) return "";
  const cache = CacheService.getScriptCache();
  const n = cache.get("tok_" + t);
  if (!n) return "";
  cache.put("tok_" + t, n, SESSION_SECONDS);
  return n;
}

function getSessionAccount_(token) {
  const n = sessionAccount_(token);
  return n ? findAccount_(n) : null;
}

function isAdminAccount_(acc) {
  return acc && (acc.accountNumber === ADMIN_ACCOUNT || acc.role === "ADMIN");
}

function adminGuard_(token) {
  const acc = getSessionAccount_(token);
  if (!acc) return EXPIRED;
  if (!isAdminAccount_(acc)) return { success: false, message: "غير مصرح لك" };
  return null;
}

/* ═══ حماية من التخمين ═══════════════════════════════════ */

function attemptsLocked_(kind, key) {
  return Number(CacheService.getScriptCache().get(kind + "_" + key) || 0) >= MAX_FAILS;
}
function noteFailedAttempt_(kind, key) {
  const c = CacheService.getScriptCache(), k = kind + "_" + key;
  c.put(k, String(Number(c.get(k) || 0) + 1), LOCK_SECONDS);
}
function clearAttempts_(kind, key) {
  CacheService.getScriptCache().remove(kind + "_" + key);
}
const LOCKED_MSG = { success: false, message: "محاولات كثيرة غلط — حاول مرة ثانية بعد 10 دقائق" };

/* ═══ HTTP ═══════════════════════════════════════════════ */

function doGet() {
  return jsonRes_({ success: true, message: "🩺 سين جيم الطبي API يعمل بنجاح" });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return jsonRes_({ success: false, message: "لم تُرسَل بيانات" });
    const data   = JSON.parse(e.postData.contents);
    const action = String(data.action || "").trim();
    ensureSheetsExist();
    const h = {
      login:               () => loginUser_(data),
      register:            () => registerUser_(data),
      forgotCode:          () => forgotCode_(data),
      getCategories:       () => getCategories_(data),
      createGame:          () => createGame_(data),
      getAllQuestions:     () => getAllQuestions_(data),
      submitAnswer:        () => submitAnswer_(data),
      finishGame:          () => finishGame_(data),
      getAccounts:         () => getAccounts_(data),
      updateAccountStatus: () => updateAccountStatus_(data),
      updateGames:         () => updateGames_(data)
    };
    if (h[action]) return jsonRes_(h[action]());
    return jsonRes_({ success: false, message: "أمر غير معروف: " + action });
  } catch (err) {
    Logger.log(err);
    return jsonRes_({ success: false, message: "خطأ في الخادم: " + err.message });
  }
}

function jsonRes_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ═══ ACCOUNT HELPERS ════════════════════════════════════ */

function findAccount_(accountNumber) {
  const wanted = String(accountNumber || "").trim();
  const vals   = getSheet_(SHEET_ACCOUNTS).getDataRange().getValues();
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

function loginUser_(data) {
  const accountNumber = String(data.accountNumber || "").trim();
  const code          = String(data.code || "").trim();
  if (!accountNumber || !code) return { success: false, message: "أدخل رقم الحساب والرمز" };
  if (attemptsLocked_("login", accountNumber)) return LOCKED_MSG;
  ensureAdminAccount();
  const vals = getSheet_(SHEET_ACCOUNTS).getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    const row = vals[i];
    if (String(row[0] || "").trim() === accountNumber && String(row[4] || "").trim() === code) {
      clearAttempts_("login", accountNumber);
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
      user.token = makeToken_(user.accountNumber);
      return { success: true, message: "تم تسجيل الدخول بنجاح", user };
    }
  }
  noteFailedAttempt_("login", accountNumber);
  return { success: false, message: "رقم الحساب أو الرمز غير صحيح" };
}

/* ═══ REGISTER ═══════════════════════════════════════════ */

function registerUser_(data) {
  const nickname = String(data.nickname || "").trim();
  const phone    = String(data.phone || "").trim();
  const email    = String(data.email || "").trim();
  const code     = String(data.code || "").trim();
  if (!nickname || !phone || !email || !code) return { success: false, message: "أكمل جميع الحقول" };
  if (code.length < 3) return { success: false, message: "الرمز يجب أن يكون 3 أحرف على الأقل" };
  // القفل يمنع حسابين ياخذون نفس الرقم لو سجلوا بنفس اللحظة
  return withLock_(() => {
    const sheet = getSheet_(SHEET_ACCOUNTS);
    const vals  = sheet.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      const e = String(vals[i][3] || "").trim().toLowerCase();
      if (e && e === email.toLowerCase()) return { success: false, message: "البريد الإلكتروني مستخدم مسبقاً" };
    }
    const accountNumber = generateAccountNumber_(vals);
    appendTextRow_(sheet, [accountNumber, nickname, phone, email, code, "PENDING", "USER", DEFAULT_GAMES, new Date()]);
    return { success: true, message: "تم إنشاء الحساب", accountNumber };
  });
}

function generateAccountNumber_(vals) {
  let n = 1000;
  while (vals.some(r => String(r[0] || "").trim() === String(n))) n++;
  return String(n);
}

/* ═══ FORGOT CODE ════════════════════════════════════════ */

function forgotCode_(data) {
  const accountNumber = String(data.accountNumber || "").trim();
  const phone         = String(data.phone || "").trim();
  const email         = String(data.email || "").trim().toLowerCase();
  if (!accountNumber || !phone || !email) return { success: false, message: "أدخل جميع البيانات" };
  if (attemptsLocked_("forgot", accountNumber)) return LOCKED_MSG;
  const vals = getSheet_(SHEET_ACCOUNTS).getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    const row = vals[i];
    if (String(row[0] || "").trim() === accountNumber &&
        String(row[2] || "").trim() === phone &&
        String(row[3] || "").trim().toLowerCase() === email) {
      clearAttempts_("forgot", accountNumber);
      return { success: true, message: "رمزك هو: " + String(row[4] || "") };
    }
  }
  noteFailedAttempt_("forgot", accountNumber);
  return { success: false, message: "البيانات غير صحيحة" };
}

/* ═══ التخصصات والفئات ═══════════════════════════════════ */

function parseSpecialties_(v) {
  const list = String(v == null ? "" : v).toUpperCase().split(/[\s,،]+/).filter(Boolean);
  return list.length ? list : ["ALL"];
}
function matchesSpecialty_(list, code) {
  return !code || list.indexOf("ALL") >= 0 || list.indexOf(String(code).toUpperCase()) >= 0;
}

function readCategories_() {
  const vals = getSheet_(SHEET_CATEGORIES).getDataRange().getValues();
  const out = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    const category = cellText_(r[0]);
    if (!category || !isActiveFlag_(r[5])) continue;
    out.push({
      category,
      label:       cellText_(r[1]) || category,
      icon:        cellText_(r[2]),
      group:       cellText_(r[3]) || "فئات أخرى",
      specialties: parseSpecialties_(r[4])
    });
  }
  return out;
}

function getCategories_(data) {
  const account = getSessionAccount_(data.token);
  if (!account) return EXPIRED;
  return { success: true, specialties: SPECIALTIES, categories: readCategories_() };
}

/* ═══ CREATE GAME ════════════════════════════════════════ */

function createGame_(data) {
  if (!sessionAccount_(data.token)) return EXPIRED;
  const team1 = String(data.team1 || "").trim();
  const team2 = String(data.team2 || "").trim();
  const specialty = String(data.specialty || "").trim().toUpperCase();
  if (!team1 || !team2) return { success: false, message: "بيانات اللعبة ناقصة" };
  if (team1 === team2) return { success: false, message: "يجب أن يكون اسم الفريقين مختلفاً" };

  // القفل يمنع خصم لعبة وحدة بس لو ضغط "ابدأ" مرتين بسرعة
  return withLock_(() => {
    const account = getSessionAccount_(data.token);
    if (!account) return EXPIRED;
    const isAdm = isAdminAccount_(account);
    if (account.status !== "APPROVED" && !isAdm) return { success: false, message: "الحساب غير معتمد" };
    let gamesRemaining = account.gamesRemaining;
    if (!isAdm) {
      if (gamesRemaining <= 0) return { success: false, message: "لا توجد ألعاب متبقية. تواصل مع المسؤول." };
      gamesRemaining--;
      updateAccountGames_(account.accountNumber, gamesRemaining);
    }
    const gameId = "GAME-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    getSheet_(SHEET_GAMES).appendRow([gameId, account.accountNumber, team1, team2, new Date(), "ACTIVE", specialty]);
    return { success: true, message: "تم إنشاء اللعبة", gameId, team1, team2, gamesRemaining };
  });
}

/* ═══ FINISH GAME ════════════════════════════════════════ */

function finishGame_(data) {
  const account = getSessionAccount_(data.token);
  if (!account) return EXPIRED;
  const gameId = String(data.gameId || "").trim();
  if (!gameId) return { success: false, message: "رقم اللعبة مفقود" };
  const sheet = getSheet_(SHEET_GAMES), vals = sheet.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) !== gameId) continue;
    if (String(vals[i][1]) !== account.accountNumber && !isAdminAccount_(account)) return { success: false, message: "غير مصرح لك" };
    sheet.getRange(i + 1, 6).setValue("FINISHED");
    sheet.getRange(i + 1, 8, 1, 4).setValues([[
      Number(data.team1Score) || 0, Number(data.team2Score) || 0, String(data.winner || ""), new Date()
    ]]);
    return { success: true, message: "تم تسجيل نهاية اللعبة" };
  }
  return { success: false, message: "اللعبة غير موجودة" };
}

/* ═══ QUESTIONS ══════════════════════════════════════════ */

function isActiveFlag_(v) {
  const a = String(v == null ? "" : v).trim().toUpperCase();
  return a === "" || a === "TRUE" || a === "1" || a === "YES";
}
function isTrueFlag_(v) {
  return v === true || String(v == null ? "" : v).trim().toUpperCase() === "TRUE";
}
// نص آمن: الأرقام (مثل خيار 5 أو 206) تتحول لنص، والفراغ يبقى فراغ
function cellText_(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}

function readQuestions_(specialty) {
  const vals = getSheet_(SHEET_QUESTIONS).getDataRange().getValues();
  const questions = [];
  for (let i = 1; i < vals.length; i++) {
    const row = vals[i];
    if (!cellText_(row[0]) && !cellText_(row[3])) continue;   // صف فاضي
    if (!isActiveFlag_(row[5])) continue;                     // العمود F = active
    const sp = parseSpecialties_(row[14]);                    // العمود O = specialty
    if (!matchesSpecialty_(sp, specialty)) continue;

    const hasChoices = isTrueFlag_(row[6]);
    questions.push({
      id:         cellText_(row[0]),
      category:   cellText_(row[1]),
      points:     Number(row[2]),
      question:   cellText_(row[3]),
      // في أسئلة الاختيارات نخلي الحرف كبير (A/B/C/D)
      answer:     hasChoices ? cellText_(row[4]).toUpperCase() : cellText_(row[4]),
      hasChoices: hasChoices,
      choiceA:    cellText_(row[7]),
      choiceB:    cellText_(row[8]),
      choiceC:    cellText_(row[9]),
      choiceD:    cellText_(row[10]),
      imageUrl:   cellText_(row[11]),
      audioUrl:   cellText_(row[12]),
      videoUrl:   cellText_(row[13]),
      specialty:  sp.join(",")
    });
  }
  return questions;
}

/* كل الأسئلة الفعّالة دفعة واحدة (مفلترة على التخصص إذا انرسل) */
function getAllQuestions_(data) {
  const account = getSessionAccount_(data.token);
  if (!account) return EXPIRED;
  if (account.status !== "APPROVED" && !isAdminAccount_(account)) return { success: false, message: "الحساب غير معتمد" };
  return { success: true, questions: readQuestions_(String(data.specialty || "").trim()) };
}

/* ═══ SUBMIT ANSWER ══════════════════════════════════════ */

function submitAnswer_(data) {
  const account = getSessionAccount_(data.token);
  if (!account) return EXPIRED;
  const correct = data.correct === true || String(data.correct).toLowerCase() === "true";
  getSheet_(SHEET_ANSWERS).appendRow([
    String(data.gameId    || ""), account.accountNumber,
    String(data.team1     || ""), String(data.team2 || ""),
    String(data.category  || ""), String(data.questionId || ""),
    String(data.question  || ""), Number(data.points) || 0,
    String(data.team      || ""), correct, new Date()
  ]);
  return { success: true, message: "تم تسجيل الإجابة" };
}

/* ═══ ACCOUNTS (ADMIN) ═══════════════════════════════════ */

function getAccounts_(data) {
  const denied = adminGuard_(data.token);
  if (denied) return denied;
  const vals = getSheet_(SHEET_ACCOUNTS).getDataRange().getValues();
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

function updateAccountStatus_(data) {
  const denied = adminGuard_(data.token);
  if (denied) return denied;
  const targetAcc = String(data.accountNumber || "").trim();
  const status    = String(data.status || "").toUpperCase();
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) return { success: false, message: "حالة غير صحيحة" };
  if (!targetAcc) return { success: false, message: "رقم الحساب مفقود" };
  if (targetAcc === ADMIN_ACCOUNT) return { success: false, message: "لا يمكن تعديل حساب المسؤول" };
  return setAccountStatus_(targetAcc, status);
}

function setAccountStatus_(accountNumber, status) {
  const sheet = getSheet_(SHEET_ACCOUNTS);
  const vals  = sheet.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0] || "").trim() === String(accountNumber || "").trim()) {
      sheet.getRange(i + 1, 6).setValue(status);
      return { success: true, message: "تم تحديث الحساب", accountNumber, status };
    }
  }
  return { success: false, message: "الحساب غير موجود" };
}

function updateGames_(data) {
  const denied = adminGuard_(data.token);
  if (denied) return denied;
  const target = String(data.targetAccountNumber || "").trim();
  const games  = Number(data.games);
  if (!target || isNaN(games) || games < 0) return { success: false, message: "بيانات غير صحيحة" };
  if (!updateAccountGames_(target, games)) return { success: false, message: "الحساب غير موجود" };
  return { success: true, message: "تم تحديث عدد الألعاب", gamesRemaining: games };
}

function updateAccountGames_(accountNumber, games) {
  const sheet = getSheet_(SHEET_ACCOUNTS);
  const vals  = sheet.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0] || "").trim() === String(accountNumber || "").trim()) {
      sheet.getRange(i + 1, 8).setValue(Number(games));
      return true;
    }
  }
  return false;
}


/* ═══ تجهيز كامل بضغطة وحدة ══════════════════════════════
   شغّل setupAll مرة وحدة:
   1) إذا تبويب Questions فاضي وفيه تبويب ثاني فيه الأسئلة (مثل questions-all) ← يحوّله لـ Questions
   2) إذا Categories فاضي ← يعبيه بالفئات الافتراضية (DEFAULT_CATEGORY_ROWS)
   3) يضبط التنسيقات وينشئ حساب المسؤول (إذا ADMIN_CODE موجود) ويطبع تقرير */
const DEFAULT_CATEGORY_ROWS = [
  ["Real or Myth", "حقيقة أم خرافة", "✅", "🎉 فئات مشتركة", "ALL"],
  ["جسمك عجيب", "جسمك عجيب", "🦠", "🎉 فئات مشتركة", "ALL"],
  ["إيموجي طبي", "إيموجي طبي", "🧩", "🎉 فئات مشتركة", "ALL"],
  ["مشهد طبي غلط", "مشهد طبي غلط", "📺", "🎉 فئات مشتركة", "ALL"],
  ["طب الحيوانات", "طب الحيوانات", "🐾", "🎉 فئات مشتركة", "ALL"],
  ["مين القاتل؟", "مين القاتل؟", "💀", "🎉 فئات مشتركة", "ALL"],
  ["5 Second Challenge", "تحدي 5 ثواني", "⏱️", "🎉 فئات مشتركة", "ALL"],
  ["Speed Round", "الجولة السريعة", "⚡", "🎉 فئات مشتركة", "ALL"],
  ["Video Challenge", "مثّلها", "🎭", "🎉 فئات مشتركة", "ALL"],
  ["Battle 1v1", "1 ضد 1", "⚔️", "🎉 فئات مشتركة", "ALL"],
  ["Medical Memory", "ذاكرة طبية", "🧠", "🎉 فئات مشتركة", "ALL"],
  ["التشريح", "التشريح", "🫀", "🧠 المعرفة الطبية", "MEDICINE,RADIOLOGY,NURSING,EMS"],
  ["Bone Artist", "فنان العظام", "🦴", "🧠 المعرفة الطبية", "MEDICINE,RADIOLOGY,EMS"],
  ["وظائف الأعضاء", "وظائف الأعضاء", "⚙️", "🧠 المعرفة الطبية", "MEDICINE,NURSING,LAB"],
  ["أمراض شائعة", "أمراض شائعة", "🤒", "🧠 المعرفة الطبية", "MEDICINE,NURSING,PHARMACY"],
  ["What's Wrong?", "شنو فيه؟", "🕵️", "🧠 المعرفة الطبية", "MEDICINE,NURSING,EMS"],
  ["Medical Abbreviations", "الاختصارات الطبية", "🔤", "🧠 المعرفة الطبية", "EMS,NURSING,MEDICINE,PHARMACY"],
  ["Heart Master", "سيد القلب", "💓", "🧠 المعرفة الطبية", "EMS,NURSING,MEDICINE"],
  ["Blood Lab", "مختبر الدم", "🩸", "🧠 المعرفة الطبية", "LAB,MEDICINE,NURSING,EMS"],
  ["بلاغ 112", "بلاغ 112", "📞", "🚑 الطوارئ", "EMS,NURSING"],
  ["ER Master", "سيد الطوارئ", "🚨", "🚑 الطوارئ", "EMS,NURSING,MEDICINE"],
  ["BLS/CPR", "BLS/CPR", "❤️‍🩹", "🚑 الطوارئ", "ALL"],
  ["ACLS", "ACLS", "📟", "🚑 الطوارئ", "EMS,NURSING,MEDICINE"],
  ["Trauma", "الإصابات", "🩹", "🚑 الطوارئ", "EMS,MEDICINE"],
  ["SAMPLE/OPQRST", "SAMPLE/OPQRST", "📋", "🚑 الطوارئ", "EMS"],
  ["العلامات الحيوية", "العلامات الحيوية", "📈", "🚑 الطوارئ", "EMS,NURSING,MEDICINE"],
  ["الأدوات والمعدات", "الأدوات والمعدات", "🧰", "🚑 الطوارئ", "EMS,NURSING"],
  ["What's This?", "شنو هذا؟", "👀", "🚑 الطوارئ", "EMS,NURSING"],
  ["Audio Challenge", "تحدي الصوت", "🎧", "🚑 الطوارئ", "EMS,NURSING,MEDICINE"],
  ["الكوارث والإصابات الجماعية", "الكوارث (MCI)", "🚧", "🚑 الطوارئ", "EMS"],
  ["الأدوية والجرعات", "الأدوية والجرعات", "💉", "🩺 التمريض", "NURSING,PHARMACY"],
  ["حسابات المحاليل", "حسابات المحاليل", "🧮", "🩺 التمريض", "NURSING,PHARMACY"],
  ["IV والكانيولا", "IV والكانيولا", "💧", "🩺 التمريض", "NURSING,EMS"],
  ["مكافحة العدوى", "مكافحة العدوى", "🧼", "🩺 التمريض", "NURSING,LAB,MEDICINE"],
  ["العناية بالمريض", "العناية بالمريض", "🛏️", "🩺 التمريض", "NURSING"],
  ["Hospital Detective", "محقق المستشفى", "🏥", "🩺 التمريض", "NURSING,MEDICINE"],
  ["الأسماء التجارية", "الأسماء التجارية", "🏷️", "💊 الصيدلة", "PHARMACY,NURSING"],
  ["عائلات الأدوية", "عائلات الأدوية", "🧬", "💊 الصيدلة", "PHARMACY,MEDICINE"],
  ["التداخلات الدوائية", "التداخلات الدوائية", "⚠️", "💊 الصيدلة", "PHARMACY"],
  ["السموم والترياق", "السموم والترياق", "☠️", "💊 الصيدلة", "PHARMACY,EMS,MEDICINE"],
  ["الأدوية والحمل", "الأدوية والحمل", "🤰", "💊 الصيدلة", "PHARMACY"],
  ["الميكروبات", "الميكروبات", "🧫", "🧪 المختبرات", "LAB,MEDICINE"],
  ["فصائل الدم والتبرع", "فصائل الدم والتبرع", "🅰️", "🧪 المختبرات", "LAB,NURSING"],
  ["قيم التحاليل", "قيم التحاليل", "📊", "🧪 المختبرات", "LAB,NURSING,MEDICINE"],
  ["أمراض الدم", "أمراض الدم", "🔬", "🧪 المختبرات", "LAB,MEDICINE"],
  ["X-Ray Detective", "محقق الأشعة", "🩻", "🩻 الأشعة", "RADIOLOGY,MEDICINE,EMS"],
  ["CT و MRI", "CT و MRI", "🧲", "🩻 الأشعة", "RADIOLOGY"],
  ["وضعيات التصوير", "وضعيات التصوير", "📐", "🩻 الأشعة", "RADIOLOGY"],
  ["السلامة الإشعاعية", "السلامة الإشعاعية", "☢️", "🩻 الأشعة", "RADIOLOGY"],
  ["Final Boss", "السؤال الختامي", "👑", "⭐ خاص", "ALL"]
];

function setupAll() {
  const ss = getSpreadsheet_();
  ensureSheetsExist();

  // 1) الأسئلة
  let q = getSheet_(SHEET_QUESTIONS);
  if (q.getLastRow() <= 1) {
    const src = ss.getSheets().find(sh =>
      sh.getSheetId() !== q.getSheetId() && sh.getLastRow() > 1 &&
      String(sh.getRange(1, 1).getValue()).trim().toLowerCase() === "id" &&
      String(sh.getRange(1, 2).getValue()).trim().toLowerCase() === "category");
    if (src) {
      const oldName = src.getName();
      ss.deleteSheet(q);
      src.setName(SHEET_QUESTIONS);
      delete _sheets[SHEET_QUESTIONS];
      q = getSheet_(SHEET_QUESTIONS);
      Logger.log("✅ نقلت الأسئلة من التبويب '" + oldName + "' إلى '" + SHEET_QUESTIONS + "' (" + (q.getLastRow() - 1) + " صف)");
    } else {
      Logger.log("⚠️ تبويب Questions فاضي وما لقيت تبويب ثاني فيه أسئلة — سوّ Import لملف questions-all.csv");
    }
  }
  prepareQuestionsSheet();

  // 2) الفئات
  const c = getSheet_(SHEET_CATEGORIES);
  prepareCategoriesSheet();
  if (c.getLastRow() <= 1) {
    c.getRange(2, 1, DEFAULT_CATEGORY_ROWS.length, 6)
      .setValues(DEFAULT_CATEGORY_ROWS.map(r => r.concat(["TRUE"])));
    Logger.log("✅ عبّيت شيت Categories بـ " + DEFAULT_CATEGORY_ROWS.length + " فئة");
  }

  // 3) الحسابات والمسؤول
  fixAccountFormats();
  if (!ensureAdminAccount()) Logger.log("❌ حساب المسؤول ما انشأ — حط ADMIN_CODE في Script properties وشغّل setupAll مرة ثانية");

  testAll();
  checkQuestions();
}

/* ═══ TESTS (شغّلها من المحرر) ═══════════════════════════ */

/* شغّلها إذا testAll طلع أصفار: تبين الملف اللي يقرأ منه السكربت وكل التبويبات اللي فيه */
function diagnose() {
  const ss = getSpreadsheet_();
  Logger.log("📁 الملف: " + ss.getName() + "\n" + ss.getUrl());
  ss.getSheets().forEach(sh => {
    const cols = Math.min(sh.getLastColumn(), 6);
    const head = cols ? sh.getRange(1, 1, 1, cols).getValues()[0].join(" | ") : "(فاضي)";
    Logger.log("📄 '" + sh.getName() + "' — " + Math.max(sh.getLastRow() - 1, 0) + " صف — الهيدر: " + head);
  });
  [SHEET_ACCOUNTS, SHEET_QUESTIONS, SHEET_CATEGORIES].forEach(n => {
    const ok = ss.getSheets().some(sh => sh.getName().trim().toLowerCase() === n.toLowerCase());
    Logger.log((ok ? "✅ " : "❌ ناقص: ") + n);
  });
  Logger.log("🔑 ADMIN_CODE: " + (ADMIN_CODE ? "✅ موجود" : "❌ مو موجود") + " — الخصائص الموجودة: " + propertyNames_());
}

function testAll() {
  ensureSheetsExist();
  Logger.log("حساب المسؤول: " + (ensureAdminAccount() ? "✅" : "❌ حط ADMIN_CODE في Script properties"));
  Logger.log("عدد الفئات الفعّالة: " + readCategories_().length);
  Logger.log("عدد الأسئلة الفعّالة: " + readQuestions_("").length);
  SPECIALTIES.forEach(s => Logger.log(s.icon + " " + s.name + ": " + readQuestions_(s.code).length + " سؤال"));
}

/* تقرير فحص كامل: لكل تخصص ← كل فئة ← كل مستوى نقاط
   يطلع الخانات الناقصة + أخطاء الاختيارات + الفئات اللي في الأسئلة وما لها صف في Categories */
function checkQuestions() {
  const cats = readCategories_();
  const all  = readQuestions_("");
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
    const qs = all.filter(q => matchesSpecialty_(parseSpecialties_(q.specialty), sp.code));
    cats.filter(c => matchesSpecialty_(c.specialties, sp.code)).forEach(c => {
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
  const sheet = getSheet_(SHEET_QUESTIONS);
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
