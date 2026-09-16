const API_URL =
  "https://script.google.com/macros/s/AKfycbwtM6EpRaz9R09523IEtdiTWbghH2HQ1cVc9CQjAn32r6UsFIfZQ0doSF1PddQjKExgkw/exec";

let currentUser = null;
let currentGame = null;

let team1Score = 0;
let team2Score = 0;
let currentTeam = 1;

let currentQuestion = null;
let answerShown = false;


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

    const result = await response.json();

    return result;

  } catch (error) {

    console.error("API ERROR:", error);

    return {
      success: false,
      message: "تعذر الاتصال بالخادم"
    };

  }

}


/* =========================================================
   LOGIN
   ========================================================= */

async function login() {

  const accountNumber =
    document.getElementById("loginAccount").value.trim();

  const code =
    document.getElementById("loginCode").value.trim();

  const message =
    document.getElementById("loginMessage");


  message.textContent = "جاري تسجيل الدخول...";


  if (!accountNumber || !code) {

    message.textContent =
      "أدخل رقم الحساب والرمز";

    return;

  }


  const result = await apiRequest({

    action: "login",

    accountNumber: accountNumber,

    code: code

  });


  console.log("LOGIN RESULT:", result);


  if (!result.success) {

    message.textContent =
      result.message || "فشل تسجيل الدخول";

    return;

  }


  currentUser = result.user;


  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );


  if (
    String(currentUser.accountNumber) === "3854" &&
    String(currentUser.role).toUpperCase() === "ADMIN"
  ) {

    showScreen("gameScreen");

    updateGameUI();

    return;

  }


  if (
    String(currentUser.status).toUpperCase() !==
    "APPROVED"
  ) {

    const waitingAccount =
      document.getElementById("waitingAccount");

    if (waitingAccount) {

      waitingAccount.textContent =
        currentUser.accountNumber;

    }

    showScreen("waitingScreen");

    return;

  }


  showScreen("gameScreen");

  updateGameUI();

}


/* =========================================================
   REGISTER
   ========================================================= */

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

  const message =
    document.getElementById("registerMessage");


  message.textContent =
    "جاري إنشاء الحساب...";


  if (!nickname || !phone || !email || !code) {

    message.textContent =
      "يرجى تعبئة جميع البيانات";

    return;

  }


  const result =
    await apiRequest({

      action: "register",

      nickname: nickname,

      phone: phone,

      email: email,

      code: code

    });


  console.log("REGISTER RESULT:", result);


  if (!result.success) {

    message.textContent =
      result.message || "فشل إنشاء الحساب";

    return;

  }


  document.getElementById(
    "waitingAccount"
  ).textContent =
    result.accountNumber;


  currentUser = {

    accountNumber:
      result.accountNumber,

    nickname:
      nickname,

    phone:
      phone,

    email:
      email,

    status:
      "PENDING",

    role:
      "USER",

    gamesRemaining:
      0

  };


  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );


  showScreen("waitingScreen");

}


/* =========================================================
   FORGOT CODE
   ========================================================= */

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

  const message =
    document.getElementById("forgotMessage");


  message.textContent =
    "جاري التحقق...";


  if (!accountNumber || !phone || !email) {

    message.textContent =
      "أدخل جميع البيانات";

    return;

  }


  const result =
    await apiRequest({

      action: "forgotCode",

      accountNumber:
        accountNumber,

      phone:
        phone,

      email:
        email

    });


  console.log(
    "FORGOT CODE RESULT:",
    result
  );


  message.textContent =
    result.message ||
    "تمت العملية";

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
    document.getElementById("gameMessage");


  if (!team1 || !team2) {

    message.textContent =
      "أدخل اسم الفريقين";

    return;

  }


  message.textContent =
    "جاري تجهيز اللعبة...";


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


  console.log(
    "CREATE GAME RESULT:",
    result
  );


  if (!result.success) {

    message.textContent =
      result.message ||
      "تعذر بدء اللعبة";

    return;

  }


  currentGame = result;


  localStorage.setItem(
    "currentGame",
    JSON.stringify(result)
  );


  if (
    String(currentUser.accountNumber) !== "3854"
  ) {

    currentUser.gamesRemaining =
      Number(result.gamesRemaining || 0);

  }


  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );


  team1Score = 0;
  team2Score = 0;
  currentTeam = 1;
  currentQuestion = null;
  answerShown = false;


  updateGameUI();


  message.textContent =
    "";


  /*
   * هنا الانتقال الفعلي إلى لوحة اللعبة
   */

  showGameBoard(result);

}


