const API_URL =
  "https://script.google.com/macros/s/AKfycbwtM6EpRaz9R09523IEtdiTWbghH2HQ1cVc9CQjAn32r6UsFIfZQ0doSF1PddQjKExgkw/exec";

let currentUser = null;
let currentGame = null;

let gameState = {
  team1Score: 0,
  team2Score: 0,
  turn: 1,
  usedQuestions: []
};

let selectedQuestion = null;


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

    const text = await response.text();

    console.log("API RAW:", text);

    let result;

    try {
      result = JSON.parse(text);
    } catch (e) {

      console.error("JSON ERROR:", e);

      return {
        success: false,
        message: "الخادم لم يرجع بيانات صحيحة"
      };
    }

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

  if (!accountNumber || !code) {

    message.textContent =
      "أدخل رقم الحساب والرمز";

    return;
  }

  message.textContent =
    "جاري تسجيل الدخول...";

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

  showScreen("gameScreen");

  updateGameUI();
}


/* =========================================================
   REGISTER
========================================================= */

async function register() {

  const nickname =
    document.getElementById("registerNickname").value.trim();

  const phone =
    document.getElementById("registerPhone").value.trim();

  const email =
    document.getElementById("registerEmail").value.trim();

  const code =
    document.getElementById("registerCode").value.trim();

  const message =
    document.getElementById("registerMessage");

  if (!nickname || !phone || !email || !code) {

    message.textContent =
      "أكمل جميع البيانات";

    return;
  }

  message.textContent =
    "جاري إنشاء الحساب...";

  const result = await apiRequest({
    action: "register",
    nickname: nickname,
    phone: phone,
    email: email,
    code: code
  });

  console.log("REGISTER:", result);

  if (!result.success) {

    message.textContent =
      result.message || "تعذر إنشاء الحساب";

    return;
  }

  message.innerHTML =
    "تم إنشاء الحساب بنجاح.<br>" +
    "رقم حسابك: <strong>" +
    result.accountNumber +
    "</strong>";

  document.getElementById(
    "waitingAccount"
  ).textContent =
    result.accountNumber;

  setTimeout(() => {

    showScreen("waitingScreen");

  }, 1200);
}


/* =========================================================
   FORGOT CODE
========================================================= */

async function forgotCode() {

  const accountNumber =
    document.getElementById("forgotAccount").value.trim();

  const phone =
    document.getElementById("forgotPhone").value.trim();

  const email =
    document.getElementById("forgotEmail").value.trim();

  const message =
    document.getElementById("forgotMessage");

  if (!accountNumber || !phone || !email) {

    message.textContent =
      "أدخل جميع البيانات";

    return;
  }

  message.textContent =
    "جاري التحقق...";

  const result = await apiRequest({
    action: "forgotCode",
    accountNumber: accountNumber,
    phone: phone,
    email: email
  });

  message.textContent =
    result.message || "تم التحقق";
}


/* =========================================================
   START GAME
========================================================= */

async function startGame() {

  if (!currentUser) {

    showScreen("loginScreen");

    return;
  }

  const team1 =
    document.getElementById("team1").value.trim();

  const team2 =
    document.getElementById("team2").value.trim();

  const message =
    document.getElementById("gameMessage");

  if (!team1 || !team2) {

    message.textContent =
      "أدخل اسم الفريقين";

    return;
  }

  message.textContent =
    "جاري تجهيز اللعبة...";

  const result = await apiRequest({

    action: "createGame",

    accountNumber:
      String(currentUser.accountNumber),

    team1: team1,

    team2: team2

  });

  console.log("CREATE GAME RESULT:", result);

  if (!result.success) {

    message.textContent =
      result.message ||
      "تعذر بدء اللعبة";

    return;
  }

  console.log("GAME DATA:", result);

  currentGame = result;

  gameState = {

    team1Score: 0,

    team2Score: 0,

    turn: 1,

    usedQuestions: []

  };

  localStorage.setItem(
    "currentGame",
    JSON.stringify(currentGame)
  );

  if (
    result.gamesRemaining !== undefined
  ) {

    currentUser.gamesRemaining =
      result.gamesRemaining;

    localStorage.setItem(
      "currentUser",
      JSON.stringify(currentUser)
    );
  }

  showScreen("boardScreen");

  setupBoard();

}


