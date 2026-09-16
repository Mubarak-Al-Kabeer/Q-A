/* =========================================================
   سين جيم الطبي
   APP.JS
   ========================================================= */

const API_URL =
  "https://script.google.com/macros/s/AKfycbwtM6EpRaz9R09523IEtdiTWbghH2HQ1cVc9CQjAn32r6UsFIfZQ0doSF1PddQjKExgkw/exec";


let currentUser = null;

let currentGame = null;

let currentQuestion = null;

let currentTurn = 1;

let score1 = 0;

let score2 = 0;

let usedBoardCells = {};


/* =========================================================
   API
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


    console.log("API:", data.action, result);


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
   SHOW SCREEN
   ========================================================= */

function showScreen(screenId) {

  document
    .querySelectorAll(".screen")
    .forEach(screen => {

      screen.classList.remove("active");

    });


  const screen =
    document.getElementById(screenId);


  if (screen) {

    screen.classList.add("active");

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


  if (
    String(currentUser.accountNumber) === "3854"
  ) {

    showScreen("gameScreen");

    updateGameUI();

    return;

  }


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
      "يرجى تعبئة جميع البيانات";

    return;

  }


  message.textContent =
    "جاري إنشاء الحساب...";


  const result =
    await apiRequest({

      action: "register",

      nickname:
        nickname,

      phone:
        phone,

      email:
        email,

      code:
        code

    });


  if (!result.success) {

    message.textContent =
      result.message ||
      "تعذر إنشاء الحساب";

    return;

  }


  message.textContent =
    "تم إنشاء الحساب بنجاح";


  document.getElementById(
    "waitingAccount"
  ).textContent =
    result.accountNumber;


  setTimeout(
    () => {

      showScreen(
        "waitingScreen"
      );

    },
    500
  );

}


/* =========================================================
   FORGOT
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
    document.getElementById(
      "forgotMessage"
    );


  message.textContent =
    "جاري التحقق...";


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


  message.textContent =
    result.message ||
    "";

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
   START GAME
   ========================================================= */