/* =========================================================
   SHOW GAME BOARD
   ========================================================= */

function showGameBoard(game) {

  if (!game) {
    return;
  }


  currentGame = game;


  /*
   * تحديث أسماء الفرق
   */

  const team1Name =
    document.getElementById("team1Name");

  const team2Name =
    document.getElementById("team2Name");


  if (team1Name) {

    team1Name.textContent =
      game.team1 || "الفريق الأول";

  }


  if (team2Name) {

    team2Name.textContent =
      game.team2 || "الفريق الثاني";

  }


  /*
   * تحديث النقاط
   */

  updateScores();


  /*
   * تحديد الدور
   */

  updateTurn();


  /*
   * تصفير السؤال
   */

  clearQuestion();


  /*
   * إظهار لوحة اللعبة
   */

  showScreen("boardScreen");

}


/* =========================================================
   UPDATE GAME UI
   ========================================================= */

function updateGameUI() {

  if (!currentUser) {
    return;
  }


  const nickname =
    document.getElementById("playerNickname");

  const games =
    document.getElementById("gamesRemaining");


  if (nickname) {

    nickname.textContent =
      currentUser.nickname || "";

  }


  if (games) {

    if (
      String(currentUser.accountNumber) === "3854"
    ) {

      games.textContent = "∞";

    } else {

      games.textContent =
        Number(
          currentUser.gamesRemaining || 0
        );

    }

  }

}


/* =========================================================
   UPDATE SCORES
   ========================================================= */

function updateScores() {

  const score1 =
    document.getElementById("team1Score");

  const score2 =
    document.getElementById("team2Score");


  if (score1) {

    score1.textContent =
      team1Score;

  }


  if (score2) {

    score2.textContent =
      team2Score;

  }

}


/* =========================================================
   UPDATE TURN
   ========================================================= */

function updateTurn() {

  const turn =
    document.getElementById("currentTurn");


  if (!turn) {
    return;
  }


  if (currentTeam === 1) {

    turn.textContent =
      "الدور: الفريق الأول";

  } else {

    turn.textContent =
      "الدور: الفريق الثاني";

  }

}


/* =========================================================
   GET RANDOM QUESTION
   ========================================================= */

async function getQuestion(category, points) {

  const result =
    await apiRequest({

      action:
        "getRandomQuestion",

      category:
        category,

      points:
        points

    });


  console.log(
    "QUESTION RESULT:",
    result
  );


  if (!result.success) {

    alert(
      result.message ||
      "لا يوجد سؤال"
    );

    return;

  }


  currentQuestion =
    result.question;

  answerShown = false;


  displayQuestion(
    currentQuestion
  );

}


/* =========================================================
   DISPLAY QUESTION
   ========================================================= */

function displayQuestion(question) {

  if (!question) {
    return;
  }


  const questionText =
    document.getElementById("questionText");

  const answerText =
    document.getElementById("answerText");


  if (questionText) {

    questionText.textContent =
      question.question || "";

  }


  if (answerText) {

    answerText.textContent =
      question.answer || "";

    answerText.style.display =
      "none";

  }


  const answerButton =
    document.getElementById(
      "showAnswerButton"
    );


  if (answerButton) {

    answerButton.style.display =
      "inline-block";

  }


  const correctButton =
    document.getElementById(
      "correctButton"
    );

  const wrongButton =
    document.getElementById(
      "wrongButton"
    );


  if (correctButton) {

    correctButton.style.display =
      "none";

  }


  if (wrongButton) {

    wrongButton.style.display =
      "none";

  }

}


/* =========================================================
   SHOW ANSWER
   ========================================================= */

