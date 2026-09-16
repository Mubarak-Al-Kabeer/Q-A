const API_URL =
  "https://script.google.com/macros/s/AKfycbwtM6EpRaz9R09523IEtdiTWbghH2HQ1cVc9CQjAn32r6UsFIfZQ0doSF1PddQjKExgkw/exec";


let currentUser = null;


/* =========================
   SCREEN
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
   MESSAGE
========================= */

function showMessage(
  elementId,
  message,
  type = "error"
) {

  const element =
    document.getElementById(elementId);

  if (!element) return;

  element.textContent = message;

  element.className =
    "message show " + type;
}


/* =========================
   CLEAR MESSAGE
========================= */

function clearMessage(elementId) {

  const element =
    document.getElementById(elementId);

  if (!element) return;

  element.textContent = "";

  element.className = "message";
}


/* =========================
   API
========================= */

async function api(
  action,
  data = {}
) {

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

    console.error(
      "API Error:",
      error
    );

    return {

      success: false,

      message:
        "تعذر الاتصال بالخادم. تأكد من اتصال الإنترنت."

    };

  }

}


/* =========================
   REGISTER
========================= */

async function register() {

  clearMessage(
    "registerMessage"
  );


  const nickname =
    document
      .getElementById(
        "registerNickname"
      )
      .value
      .trim();


  const phone =
    document
      .getElementById(
        "registerPhone"
      )
      .value
      .trim();


  const email =
    document
      .getElementById(
        "registerEmail"
      )
      .value
      .trim();


  const code =
    document
      .getElementById(
        "registerCode"
      )
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


  if (code.length < 4) {

    showMessage(
      "registerMessage",
      "الرمز يجب أن يكون 4 أرقام أو أكثر"
    );

    return;
  }


  const result =
    await api(
      "register",
      {

        nickname:
          nickname,

        phone:
          phone,

        email:
          email,

        code:
          code

      }
    );


  if (!result.success) {

    showMessage(
      "registerMessage",
      result.message ||
      "تعذر إنشاء الحساب"
    );

    return;
  }


  document
    .getElementById(
      "waitingAccount"
    )
    .textContent =
      result.accountNumber;


  showScreen(
    "waitingScreen"
  );

}


/* =========================
   LOGIN
========================= */

async function login() {

  clearMessage(
    "loginMessage"
  );


  const accountNumber =
    document
      .getElementById(
        "loginAccount"
      )
      .value
      .trim();


  const code =
    document
      .getElementById(
        "loginCode"
      )
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
    await api(
      "login",
      {

        accountNumber:
          accountNumber,

        code:
          code

      }
    );


  if (!result.success) {

    showMessage(
      "loginMessage",
      result.message ||
      "بيانات الدخول غير صحيحة"
    );

    return;
  }


  currentUser =
    result.user;


  /* =====================
     PENDING
  ====================== */

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


  /* =====================
     REJECTED
  ====================== */

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


  /* =====================
     APPROVED
  ====================== */

  if (
    result.user.status !==
    "APPROVED"
  ) {

    showMessage(
      "loginMessage",
      "الحساب غير مفعل حالياً"
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
      Number(
        result.user.gamesRemaining
      );


  showScreen(
    "gameScreen"
  );

}


/* =========================
   FORGOT CODE
========================= */

async function forgotCode() {

  clearMessage(
    "forgotMessage"
  );


  const accountNumber =
    document
      .getElementById(
        "forgotAccount"
      )
      .value
      .trim();


  const phone =
    document
      .getElementById(
        "forgotPhone"
      )
      .value
      .trim();


  const email =
    document
      .getElementById(
        "forgotEmail"
      )
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
    await api(
      "forgotCode",
      {

        accountNumber:
          accountNumber,

        phone:
          phone,

        email:
          email

      }
    );


  if (!result.success) {

    showMessage(
      "forgotMessage",
      result.message ||
      "تعذر التحقق من البيانات"
    );

    return;
  }


  showMessage(
    "forgotMessage",
    result.message ||
    "تم التحقق من البيانات.",
    "success"
  );

}


/* =========================
   START GAME
========================= */

async function startGame() {

  clearMessage(
    "gameMessage"
  );


  const team1 =
    document
      .getElementById(
        "team1"
      )
      .value
      .trim();


  const team2 =
    document
      .getElementById(
        "team2"
      )
      .value
      .trim();


  if (
    !team1 ||
    !team2
  ) {

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
    currentUser.status !==
    "APPROVED"
  ) {

    showMessage(
      "gameMessage",
      "حسابك غير مفعل"
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
    await api(
      "createGame",
      {

        accountNumber:
          currentUser.accountNumber,

        team1:
          team1,

        team2:
          team2

      }
    );


  if (!result.success) {

    showMessage(
      "gameMessage",
      result.message ||
      "تعذر إنشاء اللعبة"
    );

    return;
  }


  currentUser.gamesRemaining =
    Number(
      result.gamesRemaining
    );


  document
    .getElementById(
      "gamesRemaining"
    )
    .textContent =
      currentUser.gamesRemaining;


  showMessage(
    "gameMessage",
    "تم إنشاء اللعبة بنجاح",
    "success"
  );


  /*
    الخطوة القادمة:
    فتح لوحة اللعبة والأسئلة.
  */

}


/* =========================
   LOGOUT
========================= */

function logout() {

  currentUser =
    null;


  const fields = [

    "loginAccount",

    "loginCode",

    "team1",

    "team2"

  ];


  fields.forEach(
    id => {

      const element =
        document.getElementById(id);

      if (element) {
        element.value = "";
      }

    }
  );


  clearMessage(
    "loginMessage"
  );

  clearMessage(
    "gameMessage"
  );


  showScreen(
    "loginScreen"
  );

}


/* =========================
   ENTER KEY
========================= */

document.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key !==
      "Enter"
    ) {
      return;
    }


    const activeScreen =
      document.querySelector(
        ".screen.active"
      );


    if (!activeScreen) {
      return;
    }


    if (
      activeScreen.id ===
      "loginScreen"
    ) {

      login();

    }

    else if (
      activeScreen.id ===
      "registerScreen"
    ) {

      register();

    }

    else if (
      activeScreen.id ===
      "forgotScreen"
    ) {

      forgotCode();

    }

    else if (
      activeScreen.id ===
      "gameScreen"
    ) {

      startGame();

    }

  }
);