async function startGame() {

  if (!currentUser) {

    alert(
      "يجب تسجيل الدخول أولاً"
    );

    showScreen(
      "loginScreen"
    );

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


  const result =
    await apiRequest({

      action: "createGame",

      accountNumber:
        String(
          currentUser.accountNumber
        ),

      team1:
        team1,

      team2:
        team2

    });


  if (!result.success) {

    message.textContent =
      result.message ||
      "تعذر بدء اللعبة";

    return;

  }


  currentGame =
    result;


  localStorage.setItem(
    "currentGame",
    JSON.stringify(currentGame)
  );


  if (
    String(currentUser.accountNumber) !==
    "3854"
  ) {

    currentUser.gamesRemaining =
      Number(
        result.gamesRemaining || 0
      );

    localStorage.setItem(
      "currentUser",
      JSON.stringify(currentUser)
    );

  }


  score1 = 0;

  score2 = 0;

  currentTurn = 1;

  usedBoardCells = {};

  currentQuestion = null;


  /*
   * هنا الانتقال الحقيقي
   * إلى لوحة اللعبة
   */

  showGameBoard(result);

}


/* =========================================================
   SHOW GAME BOARD
   ========================================================= */

function showGameBoard(game) {

  currentGame =
    game;


  const team1 =
    document.getElementById(
      "boardTeam1"
    );


  const team2 =
    document.getElementById(
      "boardTeam2"
    );


  const nickname =
    document.getElementById(
      "boardPlayerNickname"
    );


  if (team1) {

    team1.textContent =
      game.team1;

  }


  if (team2) {

    team2.textContent =
      game.team2;

  }


  if (nickname && currentUser) {

    nickname.textContent =
      currentUser.nickname || "";

  }


  updateScores();

  createCategoryBoard();

  hideQuestion();

  showScreen(
    "boardScreen"
  );

}


/* =========================================================
   CREATE CATEGORY BOARD
   ========================================================= */

function createCategoryBoard() {

  const board =
    document.getElementById(
      "categoryBoard"
    );


  if (!board) {
    return;
  }


  board.innerHTML = "";


  const categories = [

    "التشريح",

    "الإحالة",

    "الأدوات والمعدات",

    "العلامات الحيوية",

    "الأدوية",

    "الطوارئ والإسعافات"

  ];


  const points = [

    100,

    200,

    300,

    400,

    500

  ];


  categories.forEach(
    category => {

      const column =
        document.createElement(
          "div"
        );


      column.className =
        "category-column";


      const title =
        document.createElement(
          "div"
        );


      title.className =
        "category-title";


      title.textContent =
        category;


      column.appendChild(
        title
      );


      points.forEach(
        point => {

          const button =
            document.createElement(
              "button"
            );


          button.className =
            "points-button";


          button.textContent =
            point;


          const key =
            category +
            "_" +
            point;


          button.dataset.key =
            key;


          button.onclick =
            function () {

              selectQuestion(
                category,
                point,
                button
              );

            };


          column.appendChild(
            button
          );

        }
      );


      board.appendChild(
        column
      );

    }
  );

}


/* =========================================================
   SELECT QUESTION
   ========================================================= */

async function selectQuestion(
  category,
  points,
  button
) {

  const key =
    category +
    "_" +
    points;


  if (
    usedBoardCells[key]
  ) {

    return;

  }


  const message =
    document.getElementById(
      "boardMessage"
    );


  message.textContent =
    "جاري تحميل السؤال...";


  const result =
    await apiRequest({

      action:
        "getRandomQuestion",

      category:
        category,

      points:
        points

    });


  if (!result.success) {

    message.textContent =
      result.message ||
      "لا يوجد سؤال";

    return;

  }


  currentQuestion =
    result.question;


  currentQuestion.boardKey =
    key;


  currentQuestion.button =
    button;


  showQuestion(
    currentQuestion
  );


  message.textContent =
    "";

}


/* =========================================================
   SHOW QUESTION
   ========================================================= */

function showQuestion(
  question
) {

  const panel =
    document.getElementById(
      "questionPanel"
    );


  const text =
    document.getElementById(
      "questionText"
    );


  const points =
    document.getElementById(
      "questionPoints"
    );


  const answerBox =
    document.getElementById(
      "answerBox"
    );


  const answerText =
    document.getElementById(
      "answerText"
    );


  if (text) {

    text.textContent =
      question.question;

  }


  if (points) {

    points.textContent =
      question.points;

  }


  if (answerText) {

    answerText.textContent =
      question.answer || "";

  }


  if (answerBox) {

    answerBox.style.display =
      "none";

  }


  if (panel) {

    panel.style.display =
      "block";

    panel.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  }

}


/* =========================================================
   SHOW ANSWER
   ========================================================= */

function showAnswer() {

  const box =
    document.getElementById(
      "answerBox"
    );


  if (box) {

    box.style.display =
      "block";

  }

}


/* =========================================================
   ANSWER QUESTION
   ========================================================= */

async function answerQuestion(
  correct
) {

  if (!currentQuestion) {

    return;

  }


  const team =
    currentTurn === 1
      ? currentGame.team1
      : currentGame.team2;


  /*
   * تسجيل الإجابة
   */

  await apiRequest({

    action:
      "submitAnswer",

    gameId:
      currentGame.gameId,

    accountNumber:
      currentGame.accountNumber,

    team1:
      currentGame.team1,

    team2:
      currentGame.team2,

    category:
      currentQuestion.category,

    questionId:
      currentQuestion.id,

    question:
      currentQuestion.question,

    points:
      currentQuestion.points,

    team:
      team,

    correct:
      correct

  });


  /*
   * إضافة النقاط
   */

  if (correct) {

    if (currentTurn === 1) {

      score1 +=
        Number(
          currentQuestion.points
        );

    } else {

      score2 +=
        Number(
          currentQuestion.points
        );

    }

  }


  /*
   * تعطيل الخانة
   */

  const key =
    currentQuestion.boardKey;


  usedBoardCells[key] =
    true;


  if (
    currentQuestion.button
  ) {

    currentQuestion.button.disabled =
      true;

    currentQuestion.button.classList.add(
      "used"
    );

    currentQuestion.button.textContent =
      "✓";

  }


  updateScores();


  hideQuestion();


  /*
   * تبديل الدور
   */

  if (currentTurn === 1) {

    currentTurn = 2;

  } else {

    currentTurn = 1;

  }


  updateTurn();


  currentQuestion =
    null;

}


/* =========================================================
   HIDE QUESTION
   ========================================================= */

function hideQuestion() {

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
   UPDATE SCORES
   ========================================================= */

function updateScores() {

  const s1 =
    document.getElementById(
      "score1"
    );


  const s2 =
    document.getElementById(
      "score2"
    );


  if (s1) {

    s1.textContent =
      score1;

  }


  if (s2) {

    s2.textContent =
      score2;

  }


  updateTurn();

}


/* =========================================================
   UPDATE TURN
   ========================================================= */

function updateTurn() {

  const turn =
    document.getElementById(
      "currentTurn"
    );


  if (!turn || !currentGame) {
    return;
  }


  turn.textContent =
    currentTurn === 1
      ? currentGame.team1
      : currentGame.team2;

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

  currentUser = null;

  currentGame = null;

  currentQuestion = null;

  score1 = 0;

  score2 = 0;

  currentTurn = 1;

  usedBoardCells = {};


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
     * المسؤول
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
     * المستخدم المقبول
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
