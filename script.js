const API_URL =
  "https://script.google.com/macros/s/AKfycbwtM6EpRaz9R09523IEtdiTWbghH2HQ1cVc9CQjAn32r6UsFIfZQ0doSF1PddQjKExgkw/exec";


let currentUser = null;


/* =========================
   Screen
========================= */

function showScreen(id) {

  document
    .querySelectorAll(".screen")
    .forEach(screen => {
      screen.classList.remove("active");
    });

  const screen =
    document.getElementById(id);

  if (screen) {
    screen.classList.add("active");
  }
}


/* =========================
   Message
========================= */

function showMessage(
  elementId,
  message,
  type = "error"
) {

  const element =
    document.getElementById(elementId);

  element.textContent = message;

  element.className =
    "message show " + type;
}


/* =========================
   API
========================= */

async function api(action, data = {}) {

  try {

    const response =
      await fetch(API_URL, {

        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify({

          action: action,

          ...data

        })

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


/* =========================
   Register
========================= */

async function register() {

  const nickname =
    document
      .getElementById("registerNickname")
      .value
      .trim();

  const phone =
    document
      .getElementById("registerPhone")
      .value
      .trim();

  const email =
    document
      .getElementById("registerEmail")
      .value
      .trim();

  const code =
    document
      .getElementById("registerCode")
      .value
      .trim();


  if (
    !nickname ||
    !phone ||
    !email ||
    !code
  ) {

    showMessage(
      "registerMessage",
      "يرجى تعبئة جميع البيانات"
    );

    return;
  }


  const result =
    await api("register", {

      nickname,
      phone,
      email,
      code

    });


  if (!result.success) {

    showMessage(
      "registerMessage",
      result.message
    );

    return;
  }


  document
    .getElementById(
      "waitingAccount"
    )
    .textContent =
      result.accountNumber;


  showScreen("waitingScreen");

}


/* =========================
   Login
========================= */

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


  if (
    !accountNumber ||
    !code
  ) {

    showMessage(
      "loginMessage",
      "أدخل رقم الحساب والرمز"
    );

    return;
  }


  const result =
    await api("login", {

      accountNumber,
      code

    });


  if (!result.success) {

    showMessage(
      "loginMessage",
      result.message
    );

    return;
  }


  currentUser =
    result.user;


  if (
    result.user.status ===
    "PENDING"
  ) {

    document
      .getElementById(
        "waitingAccount"
      )
      .textContent =
        result.user.accountNumber;

    showScreen(
      "waitingScreen"
    );

    return;
  }


  if (
    result.user.status ===
    "REJECTED"
  ) {

    showMessage(
      "loginMessage",
      "تم رفض الحساب من المسؤول"
    );

    return;
  }


  if (
    result.user.status !==
    "APPROVED"
  ) {

    showMessage(
      "loginMessage",
      "الحساب غير مفعل"
    );

    return;
  }


  document
    .getElementById(
      "playerNickname"
    )
    .textContent =
      result.user.nickname;


  document
    .getElementById(
      "gamesRemaining"
    )
    .textContent =
      result.user.gamesRemaining;


  showScreen(
    "gameScreen"
  );

}


/* =========================
   Forgot Code
========================= */

async function forgotCode() {

  const accountNumber =
    document
      .getElementById("forgotAccount")
      .value
      .trim();

  const phone =
    document
      .getElementById("forgotPhone")
      .value
      .trim();

  const email =
    document
      .getElementById("forgotEmail")
      .value
      .trim();


  if (
    !accountNumber ||
    !phone ||
    !email
  ) {

    showMessage(
      "forgotMessage",
      "أدخل جميع البيانات"
    );

    return;
  }


  const result =
    await api("forgotCode", {

      accountNumber,
      phone,
      email

    });


  if (!result.success) {

    showMessage(
      "forgotMessage",
      result.message
    );

    return;
  }


  showMessage(
    "forgotMessage",
    "تم التحقق من البيانات. سيتم استكمال استرجاع الرمز.",
    "success"
  );

}


/* =========================
   Start Game
========================= */

async function startGame() {

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


  if (!team1 || !team2) {

    showMessage(
      "gameMessage",
      "أدخل اسم الفريقين"
    );

    return;
  }


  if (!currentUser) {

    showMessage(
      "gameMessage",
      "يجب تسجيل الدخول أولاً"
    );

    return;
  }


  if (
    Number(
      currentUser.gamesRemaining
    ) <= 0
  ) {

    showMessage(
      "gameMessage",
      "لا توجد ألعاب متبقية في حسابك"
    );

    return;
  }


  const result =
    await api("createGame", {

      accountNumber:
        currentUser.accountNumber,

      team1,
      team2

    });


  if (!result.success) {

    showMessage(
      "gameMessage",
      result.message
    );

    return;
  }


  currentUser.gamesRemaining =
    result.gamesRemaining;


  document
    .getElementById(
      "gamesRemaining"
    )
    .textContent =
      result.gamesRemaining;


  showMessage(
    "gameMessage",
    "تم إنشاء اللعبة بنجاح",
    "success"
  );


  /*
    لاحقاً هنا نفتح لوحة اللعبة
    والأسئلة والفئات.
  */

}


/* =========================
   Logout
========================= */

function logout() {

  currentUser = null;

  document
    .getElementById(
      "loginAccount"
    )
    .value = "";

  document
    .getElementById(
      "loginCode"
    )
    .value = "";

  showScreen(
    "loginScreen"
  );

}