/* =========================================================
   SETUP BOARD
========================================================= */

function setupBoard() {

  if (!currentGame) {

    console.error(
      "لا توجد لعبة حالية"
    );

    return;
  }

  const team1 =
    document.getElementById("boardTeam1");

  const team2 =
    document.getElementById("boardTeam2");

  const nickname =
    document.getElementById(
      "boardPlayerNickname"
    );

  if (team1) {

    team1.textContent =
      currentGame.team1 ||
      "الفريق الأول";
  }

  if (team2) {

    team2.textContent =
      currentGame.team2 ||
      "الفريق الثاني";
  }

  if (nickname && currentUser) {

    nickname.textContent =
      currentUser.nickname || "";
  }

  renderCategoryBoard();

  updateBoard();

}


/* =========================================================
   CATEGORIES
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
   RENDER CATEGORY BOARD
========================================================= */

function renderCategoryBoard() {

  const board =
    document.getElementById(
      "categoryBoard"
    );

  if (!board) {

    console.error(
      "categoryBoard غير موجود"
    );

    return;
  }

  board.innerHTML = "";

  CATEGORIES.forEach(category => {

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


    POINTS.forEach(points => {

      const button =
        document.createElement("button");

      button.className =
        "points-button";

      button.textContent =
        points;

      button.type =
        "button";

      button.dataset.category =
        category;

      button.dataset.points =
        points;

      button.addEventListener(
        "click",
        function () {

          chooseQuestion(
            category,
            points,
            button
          );

        }
      );

      column.appendChild(button);

    });

    board.appendChild(column);

  });

}


/* =========================================================
   CHOOSE QUESTION
========================================================= */

async function chooseQuestion(
  category,
  points,
  button
) {

  if (!button) {
    return;
  }

  if (button.disabled) {
    return;
  }

  button.disabled = true;

  button.classList.add("used");

  const message =
    document.getElementById(
      "boardMessage"
    );

  if (message) {

    message.textContent =
      "جاري تحميل السؤال...";
  }


  const result = await apiRequest({

    action: "getRandomQuestion",

    category: category,

    points: points

  });

  console.log(
    "QUESTION RESULT:",
    result
  );


  if (
    !result ||
    !result.success ||
    !result.question
  ) {

    button.disabled = false;

    button.classList.remove("used");

    if (message) {

      message.textContent =
        result?.message ||
        "لا يوجد سؤال لهذه الفئة وهذه النقاط";
    }

    return;
  }


  const question =
    result.question;


  selectedQuestion = {

    id:
      question.id,

    question:
      question.question,

    answer:
      question.answer,

    category:
      category,

    points:
      Number(points),

    button:
      button

  };


  gameState.usedQuestions.push(
    question.id
  );


  showQuestion();

}


/* =========================================================
   SHOW QUESTION
========================================================= */

function showQuestion() {

  if (!selectedQuestion) {
    return;
  }

  const panel =
    document.getElementById(
      "questionPanel"
    );

  const questionText =
    document.getElementById(
      "questionText"
    );

  const answerText =
    document.getElementById(
      "answerText"
    );

  const questionPoints =
    document.getElementById(
      "questionPoints"
    );

  const answerBox =
    document.getElementById(
      "answerBox"
    );


  if (!panel) {

    console.error(
      "questionPanel غير موجود"
    );

    return;
  }


  questionText.textContent =
    selectedQuestion.question ||
    "السؤال غير موجود";


  answerText.textContent =
    selectedQuestion.answer ||
    "لا توجد إجابة";


  questionPoints.textContent =
    selectedQuestion.points;


  answerBox.style.display =
    "none";


  panel.style.display =
    "block";


  panel.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });


  const message =
    document.getElementById(
      "boardMessage"
    );

  if (message) {
    message.textContent = "";
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

  if (!box) {
    return;
  }

  box.style.display =
    "block";

}


