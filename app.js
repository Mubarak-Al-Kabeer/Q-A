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

    return await response.json();

  } catch (error) {
    console.error(error);

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
    message.textContent = "أدخل رقم الحساب والرمز";
    return;
  }

  message.textContent = "جاري تسجيل الدخول...";

  const result = await apiRequest({
    action: "login",
    accountNumber,
    code
  });

  console.log("LOGIN:", result);

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
    String(currentUser.accountNumber) === "3854" ||
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
    document.getElementById("registerNickname").value.trim();

  const phone =
    document.getElementById("registerPhone").value.trim();

  const email =
    document.getElementById("registerEmail").value.trim();

  const code =
    document.getElementById("registerCode").value.trim();

  const message =
    document.getElementById("registerMessage");

  message.textContent = "جاري إنشاء الحساب...";

  const result = await apiRequest({
    action: "register",
    nickname,
    phone,
    email,
    code
  });

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

  message.textContent = "جاري التحقق...";

  const result = await apiRequest({
    action: "forgotCode",
    accountNumber,
    phone,
    email
  });

  message.textContent =
    result.message ||
    "تم التحقق";
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
    team1,
    team2
  });

  console.log("CREATE GAME:", result);

  if (!result.success) {
    message.textContent =
      result.message ||
      "تعذر بدء اللعبة";
    return;
  }

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

  currentUser.gamesRemaining =
    result.gamesRemaining;

  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );

  updateGameUI();

  showGameBoard(result);
}


/* =========================================================
   GAME BOARD
   ========================================================= */

function showGameBoard(game) {

  currentGame = game;

  const oldBoard =
    document.getElementById("gameBoardScreen");

  if (oldBoard) {
    oldBoard.remove();
  }

  const screen =
    document.createElement("section");

  screen.id = "gameBoardScreen";
  screen.className = "screen active";

  screen.innerHTML = `

    <div class="game-board">

      <div class="game-header">

        <h1>🚑 سين جيم الطبي</h1>

        <button
          class="secondary"
          onclick="backToSetup()"
        >
          رجوع
        </button>

      </div>


      <div class="teams">

        <div
          class="team-card team-one"
          id="team1Card"
        >

          <h2>${escapeHtml(game.team1)}</h2>

          <div
            class="score"
            id="team1Score"
          >
            0
          </div>

        </div>


        <div class="turn-box">

          <div class="turn-label">
            الدور
          </div>

          <div
            id="turnText"
            class="turn-team"
          >
            ${escapeHtml(game.team1)}
          </div>

        </div>


        <div
          class="team-card team-two"
          id="team2Card"
        >

          <h2>${escapeHtml(game.team2)}</h2>

          <div
            class="score"
            id="team2Score"
          >
            0
          </div>

        </div>

      </div>


      <div
        id="questionArea"
        class="question-area"
      >

        <h2>اختر الفئة</h2>

        <p>
          اختر قيمة السؤال للبدء
        </p>

      </div>


      <div
        id="categoriesGrid"
        class="categories-grid"
      ></div>


      <div
        id="questionModal"
        class="question-modal hidden"
      ></div>

    </div>
  `;

  document.body.appendChild(screen);

  document
    .querySelectorAll(".screen")
    .forEach(s => {
      if (s.id !== "gameBoardScreen") {
        s.classList.remove("active");
      }
    });

  renderCategories();
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


function renderCategories() {

  const container =
    document.getElementById(
      "categoriesGrid"
    );

  if (!container) return;

  container.innerHTML = "";

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

      button.dataset.category =
        category;

      button.dataset.points =
        points;

      button.onclick = () =>
        chooseQuestion(
          category,
          points,
          button
        );

      column.appendChild(button);

    });

    container.appendChild(column);
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

  if (button.disabled) {
    return;
  }

  button.disabled = true;
  button.classList.add("used");

  const result = await apiRequest({
    action: "getRandomQuestion",
    category,
    points
  });

  console.log("QUESTION:", result);

  if (!result.success) {

    button.disabled = false;
    button.classList.remove("used");

    alert(
      result.message ||
      "لا يوجد سؤال"
    );

    return;
  }

  const question =
    result.question;

  gameState.usedQuestions.push(
    question.id
  );

  showQuestion(
    question,
    category,
    points,
    button
  );
}


