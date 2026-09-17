  }

}


/* =========================================================
   SHOW SCREEN
========================================================= */

function showScreen(screenId) {

  const screens =
    document.querySelectorAll(".screen");

  screens.forEach(screen => {

    screen.classList.remove("active");

  });


  const target =
    document.getElementById(screenId);

  if (target) {

    target.classList.add("active");

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
    document.getElementById(
      "playerNickname"
    );


  if (nickname) {

    nickname.textContent =
      currentUser.nickname || "";

  }


  const boardNickname =
    document.getElementById(
      "boardPlayerNickname"
    );


  if (boardNickname) {

    boardNickname.textContent =
      currentUser.nickname || "";

  }


  const gamesRemaining =
    document.getElementById(
      "gamesRemaining"
    );


  if (gamesRemaining) {

    gamesRemaining.textContent =
      currentUser.gamesRemaining || 0;

  }

}


/* =========================================================
   START GAME
========================================================= */

function startGame() {

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
      "أدخل اسم الفريقين أولاً";

    return;

  }


  if (team1 === team2) {

    message.textContent =
      "يجب أن يكون اسم الفريقين مختلفًا";

    return;

  }


  currentGame = {

    team1: team1,

    team2: team2

  };


  gameState = {

    team1Score: 0,

    team2Score: 0,

    turn: 1,

    usedQuestions: []

  };


  showScreen("boardScreen");

  updateBoardUI();

  buildCategoryBoard();


  const questionPanel =
    document.getElementById(
      "questionPanel"
    );


  if (questionPanel) {

    questionPanel.style.display =
      "none";

  }

}


/* =========================================================
   UPDATE BOARD
========================================================= */

function updateBoardUI() {

  if (!currentGame) {
    return;
  }


  const team1 =
    document.getElementById(
      "boardTeam1"
    );


  const team2 =
    document.getElementById(
      "boardTeam2"
    );


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


  if (team1) {

    team1.textContent =
      currentGame.team1;

  }


  if (team2) {

    team2.textContent =
      currentGame.team2;

  }


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


  CATEGORIES.forEach(
    (category, categoryIndex) => {

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


      POINTS.forEach(
        (points, pointsIndex) => {

          const button =
            document.createElement("button");

          button.className =
            "points-button";

          button.textContent =
            points;


          const questionId =
            categoryIndex +
            "-" +
            pointsIndex;


          if (
            gameState.usedQuestions
              .includes(questionId)
          ) {

            button.classList.add("used");

            button.disabled = true;

          }


          button.onclick =
            () => openQuestion(
              category,
              points,
              questionId
            );


          column.appendChild(button);

        }
      );


      board.appendChild(column);

    }
  );

}


/* =========================================================
   OPEN QUESTION
========================================================= */

function openQuestion(
  category,
  points,
  questionId
) {

  if (
    gameState.usedQuestions
      .includes(questionId)
  ) {

    return;

  }


  currentQuestion = {

    category,

    points,

    questionId

  };


  const categoryElement =
    document.getElementById(
      "questionCategory"
    );


  const pointsElement =
    document.getElementById(
      "questionPoints"
    );


  const questionElement =
    document.getElementById(
      "questionText"
    );


  const answerBox =
    document.getElementById(
      "answerBox"
    );


  if (categoryElement) {

    categoryElement.textContent =
      category;

  }


  if (pointsElement) {

    pointsElement.textContent =
      points;

  }


  if (questionElement) {

    questionElement.textContent =
      "السؤال غير مضاف بعد";

  }


  if (answerBox) {

    answerBox.style.display =
      "none";

  }


  const questionPanel =
    document.getElementById(
      "questionPanel"
    );


  if (questionPanel) {

    questionPanel.style.display =
      "block";

    questionPanel.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  }

}


/* =========================================================
   SHOW ANSWER
========================================================= */

function showAnswer() {

  const answerBox =
    document.getElementById(
      "answerBox"
    );


  const answerText =
    document.getElementById(
      "answerText"
    );


  if (!answerBox || !answerText) {
    return;
  }


  answerText.textContent =
    "الإجابة غير مضافة بعد";


  answerBox.style.display =
    "block";

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
      currentQuestion.points
    );


  if (correct) {

    if (gameState.turn === 1) {

      gameState.team1Score += points;

    } else {

      gameState.team2Score += points;

    }

  }


  gameState.usedQuestions.push(
    currentQuestion.questionId
  );


  gameState.turn =
    gameState.turn === 1
      ? 2
      : 1;


  currentQuestion = null;


  const questionPanel =
    document.getElementById(
      "questionPanel"
    );


  if (questionPanel) {

    questionPanel.style.display =
      "none";

  }


  buildCategoryBoard();

  updateBoardUI();

}


/* =========================================================
   BACK TO SETUP
========================================================= */

function backToSetup() {

  currentQuestion = null;


  const questionPanel =
    document.getElementById(
      "questionPanel"
    );


  if (questionPanel) {

    questionPanel.style.display =
      "none";

  }


  showScreen("gameScreen");


  if (isAdmin()) {

    showGameSetup();

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


  localStorage.removeItem(
    "currentUser"
  );


  showScreen(
    "loginScreen"
  );


  const loginMessage =
    document.getElementById(
      "loginMessage"
    );


  if (loginMessage) {

    loginMessage.textContent = "";

  }

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   ESCAPE JS
========================================================= */

function escapeJs(value) {

  return String(
    value ?? ""
  )
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");

}


/* =========================================================
   LOAD SAVED LOGIN
========================================================= */

function loadSavedUser() {

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


  } catch (error) {

    console.error(
      "LOAD USER ERROR:",
      error
    );


    localStorage.removeItem(
      "currentUser"
    );

  }

}


/* =========================================================
   STARTUP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    showScreen("loginScreen");

    loadSavedUser();

  }
);