/* =========================================================
   ANSWER QUESTION
========================================================= */

async function answerQuestion(correct) {

  if (!selectedQuestion) {
    return;
  }

  const question =
    selectedQuestion;

  const team =
    gameState.turn === 1
      ? currentGame.team1
      : currentGame.team2;


  if (correct) {

    if (gameState.turn === 1) {

      gameState.team1Score +=
        question.points;

    } else {

      gameState.team2Score +=
        question.points;

    }

  }


  const result =
    await apiRequest({

      action: "submitAnswer",

      gameId:
        currentGame.gameId,

      accountNumber:
        currentGame.accountNumber ||
        currentUser.accountNumber,

      team1:
        currentGame.team1,

      team2:
        currentGame.team2,

      category:
        question.category,

      questionId:
        question.id,

      question:
        question.question,

      points:
        question.points,

      team:
        team,

      correct:
        correct

    });


  console.log(
    "SUBMIT ANSWER:",
    result
  );


  closeQuestion();


  switchTurn();


  updateBoard();


  selectedQuestion =
    null;

}


/* =========================================================
   SWITCH TURN
========================================================= */

function switchTurn() {

  if (gameState.turn === 1) {

    gameState.turn = 2;

  } else {

    gameState.turn = 1;

  }

}


/* =========================================================
   UPDATE BOARD
========================================================= */

function updateBoard() {

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


  if (turn && currentGame) {

    turn.textContent =
      gameState.turn === 1
        ? currentGame.team1
        : currentGame.team2;

  }


  const team1 =
    document.querySelector(
      ".team-score.team-one"
    );

  const team2 =
    document.querySelector(
      ".team-score.team-two"
    );


  if (team1) {

    team1.classList.toggle(
      "active-team",
      gameState.turn === 1
    );

  }


  if (team2) {

    team2.classList.toggle(
      "active-team",
      gameState.turn === 2
    );

  }

}


/* =========================================================
   CLOSE QUESTION
========================================================= */

function closeQuestion() {

  const panel =
    document.getElementById(
      "questionPanel"
    );

  if (panel) {

    panel.style.display =
      "none";

  }

  const answerBox =
    document.getElementById(
      "answerBox"
    );

  if (answerBox) {

    answerBox.style.display =
      "none";

  }

}


/* =========================================================
   BACK TO SETUP
========================================================= */

function backToSetup() {

  closeQuestion();

  showScreen(
    "gameScreen"
  );

}


/* =========================================================
   UPDATE GAME UI
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
      String(
        currentUser.accountNumber
      ) === "3854"
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

  currentGame = null;

  selectedQuestion = null;


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


    if (
      String(
        currentUser.accountNumber
      ) === "3854" ||
      String(
        currentUser.role
      ).toUpperCase() === "ADMIN"
    ) {

      showScreen(
        "gameScreen"
      );

      updateGameUI();

      return;
    }


    if (
      String(
        currentUser.status
      ).toUpperCase() === "APPROVED"
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
   RESTORE CURRENT GAME
========================================================= */

function restoreGame() {

  try {

    const saved =
      localStorage.getItem(
        "currentGame"
      );


    if (!saved) {
      return;
    }


    const game =
      JSON.parse(saved);


    if (
      !game ||
      !game.team1 ||
      !game.team2
    ) {

      return;
    }


    currentGame =
      game;


  } catch (error) {

    console.error(
      "GAME RESTORE ERROR:",
      error
    );

    localStorage.removeItem(
      "currentGame"
    );

  }

}


/* =========================================================
   PAGE LOAD
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    restoreGame();

    restoreLogin();

  }
);