/* =========================================================
   SHOW QUESTION
   ========================================================= */

function showQuestion(
  question,
  category,
  points,
  button
) {

  const modal =
    document.getElementById(
      "questionModal"
    );

  modal.classList.remove("hidden");

  modal.innerHTML = `

    <div class="question-card">

      <div class="question-top">

        <span>
          ${escapeHtml(category)}
        </span>

        <strong>
          ${points} نقطة
        </strong>

      </div>


      <h2>
        ${escapeHtml(question.question)}
      </h2>


      <div
        id="answerBox"
        class="answer-box hidden"
      >
        <strong>الإجابة:</strong>
        <p>
          ${escapeHtml(question.answer)}
        </p>
      </div>


      <div class="question-actions">

        <button
          onclick="showAnswer()"
        >
          إظهار الإجابة
        </button>

        <button
          class="correct-button"
          onclick="answerQuestion(true, '${escapeJs(question.id)}', '${escapeJs(question.question)}', '${escapeJs(category)}', ${points})"
        >
          ✓ صحيحة
        </button>

        <button
          class="wrong-button"
          onclick="answerQuestion(false, '${escapeJs(question.id)}', '${escapeJs(question.question)}', '${escapeJs(category)}', ${points})"
        >
          ✗ خاطئة
        </button>

      </div>

    </div>
  `;
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
    box.classList.remove("hidden");
  }
}


/* =========================================================
   ANSWER
   ========================================================= */

async function answerQuestion(
  correct,
  questionId,
  questionText,
  category,
  points
) {

  const team =
    gameState.turn === 1
      ? currentGame.team1
      : currentGame.team2;

  if (correct) {

    if (gameState.turn === 1) {
      gameState.team1Score += points;
    } else {
      gameState.team2Score += points;
    }
  }


  await apiRequest({

    action: "submitAnswer",

    gameId:
      currentGame.gameId,

    accountNumber:
      currentGame.accountNumber,

    team1:
      currentGame.team1,

    team2:
      currentGame.team2,

    category:
      category,

    questionId:
      questionId,

    question:
      questionText,

    points:
      points,

    team:
      team,

    correct:
      correct
  });


  closeQuestion();

  switchTurn();

  updateBoard();
}


/* =========================================================
   SWITCH TURN
   ========================================================= */

function switchTurn() {

  gameState.turn =
    gameState.turn === 1
      ? 2
      : 1;
}


/* =========================================================
   UPDATE BOARD
   ========================================================= */

function updateBoard() {

  const score1 =
    document.getElementById(
      "team1Score"
    );

  const score2 =
    document.getElementById(
      "team2Score"
    );

  const turn =
    document.getElementById(
      "turnText"
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
        ? currentGame.team1
        : currentGame.team2;
  }


  const card1 =
    document.getElementById(
      "team1Card"
    );

  const card2 =
    document.getElementById(
      "team2Card"
    );

  if (card1) {
    card1.classList.toggle(
      "active-team",
      gameState.turn === 1
    );
  }

  if (card2) {
    card2.classList.toggle(
      "active-team",
      gameState.turn === 2
    );
  }
}


/* =========================================================
   CLOSE QUESTION
   ========================================================= */

function closeQuestion() {

  const modal =
    document.getElementById(
      "questionModal"
    );

  if (modal) {
    modal.classList.add("hidden");
    modal.innerHTML = "";
  }
}


/* =========================================================
   BACK TO SETUP
   ========================================================= */

function backToSetup() {

  const board =
    document.getElementById(
      "gameBoardScreen"
    );

  if (board) {
    board.remove();
  }

  showScreen("gameScreen");
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
      String(currentUser.accountNumber) ===
      "3854"
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

  const board =
    document.getElementById(
      "gameBoardScreen"
    );

  if (board) {
    board.remove();
  }

  showScreen("loginScreen");

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
      String(currentUser.accountNumber) ===
      "3854" ||
      String(currentUser.role).toUpperCase() ===
      "ADMIN"
    ) {

      showScreen("gameScreen");
      updateGameUI();
      return;
    }


    if (
      String(currentUser.status).toUpperCase() ===
      "APPROVED"
    ) {

      showScreen("gameScreen");
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
   ESCAPE
   ========================================================= */

function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function escapeJs(value) {

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
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
