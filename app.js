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
   API REQUEST
========================================================= */

async function apiRequest(data) {

  try {

    console.log("API REQUEST:", data);


    const response =
      await fetch(API_URL, {

        method: "POST",

        headers: {

          "Content-Type":
            "text/plain;charset=utf-8"

        },

        body:
          JSON.stringify(data)

      });


    if (!response.ok) {

      throw new Error(
        "HTTP " +
        response.status
      );

    }


    const text =
      await response.text();


    console.log(
      "API RAW RESPONSE:",
      text
    );


    let result;


    try {

      result =
        JSON.parse(text);

    } catch (e) {

      console.error(
        "JSON ERROR:",
        e
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
   ADMIN CHECK
========================================================= */

function isAdmin() {

  if (!currentUser) {

    return false;

  }


  return (

    String(
      currentUser.accountNumber
    ) === ADMIN_ACCOUNT

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

      accountNumber:
        accountNumber,

      code:
        code

    });


  console.log(
    "LOGIN RESULT:",
    result
  );


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

    JSON.stringify(
      currentUser
    )

  );


  message.textContent = "";


  /*
   * المسؤول
   */

  if (isAdmin()) {

    showScreen(
      "gameScreen"
    );

    updateGameUI();

    showAdminMenu();

    return;

  }


  /*
   * المستخدم العادي
   */

  if (

    String(
      currentUser.status || ""
    ).toUpperCase() !==
    "APPROVED"

  ) {

    const waiting =
      document.getElementById(
        "waitingAccount"
      );


    if (waiting) {

      waiting.textContent =
        currentUser.accountNumber;

    }


    showScreen(
      "waitingScreen"
    );

    return;

  }


  showScreen(
    "gameScreen"
  );


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

    message.textContent =
      "أكمل جميع البيانات";

    return;

  }


  message.textContent =
    "جاري إنشاء الحساب...";


  const result =
    await apiRequest({

      action: "register",

      nickname,

      phone,

      email,

      code

    });


  console.log(
    "REGISTER:",
    result
  );


  if (!result.success) {

    message.textContent =
      result.message ||
      "تعذر إنشاء الحساب";

    return;

  }


  message.innerHTML =
    "تم إنشاء الحساب بنجاح.<br>" +
    "رقم حسابك: <strong>" +
    escapeHtml(
      result.accountNumber
    ) +
    "</strong>";


  const waiting =
    document.getElementById(
      "waitingAccount"
    );


  if (waiting) {

    waiting.textContent =
      result.accountNumber;

  }


  setTimeout(
    () => {

      showScreen(
        "waitingScreen"
      );

    },
    1200
  );

}


/* =========================================================
   FORGOT CODE
========================================================= */

async function forgotCode() {

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


  const message =
    document.getElementById(
      "forgotMessage"
    );


  if (
    !accountNumber ||
    !phone ||
    !email
  ) {

    message.textContent =
      "أدخل جميع البيانات";

    return;

  }


  message.textContent =
    "جاري التحقق...";


  const result =
    await apiRequest({

      action: "forgotCode",

      accountNumber,

      phone,

      email

    });


  message.textContent =
    result.message ||
    (
      result.success
        ? "تم التحقق بنجاح"
        : "تعذر استرجاع الرمز"
    );

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


  const backButton =
    document.getElementById(
      "adminBackButton"
    );


  if (backButton) {

    backButton.style.display =
      isAdmin()
        ? "block"
        : "none";
