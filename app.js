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
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const text = await response.text();

    console.log("API RESPONSE:", text);

    try {

      return JSON.parse(text);

    } catch (error) {

      console.error("JSON ERROR:", error);

      return {
        success: false,
        message: "الخادم أرسل استجابة غير صحيحة"
      };
    }

  } catch (error) {

    console.error("API ERROR:", error);

    return {
      success: false,
      message: "تعذر الاتصال بالخادم"
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
   ADMIN CHECK
========================================================= */

function isAdmin() {

  if (!currentUser) {
    return false;
  }

  return (
    String(currentUser.accountNumber) === ADMIN_ACCOUNT ||
    String(currentUser.role || "").toUpperCase() === "ADMIN"
  );
}


/* =========================================================
   LOGIN
========================================================= */

async function login() {

  const accountInput =
    document.getElementById("loginAccount");

  const codeInput =
    document.getElementById("loginCode");

  const message =
    document.getElementById("loginMessage");


  if (!accountInput || !codeInput || !message) {

    console.error("LOGIN ELEMENTS MISSING");

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


  console.log("LOGIN RESULT:", result);


  if (!result || !result.success) {

    message.textContent =
      result?.message ||
      "فشل تسجيل الدخول";

    return;
  }


  currentUser =
    result.user;


  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );


  message.textContent = "";


  /* -----------------------------------------
     ADMIN
  ----------------------------------------- */

  if (isAdmin()) {

    showScreen("gameScreen");

    updateGameUI();

    showAdminMenu();

    return;
  }


  /* -----------------------------------------
     NORMAL USER
  ----------------------------------------- */

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


    showScreen("waitingScreen");

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
      .getElementById("registerNickname")
      ?.value
      .trim();

  const phone =
    document
      .getElementById("registerPhone")
      ?.value
      .trim();

  const email =
    document
      .getElementById("registerEmail")
      ?.value
      .trim();

  const code =
    document
      .getElementById("registerCode")
      ?.value
      .trim();

  const message =
    document.getElementById(
      "registerMessage"
    );


  if (!nickname || !phone || !email || !code) {

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


  console.log("REGISTER RESULT:", result);


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
   FORGOT CODE
========================================================= */

async function forgotCode() {

  const accountNumber =
    document
      .getElementById("forgotAccount")
      ?.value
      .trim();

  const phone =
    document
      .getElementById("forgotPhone")
      ?.value
      .trim();

  const email =
    document
      .getElementById("forgotEmail")
      ?.value
      .trim();

  const message =
    document.getElementById(
      "forgotMessage"
    );


  if (!accountNumber || !phone || !email) {

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
   UPDATE GAME UI
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
    menu.style.display = "block";
  }

  if (setup) {
    setup.style.display = "none";
  }

  if (panel) {
    panel.style.display = "none";
  }
}


/* =========================================================
   SHOW GAME SETUP
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
    menu.style.display = "none";
  }

  if (panel) {
    panel.style.display = "none";
  }

  if (setup) {
    setup.style.display = "block";
  }


  if (backButton) {

    backButton.style.display =
      isAdmin()
        ? "block"
        : "none";
  }
}


/* =========================================================
   SHOW ADMIN PANEL
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
    menu.style.display = "none";
  }

  if (setup) {
    setup.style.display = "none";
  }

  if (panel) {
    panel.style.display = "block";
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
      document.createElement("div");

    row.className =
      "account-row";


    const status =
      String(
        account.status || ""
      ).toUpperCase();


    let statusText =
      "غير معروف";

    let statusClass =
      "";


    if (status === "APPROVED") {

      statusText = "مقبول";

      statusClass =
        "status-approved";

    } else if (status === "PENDING") {

      statusText = "بانتظار";

      statusClass =
        "status-pending";

    } else if (status === "REJECTED") {

      statusText = "مرفوض";

      statusClass =
        "status-rejected";
    }


    row.innerHTML = `

      <div class="account-number">
        ${escapeHtml(
          account.accountNumber
        )}
      </div>

      <div class="account-name">

        <div>
          ${escapeHtml(
            account.nickname || "-"
          )}
        </div>

        <small>
          ${escapeHtml(
            account.email || ""
          )}
        </small>

      </div>

      <div>
        ${escapeHtml(
          account.phone || "-"
        )}
      </div>

      <div class="account-status ${statusClass}">
        ${statusText}
      </div>

      <div class="account-actions">

        ${
          status !== "APPROVED"
            ? `
              <button
                class="approve-button"
                onclick="changeAccountStatus(
                  '${escapeJs(
                    account.accountNumber
                  )}',
                  'APPROVED'
                )"
              >
                ✓ قبول
              </button>
            `
            : ""
        }

        ${
          status !== "REJECTED"
            ? `
              <button
                class="reject-button"
                onclick="changeAccountStatus(
                  '${escapeJs(
                    account.accountNumber
                  )}',
                  'REJECTED'
                )"
              >
                ✗ رفض
              </button>
            `
            : ""
        }

      </div>

    `;


    container.appendChild(row);

  });
}


/* =========================================================
   ACCOUNT STATS
========================================================= */

function updateAccountStats(accounts) {

  const total =
    accounts.length;


  const pending =
    accounts.filter(account =>
      String(
        account.status || ""
      ).toUpperCase() === "PENDING"
    ).length;


  const approved =
    accounts.filter(account =>
      String(
        account.status || ""
      ).toUpperCase() === "APPROVED"
    ).length;


  const totalElement =
    document.getElementById(
      "totalAccounts"
    );

  const pendingElement =
    document.getElementById(
      "pendingAccounts"
    );

  const approvedElement =
    document.getElementById(
      "approvedAccounts"
    );


  if (totalElement) {
    totalElement.textContent = total;
  }

  if (pendingElement) {
    pendingElement.textContent = pending;
  }

  if (approvedElement) {
    approvedElement.textContent = approved;
  }
}


/* =========================================================
   CHANGE ACCOUNT STATUS
========================================================= */

async function changeAccountStatus(
  accountNumber,
  status
) {

  if (!isAdmin()) {

    alert("غير مصرح لك");

    return;
  }


  const text =
    status === "APPROVED"
      ? "هل تريد قبول هذا الحساب؟"
      : "هل تريد رفض هذا الحساب؟";


  if (!confirm(text)) {
    return;
  }


  const result =
    await apiRequest({

      action: "updateAccountStatus",

      adminAccountNumber:
        String(
          currentUser.accountNumber
        ),

      accountNumber:
        String(accountNumber),

      status

    });


  console.log(
    "STATUS UPDATE:",
    result
  );


  if (!result.success) {

    alert(
      result.message ||
      "تعذر تحديث الحساب"
    );

    return;
  }


  await loadAccounts();
}


/* =========================================================
   START GAME
========================================================= */

function startGame() {

  const team1 =
    document
      .getElementById("team1")
      ?.value
      .trim();

  const team2 =
    document
      .getElementById("team2")
      ?.value
      .trim();

  const message =
    document.getElementById(
      "gameMessage"
    );


  if (!team1 || !team2) {

    if (message) {

      message.textContent =
        "أدخل اسم الفريقين أولاً";
    }

    return;
  }


  if (team1 === team2) {

    if (message) {

      message.textContent =
        "يجب أن يكون اسم الفريقين مختلفاً";
    }

    return;
  }


  gameState = {

    team1Score: 0,

    team2Score: 0,

    turn: 1,

    usedQuestions: []

  };


  currentGame = {

    team1,

    team2

  };


  const boardTeam1 =
    document.getElementById(
      "boardTeam1"
    );

  const boardTeam2 =
    document.getElementById(
      "boardTeam2"
    );


  if (boardTeam1) {
    boardTeam1.textContent =
      team1;
  }

  if (boardTeam2) {
    boardTeam2.textContent =
      team2;
  }


  updateScoreBoard();

  buildCategoryBoard();

  showScreen("boardScreen");
}


/* =========================================================
   BUILD CATEGORY BOARD
========================================================= */

function buildCategoryBoard() {

  const board =
    document.getElementById(
      "categoryBoard"
    );


  if (!board) {
    return;
  }


  board.innerHTML = "";


  CATEGORIES.forEach((category, categoryIndex) => {

    const column =
      document.createElement("div");

    column.className =
      "category-column";


    const title =
      document.createElement("div");

    title.className =
      "category-title";

    title.textContent =
      category;


    column.appendChild(title);


    POINTS.forEach((points, pointIndex) => {

      const button =
        document.createElement("button");

      button.className =
        "points-button";

      button.textContent =
        points;


      button.dataset.category =
        categoryIndex;

      button.dataset.points =
        points;

      button.onclick =
        () => selectQuestion(
          categoryIndex,
          pointIndex,
          points,
          button
        );


      column.appendChild(button);

    });


    board.appendChild(column);

  });
}


/* =========================================================
   SELECT QUESTION
========================================================= */

function selectQuestion(
  categoryIndex,
  pointIndex,
  points,
  button
) {

  if (
    gameState.usedQuestions.includes(
      categoryIndex + "-" + pointIndex
    )
  ) {

    return;
  }


  gameState.usedQuestions.push(
    categoryIndex + "-" + pointIndex
  );


  if (button) {

    button.classList.add("used");

    button.disabled = true;
  }


  currentQuestion = {

    category:
      CATEGORIES[categoryIndex],

    points,

    text:
      "السؤال غير مضاف حالياً",

    answer:
      "الإجابة غير مضافة حالياً"

  };


  const panel =
    document.getElementById(
      "questionPanel"
    );


  const category =
    document.getElementById(
      "questionCategory"
    );

  const questionPoints =
    document.getElementById(
      "questionPoints"
    );

  const questionText =
    document.getElementById(
      "questionText"
    );

  const answerBox =
    document.getElementById(
      "answerBox"
    );

  const answerText =
    document.getElementById(
      "answerText"
    );


  if (panel) {
    panel.style.display = "block";
  }

  if (category) {
    category.textContent =
      currentQuestion.category;
  }

  if (questionPoints) {
    questionPoints.textContent =
      points;
  }

  if (questionText) {
    questionText.textContent =
      currentQuestion.text;
  }

  if (answerBox) {
    answerBox.style.display = "none";
  }

  if (answerText) {
    answerText.textContent =
      currentQuestion.answer;
  }


  document
    .getElementById("questionPanel")
    ?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
}


/* =========================================================
   SHOW ANSWER
========================================================= */

function showAnswer() {

  const answerBox =
    document.getElementById(
      "answerBox"
    );


  if (answerBox) {

    answerBox.style.display =
      "block";
  }
}


/* =========================================================
   ANSWER QUESTION
========================================================= */

function answerQuestion(correct) {

  if (!currentQuestion) {
    return;
  }


  const points =
    Number(
      currentQuestion.points || 0
    );


  if (correct) {

    if (gameState.turn === 1) {

      gameState.team1Score += points;

    } else {

      gameState.team2Score += points;
    }
  }


  gameState.turn =
    gameState.turn === 1
      ? 2
      : 1;


  updateScoreBoard();


  currentQuestion = null;


  const panel =
    document.getElementById(
      "questionPanel"
    );


  if (panel) {

    panel.style.display =
      "none";
  }
}


/* =========================================================
   UPDATE SCORE
========================================================= */

function updateScoreBoard() {

  const score1 =
    document.getElementById(
      "score1"
    );

  const score2 =
    document.getElementById(
      "score2"
    );

  const turn =
    document.getElementById(
      "currentTurn"
    );


  if (score1) {

    score1.textContent =
      gameState.team1Score;
  }


  if (score2) {

    score2.textContent =
      gameState.team2Score;
  }


  if (turn) {

    turn.textContent =
      gameState.turn === 1
        ? (
            currentGame?.team1 ||
            "الفريق الأول"
          )
        : (
            currentGame?.team2 ||
            "الفريق الثاني"
          );
  }


  const team1Card =
    document.getElementById(
      "team1ScoreCard"
    );

  const team2Card =
    document.getElementById(
      "team2ScoreCard"
    );


  if (team1Card) {

    team1Card.classList.toggle(
      "active",
      gameState.turn === 1
    );
  }


  if (team2Card) {

    team2Card.classList.toggle(
      "active",
      gameState.turn === 2
    );
  }
}


/* =========================================================
   BACK TO SETUP
========================================================= */

function backToSetup() {

  currentQuestion = null;

  const panel =
    document.getElementById(
      "questionPanel"
    );


  if (panel) {

    panel.style.display =
      "none";
  }


  showScreen("gameScreen");


  if (isAdmin()) {

    showAdminMenu();

  } else {

    showGameSetup();
  }
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

  currentUser = null;

  currentGame = null;

  currentQuestion = null;


  gameState = {

    team1Score: 0,

    team2Score: 0,

    turn: 1,

    usedQuestions: []

  };


  localStorage.removeItem(
    "currentUser"
  );


  const loginAccount =
    document.getElementById(
      "loginAccount"
    );

  const loginCode =
    document.getElementById(
      "loginCode"
    );


  if (loginAccount) {
    loginAccount.value = "";
  }

  if (loginCode) {
    loginCode.value = "";
  }


  showScreen("loginScreen");
}


/* =========================================================
   RESTORE LOGIN
========================================================= */

function restoreLogin() {

  try {

    const saved =
      localStorage.getItem(
        "currentUser"
      );


    if (!saved) {
      return;
    }


    const user =
      JSON.parse(saved);


    if (!user) {
      return;
    }


    currentUser = user;


    if (isAdmin()) {

      showScreen("gameScreen");

      updateGameUI();

      showAdminMenu();

      return;
    }


    const status =
      String(
        currentUser.status || ""
      ).toUpperCase();


    if (status === "APPROVED") {

      showScreen("gameScreen");

      updateGameUI();

      showGameSetup();

    } else {

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
    }

  } catch (error) {

    console.error(
      "RESTORE LOGIN ERROR:",
      error
    );

    localStorage.removeItem(
      "currentUser"
    );
  }
}


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "سين جيم الطبي بدأ التشغيل"
    );

    restoreLogin();

  }
);