function showAnswer() {

  if (!currentQuestion) {
    return;
  }


  const answerText =
    document.getElementById(
      "answerText"
    );


  if (answerText) {

    answerText.style.display =
      "block";

  }


  answerShown = true;


  const answerButton =
    document.getElementById(
      "showAnswerButton"
    );

  const correctButton =
    document.getElementById(
      "correctButton"
    );

  const wrongButton =
    document.getElementById(
      "wrongButton"
    );


  if (answerButton) {

    answerButton.style.display =
      "none";

  }


  if (correctButton) {

    correctButton.style.display =
      "inline-block";

  }


  if (wrongButton) {

    wrongButton.style.display =
      "inline-block";

  }

}


/* =========================================================
   ANSWER RESULT
   ========================================================= */

async function answerResult(correct) {

  if (!currentQuestion || !currentGame) {

    return;

  }


  /*
   * تسجيل الإجابة في Google Sheets
   */

  await apiRequest({

    action:
      "submitAnswer",

    gameId:
      currentGame.gameId || "",

    accountNumber:
      currentGame.accountNumber || "",

    team1:
      currentGame.team1 || "",

    team2:
      currentGame.team2 || "",

    category:
      currentQuestion.category || "",

    questionId:
      currentQuestion.id || "",

    question:
      currentQuestion.question || "",

    points:
      Number(currentQuestion.points || 0),

    team:
      currentTeam === 1
        ? currentGame.team1
        : currentGame.team2,

    correct:
      correct

  });


  /*
   * إضافة النقاط إذا كانت الإجابة صحيحة
   */

  if (correct) {

    const points =
      Number(
        currentQuestion.points || 0
      );


    if (currentTeam === 1) {

      team1Score += points;

    } else {

      team2Score += points;

    }

  }


  updateScores();


  /*
   * الانتقال للفريق الثاني بعد الإجابة
   */

  if (currentTeam === 1) {

    currentTeam = 2;

  } else {

    currentTeam = 1;

  }


  updateTurn();


  /*
   * إغلاق السؤال
   */

  clearQuestion();

}


/* =========================================================
   CLEAR QUESTION
   ========================================================= */

function clearQuestion() {

  currentQuestion = null;
  answerShown = false;


  const questionText =
    document.getElementById(
      "questionText"
    );

  const answerText =
    document.getElementById(
      "answerText"
    );


  if (questionText) {

    questionText.textContent =
      "اختر سؤالاً من الجدول";

  }


  if (answerText) {

    answerText.textContent =
      "";

    answerText.style.display =
      "none";

  }


  const answerButton =
    document.getElementById(
      "showAnswerButton"
    );

  const correctButton =
    document.getElementById(
      "correctButton"
    );

  const wrongButton =
    document.getElementById(
      "wrongButton"
    );


  if (answerButton) {

    answerButton.style.display =
      "none";

  }


  if (correctButton) {

    correctButton.style.display =
      "none";

  }


  if (wrongButton) {

    wrongButton.style.display =
      "none";

  }

}


/* =========================================================
   CATEGORY QUESTION BUTTON
   ========================================================= */

function chooseQuestion(category, points) {

  getQuestion(
    category,
    points
  );

}


/* =========================================================
   SHOW SCREEN
   ========================================================= */

function showScreen(screenId) {

  document
    .querySelectorAll(".screen")
    .forEach(screen => {

      screen.classList.remove("active");

    });


  const screen =
    document.getElementById(
      screenId
    );


  if (screen) {

    screen.classList.add("active");

  }

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

  currentUser = null;
  currentGame = null;

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

    const savedUser =
      localStorage.getItem(
        "currentUser"
      );


    if (!savedUser) {
      return;
    }


    currentUser =
      JSON.parse(savedUser);


    if (
      !currentUser ||
      !currentUser.accountNumber
    ) {

      return;

    }


    /*
     * استرجاع اللعبة الحالية إن وجدت
     */

    const savedGame =
      localStorage.getItem(
        "currentGame"
      );


    if (savedGame) {

      try {

        currentGame =
          JSON.parse(savedGame);

      } catch (e) {

        currentGame = null;

      }

    }


    /*
     * ADMIN
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

      const waitingAccount =
        document.getElementById(
          "waitingAccount"
        );


      if (waitingAccount) {

        waitingAccount.textContent =
          currentUser.accountNumber;

      }


      showScreen(
        "waitingScreen"
      );

    }

  } catch (error) {

    console.error(
      "RESTORE ERROR:",
      error
    );


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
