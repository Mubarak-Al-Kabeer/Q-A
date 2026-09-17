/* =========================================================
   CONFIG
========================================================= */

const API_URL =
  "https://script.google.com/macros/s/AKfycbwtM6EpRaz9R09523IEtdiTWbghH2HQ1cVc9CQjAn32r6UsFIfZQ0doSF1PddQjKExgkw/exec";

const ADMIN_ACCOUNT = "3854";

let currentUser = null;
let currentGame = null;
let currentQuestion = null;

let gameState = {
  team1Score: 0,
  team2Score: 0,
  turn: 1,
  usedQuestions: []
};


/* =========================================================
   CONSTANTS
========================================================= */

const CATEGORIES = [
  "التشريح",
  "الإحالة",
  "الأدوات والمعدات",
  "العلامات الحيوية",
  "الأدوية",
  "الطوارئ والإسعافات"
];

const POINTS = [
  100,
  200,
  300,
  400,
  500
];


/* =========================================================
   API
========================================================= */

async function apiRequest(data) {

  try {

    console.log("API REQUEST:", data);

    const response = await fetch(API_URL, {

      method: "POST",

      headers: {
        "Content-Type":
          "text/plain;charset=utf-8"
      },

      body: JSON.stringify(data)

    });


    if (!response.ok) {

      throw new Error(
        "HTTP " + response.status
      );

    }


    const text =
      await response.text();


    console.log(
      "API RESPONSE:",
      text
    );


    let result;


    try {

      result =
        JSON.parse(text);

    } catch (error) {

      console.error(
        "JSON ERROR:",
        error
      );

      return {

        success: false,

        message:
          "الخادم أرسل استجابة غير صحيحة"

      };

    }


    return result;


  } catch (error) {

    console.error(
      "API ERROR:",
      error
    );


    return {

      success: false,

      message:
        "تعذر الاتصال بالخادم"

    };

  }

}


/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function escapeJs(value) {

  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

}


/* =========================================================
   SCREEN SYSTEM
========================================================= */

function showScreen(screenId) {

  document
    .querySelectorAll(".screen")
    .forEach(screen => {

      screen.classList.remove("active");

    });


  const screen =
    document.getElementById(screenId);


  if (!screen) {

    console.error(
      "SCREEN NOT FOUND:",
      screenId
    );

    return;

  }


  screen.classList.add("active");

  window.scrollTo(0, 0);

}


/* =========================================================
   ADMIN
========================================================= */

function isAdmin() {

  if (!currentUser) {

    return false;

  }


  return (

    String(
      currentUser.accountNumber || ""
    ).trim() === ADMIN_ACCOUNT

    ||

    String(
      currentUser.role || ""
    ).toUpperCase() === "ADMIN"

  );

}


/* =========================================================
   LOGIN
========================================================= */

async function login() {

  const accountInput =
    document.getElementById(
      "loginAccount"
    );


  const codeInput =
    document.getElementById(
      "loginCode"
    );


  const message =
    document.getElementById(
      "loginMessage"
    );


  if (
    !accountInput ||
    !codeInput ||
    !message
  ) {

    console.error(
      "LOGIN ELEMENTS MISSING"
    );

    return;

  }


  const accountNumber =
    accountInput.value.trim();


  const code =
    codeInput.value.trim();


  if (!accountNumber || !code) {

    message.textContent =
      "أدخل رقم الحساب والرمز";

    return;

  }


  message.textContent =
    "جاري تسجيل الدخول...";


  const result =
    await apiRequest({

      action: "login",

      accountNumber,

      code

    });


  console.log(
    "LOGIN RESULT:",
    result
  );


  if (
    !result ||
    !result.success
  ) {

    message.textContent =
      result?.message ||
      "فشل تسجيل الدخول";

    return;

  }


  if (!result.user) {

    message.textContent =
      "تم تسجيل الدخول لكن بيانات الحساب ناقصة";

    return;

  }


  currentUser =
    result.user;


  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );


  message.textContent = "";


  /*
   * ADMIN
   */
  if (isAdmin()) {

    showScreen("gameScreen");

    updateGameUI();

    showAdminMenu();

    return;

  }


  /*
   * NORMAL USER
   */

  const status =
    String(
      currentUser.status || ""
    ).toUpperCase();


  if (status !== "APPROVED") {

    const waiting =
      document.getElementById(
        "waitingAccount"
      );


    if (waiting) {

      waiting.textContent =
        currentUser.accountNumber || "-";

    }


    showScreen(
      "waitingScreen"
    );

    return;

  }


  showScreen("gameScreen");

  updateGameUI();

  showGameSetup();

}


/* =========================================================
   REGISTER
========================================================= */

async function register() {

  const nickname =
    document
      .getElementById(
        "registerNickname"
      )
      ?.value
      .trim();


  const phone =
    document
      .getElementById(
        "registerPhone"
      )
      ?.value
      .trim();


  const email =
    document
      .getElementById(
        "registerEmail"
      )
      ?.value
      .trim();


  const code =
    document
      .getElementById(
        "registerCode"
      )
      ?.value
      .trim();


  const message =
    document.getElementById(
      "registerMessage"
    );


  if (
    !nickname ||
    !phone ||
    !email ||
    !code
  ) {

    if (message) {

      message.textContent =
        "أكمل جميع البيانات";

    }

    return;

  }


  if (message) {

    message.textContent =
      "جاري إنشاء الحساب...";

  }


  const result =
    await apiRequest({

      action: "register",

      nickname,

      phone,

      email,

      code

    });


  console.log(
    "REGISTER RESULT:",
    result
  );


  if (!result.success) {

    if (message) {

      message.textContent =
        result.message ||
        "تعذر إنشاء الحساب";

    }

    return;

  }


  if (message) {

    message.innerHTML =
      "تم إنشاء الحساب بنجاح.<br>" +
      "رقم حسابك: <strong>" +
      escapeHtml(
        result.accountNumber
      ) +
      "</strong>";

  }


  const waiting =
    document.getElementById(
      "waitingAccount"
    );


  if (waiting) {

    waiting.textContent =
      result.accountNumber;

  }


  setTimeout(() => {

    showScreen(
      "waitingScreen"
    );

  }, 1200);

}


