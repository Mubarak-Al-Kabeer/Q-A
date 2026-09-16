const API_URL =
  "https://script.google.com/macros/s/AKfycbwtM6EpRaz9R09523IEtdiTWbghH2HQ1cVc9CQjAn32r6UsFIfZQ0doSF1PddQjKExgkw/exec";


let currentUser = null;


/* =========================================================
   API REQUEST
   ========================================================= */

async function apiRequest(data) {

  try {

    const response = await fetch(API_URL, {

      method: "POST",

      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },

      body: JSON.stringify(data)

    });

    const result =
      await response.json();

    return result;

  } catch (error) {

    console.error(error);

    return {

      success: false,

      message:
        "تعذر الاتصال بالخادم"

    };

  }

}


/* =========================================================
   LOGIN
   ========================================================= */

async function login() {

  const accountNumber =
    document
      .getElementById("loginAccount")
      .value
      .trim();

  const code =
    document
      .getElementById("loginCode")
      .value
      .trim();

  const message =
    document.getElementById(
      "loginMessage"
    );


  message.textContent =
    "جاري تسجيل الدخول...";


  if (!accountNumber || !code) {

    message.textContent =
      "أدخل رقم الحساب والرمز";

    return;

  }


  const result =
    await apiRequest({

      action: "login",

      accountNumber:
        accountNumber,

      code:
        code

    });


  console.log("LOGIN RESULT:", result);


  if (!result.success) {

    message.textContent =
      result.message ||
      "فشل تسجيل الدخول";

    return;

  }


  currentUser =
    result.user;


  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );


  /*
   * المسؤول يدخل مباشرة
   */

  if (
    String(currentUser.accountNumber) === "3854" &&
    String(currentUser.role).toUpperCase() === "ADMIN"
  ) {

    showScreen("gameScreen");

    updateGameUI();

    return;

  }


  /*
   * المستخدم العادي
   */

  if (
    String(currentUser.status).toUpperCase() !==
    "APPROVED"
  ) {

    document.getElementById(
      "waitingAccount"
    ).textContent =
      currentUser.accountNumber;

    showScreen("waitingScreen");

    return;

  }


  showScreen("gameScreen");

  updateGameUI();

}


/* =========================================================
   START GAME
   ========================================================= */

async function startGame() {

  if (!currentUser) {

    alert("يجب تسجيل الدخول أولاً");

    showScreen("loginScreen");

    return;

  }


  const team1 =
    document
      .getElementById("team1")
      .value
      .trim();

  const team2 =
    document
      .getElementById("team2")
      .value
      .trim();

  const message =
    document.getElementById(
      "gameMessage"
    );


  if (!team1 || !team2) {

    message.textContent =
      "أدخل اسم الفريقين";

    return;

  }


  message.textContent =
    "جاري تجهيز اللعبة...";


  /*
   * مهم جدًا:
   * نرسل رقم الحساب الموجود في currentUser
   */

  const result =
    await apiRequest({

      action: "createGame",

      accountNumber:
        String(currentUser.accountNumber),

      team1:
        team1,

      team2:
        team2

    });


  console.log("CREATE GAME RESULT:", result);


  if (!result.success) {

    message.textContent =
      result.message ||
      "تعذر بدء اللعبة";

    return;

  }


  /*
   * حفظ بيانات اللعبة
   */

  localStorage.setItem(
    "currentGame",
    JSON.stringify(result)
  );


  currentUser.gamesRemaining =
    result.gamesRemaining;


  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );


  updateGameUI();


  message.textContent =
    "تم إنشاء اللعبة بنجاح";


  /*
   * هنا يمكنك الانتقال إلى شاشة اللعبة
   * إذا كانت موجودة عندك.
   */

  if (
    typeof showGameBoard ===
    "function"
  ) {

    showGameBoard(result);

  }

}


/* =========================================================
   UPDATE UI
   ========================================================= */

function updateGameUI() {

  if (!currentUser) {
    return;
  }


  const nickname =
    document.getElementById(
      "playerNickname"
    );

  const games =
    document.getElementById(
      "gamesRemaining"
    );


  if (nickname) {

    nickname.textContent =
      currentUser.nickname || "";

  }


  if (games) {

    /*
     * المسؤول = غير محدود
     */

    if (
      String(currentUser.accountNumber) ===
      "3854"
    ) {

      games.textContent =
        "∞";

    } else {

      games.textContent =
        Number(
          currentUser.gamesRemaining || 0
        );

    }

  }

}


/* =========================================================
   SHOW SCREEN
   ========================================================= */

function showScreen(screenId) {

  document
    .querySelectorAll(".screen")
    .forEach(screen => {

      screen.classList.remove(
        "active"
      );

    });


  const screen =
    document.getElementById(
      screenId
    );


  if (screen) {

    screen.classList.add(
      "active"
    );

  }

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

  currentUser = null;

  localStorage.removeItem(
    "currentUser"
  );

  localStorage.removeItem(
    "currentGame"
  );


  showScreen(
    "loginScreen"
  );


  const account =
    document.getElementById(
      "loginAccount"
    );

  const code =
    document.getElementById(
      "loginCode"
    );


  if (account) {
    account.value = "";
  }

  if (code) {
    code.value = "";
  }

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


    currentUser =
      JSON.parse(saved);


    if (
      !currentUser ||
      !currentUser.accountNumber
    ) {

      return;

    }


    /*
     * المسؤول يدخل مباشرة
     */

    if (
      String(currentUser.accountNumber) ===
      "3854"
    ) {

      showScreen(
        "gameScreen"
      );

      updateGameUI();

      return;

    }


    /*
     * المستخدم العادي
     */

    if (
      String(currentUser.status).toUpperCase() ===
      "APPROVED"
    ) {

      showScreen(
        "gameScreen"
      );

      updateGameUI();

    } else {

      document.getElementById(
        "waitingAccount"
      ).textContent =
        currentUser.accountNumber;

      showScreen(
        "waitingScreen"
      );

    }

  } catch (error) {

    console.error(error);

    localStorage.removeItem(
      "currentUser"
    );

  }

}


/* =========================================================
   PAGE LOAD
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    restoreLogin();

  }
);