/* =========================================================
   FORGOT
========================================================= */

async function forgotCode() {

  const accountNumber =
    document
      .getElementById(
        "forgotAccount"
      )
      ?.value
      .trim();


  const phone =
    document
      .getElementById(
        "forgotPhone"
      )
      ?.value
      .trim();


  const email =
    document
      .getElementById(
        "forgotEmail"
      )
      ?.value
      .trim();


  const message =
    document.getElementById(
      "forgotMessage"
    );


  if (
    !accountNumber ||
    !phone ||
    !email
  ) {

    if (message) {

      message.textContent =
        "أدخل جميع البيانات";

    }

    return;

  }


  if (message) {

    message.textContent =
      "جاري التحقق...";

  }


  const result =
    await apiRequest({

      action: "forgotCode",

      accountNumber,

      phone,

      email

    });


  if (message) {

    message.textContent =
      result.message ||
      (
        result.success
          ? "تم التحقق بنجاح"
          : "تعذر استرجاع الرمز"
      );

  }

}


/* =========================================================
   GAME UI
========================================================= */

function updateGameUI() {

  if (!currentUser) {

    return;

  }


  const nickname =
    currentUser.nickname ||
    currentUser.name ||
    currentUser.accountNumber ||
    "";


  const playerNickname =
    document.getElementById(
      "playerNickname"
    );


  if (playerNickname) {

    playerNickname.textContent =
      nickname;

  }


  const boardNickname =
    document.getElementById(
      "boardPlayerNickname"
    );


  if (boardNickname) {

    boardNickname.textContent =
      nickname;

  }


  const gamesRemaining =
    document.getElementById(
      "gamesRemaining"
    );


  if (gamesRemaining) {

    gamesRemaining.textContent =
      currentUser.gamesRemaining ??
      currentUser.remainingGames ??
      0;

  }

}


/* =========================================================
   ADMIN MENU
========================================================= */

function showAdminMenu() {

  if (!isAdmin()) {

    return;

  }


  const menu =
    document.getElementById(
      "adminMenu"
    );


  const setup =
    document.getElementById(
      "gameSetupArea"
    );


  const panel =
    document.getElementById(
      "adminPanel"
    );


  if (menu) {

    menu.style.display =
      "block";

  }


  if (setup) {

    setup.style.display =
      "none";

  }


  if (panel) {

    panel.style.display =
      "none";

  }

}


/* =========================================================
   GAME SETUP
========================================================= */

function showGameSetup() {

  const menu =
    document.getElementById(
      "adminMenu"
    );


  const setup =
    document.getElementById(
      "gameSetupArea"
    );


  const panel =
    document.getElementById(
      "adminPanel"
    );


  const backButton =
    document.getElementById(
      "adminBackButton"
    );


  if (menu) {

    menu.style.display =
      "none";

  }


  if (panel) {

    panel.style.display =
      "none";

  }


  if (setup) {

    setup.style.display =
      "block";

  }


  if (backButton) {

    backButton.style.display =
      isAdmin()
        ? "block"
        : "none";

  }

}


/* =========================================================
   ADMIN PANEL
========================================================= */

async function showAdminPanel() {

  if (!isAdmin()) {

    alert("غير مصرح لك بالدخول");

    return;

  }


  const menu =
    document.getElementById(
      "adminMenu"
    );


  const setup =
    document.getElementById(
      "gameSetupArea"
    );


  const panel =
    document.getElementById(
      "adminPanel"
    );


  if (menu) {

    menu.style.display =
      "none";

  }


  if (setup) {

    setup.style.display =
      "none";

  }


  if (panel) {

    panel.style.display =
      "block";

  }


  await loadAccounts();

}


/* =========================================================
   LOAD ACCOUNTS
========================================================= */

async function loadAccounts() {

  if (!isAdmin()) {

    return;

  }


  const container =
    document.getElementById(
      "accountsList"
    );


  if (!container) {

    return;

  }


  container.innerHTML =
    '<div class="loading">جاري تحميل الحسابات...</div>';


  const result =
    await apiRequest({

      action: "getAccounts",

      accountNumber:
        String(
          currentUser.accountNumber
        )

    });


  console.log(
    "ACCOUNTS RESULT:",
    result
  );


  if (!result.success) {

    container.innerHTML =
      `<div class="loading">
        ${escapeHtml(
          result.message ||
          "تعذر تحميل الحسابات"
        )}
      </div>`;

    return;

  }


  const accounts =
    Array.isArray(result.accounts)
      ? result.accounts
      : [];


  updateAccountStats(
    accounts
  );


  if (!accounts.length) {

    container.innerHTML =
      '<div class="loading">لا توجد حسابات</div>';

    return;

  }


  container.innerHTML = "";


  accounts.forEach(account => {

    const row =
      document.createElement(
        "div"
      );


    row.className =
      "account-row";


    const status =
      String(
