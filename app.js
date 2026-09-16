const API_URL =
  "https://script.google.com/macros/s/AKfycbwtM6EpRaz9R09523IEtdiTWbghH2HQ1cVc9CQjAn32r6UsFIfZQ0doSF1PddQjKExgkw/exec";

let currentUser = null;

let game = {
  id: null,
  team1: "",
  team2: "",
  scores: [0, 0],
  turn: 0,
  used: {},
  selected: null
};


/* =========================
   SCREEN
========================= */

function showScreen(id) {

  document.querySelectorAll(".screen")
    .forEach(screen => {
      screen.classList.remove("active");
    });

  const screen = document.getElementById(id);

  if (screen) {
    screen.classList.add("active");
  }
}


/* =========================
   MESSAGE
========================= */

function showMessage(elementId, message, type = "error") {

  const element = document.getElementById(elementId);

  if (!element) return;

  element.textContent = message;

  element.className =
    "message show " + type;
}


/* =========================
   API
========================= */

async function api(action, data = {}) {

  try {

    const response = await fetch(API_URL, {

      method: "POST",

      headers: {
        "Content-Type":
          "text/plain;charset=utf-8"
      },

      body: JSON.stringify({
        action,
        ...data
      })

    });

    const result = await response.json();

    return result;

  } catch (error) {

    console.error(error);

    return {
      success: false,
      message: "تعذر الاتصال بالخادم"
    };

  }
}


/* =========================
   REGISTER
========================= */

async function register() {

  const nickname =
    document.getElementById("registerNickname").value.trim();

  const phone =
    document.getElementById("registerPhone").value.trim();

  const email =
    document.getElementById("registerEmail").value.trim();

  const code =
    document.getElementById("registerCode").value.trim();


  if (!nickname || !phone || !email || !code) {

    showMessage(
      "registerMessage",
      "يرجى تعبئة جميع البيانات"
    );

    return;
  }


  const result = await api("register", {
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


  document.getElementById(
    "waitingAccount"
  ).textContent =
    result.accountNumber;


  showScreen("waitingScreen");
}


/* =========================
   LOGIN
========================= */

async function login() {

  const accountNumber =
    document.getElementById("loginAccount").value.trim();

  const code =
    document.getElementById("loginCode").value.trim();


  if (!accountNumber || !code) {

    showMessage(
      "loginMessage",
      "أدخل رقم الحساب والرمز"
    );

    return;
  }


  const result = await api("login", {
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


  currentUser = result.user;


  if (result.user.status === "PENDING") {

    document.getElementById(
      "waitingAccount"
    ).textContent =
      result.user.accountNumber;

    showScreen("waitingScreen");

    return;
  }


  if (result.user.status === "REJECTED") {

    showMessage(
      "loginMessage",
      "تم رفض الحساب من المسؤول"
    );

    return;
  }


  if (result.user.status !== "APPROVED") {

    showMessage(
      "loginMessage",
      "الحساب غير مفعل"
    );

    return;
  }


  document.getElementById(
    "playerNickname"
  ).textContent =
    result.user.nickname;


  document.getElementById(
    "gamesRemaining"
  ).textContent =
    result.user.gamesRemaining;


  showScreen("gameScreen");
}


/* =========================
   FORGOT CODE
========================= */

async function forgotCode() {

  const accountNumber =
    document.getElementById("forgotAccount").value.trim();

  const phone =
    document.getElementById("forgotPhone").value.trim();

  const email =
    document.getElementById("forgotEmail").value.trim();


  if (!accountNumber || !phone || !email) {

    showMessage(
      "forgotMessage",
      "أدخل جميع البيانات"
    );

    return;
  }


  const result = await api("forgotCode", {

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
    "تم التحقق من البيانات.",
    "success"
  );
}


/* =========================
   START GAME
========================= */

async function startGame() {

  const team1 =
    document.getElementById("team1").value.trim();

  const team2 =
    document.getElementById("team2").value.trim();


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
    Number(currentUser.gamesRemaining) <= 0
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


  game = {

    id: result.gameId,

    team1,

    team2,

    scores: [0, 0],

    turn: 0,

    used: {},

    selected: null

  };


  document.getElementById(
    "gamesRemaining"
  ).textContent =
    result.gamesRemaining;


  await loadGameBoard();

}


/* =========================
   LOAD QUESTIONS
========================= */

async function loadGameBoard() {

  const result =
    await api("getQuestions");


  if (!result.success) {

    showMessage(
      "gameMessage",
      result.message ||
      "تعذر تحميل الأسئلة"
    );

    return;
  }


  createBoard(
    result.questions || []
  );


  updateGameUI();

  showScreen("gameScreen");
}


/* =========================
   CREATE BOARD
========================= */

function createBoard(questions) {

  const board =
    document.getElementById("gameBoard");


  if (!board) {

    createBoardElement();

  }


  const gameBoard =
    document.getElementById("gameBoard");


  gameBoard.innerHTML = "";


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


  categories.forEach(category => {

    const column =
      document.createElement("div");

    column.className = "category";


    const title =
      document.createElement("div");

    title.className =
      "category-title";

    title.textContent =
      category;

    column.appendChild(title);


    points.forEach(point => {

      const button =
        document.createElement("button");

      button.className =
        "question";

      button.textContent =
        point;


      const matching =
        questions.filter(q =>
          q.category === category &&
          Number(q.points) === point
        );


      if (matching.length === 0) {

        button.disabled = true;

        button.classList.add("used");

      } else {

        button.onclick = () =>
          openQuestion(
            category,
            point,
            button
          );

      }


      column.appendChild(button);

    });


    gameBoard.appendChild(column);

  });
}


/* =========================
   CREATE BOARD ELEMENT
========================= */

function createBoardElement() {

  const gameScreen =
    document.getElementById("gameScreen");


  if (!gameScreen) return;


  const board =
    document.createElement("div");

  board.id = "gameBoard";

  board.className = "board";


  const gameCard =
    gameScreen.querySelector(".game-card");


  if (gameCard) {

    gameCard.innerHTML = "";

    gameCard.appendChild(board);

  } else {

    gameScreen.appendChild(board);

  }
}


/* =========================
   OPEN QUESTION
========================= */

async function openQuestion(
  category,
  points,
  button
) {

  button.disabled = true;

  button.classList.add("used");


  const result =
    await api("getRandomQuestion", {

      category,
      points

    });


  if (!result.success) {

    button.disabled = false;

    button.classList.remove("used");

    alert(
      result.message ||
      "لا يوجد سؤال"
    );

    return;
  }


  game.selected = {

    category,

    points,

    button,

    question:
      result.question

  };


  showQuestionModal(
    result.question,
    category,
    points
  );
}


/* =========================
   QUESTION MODAL
========================= */

function showQuestionModal(
  question,
  category,
  points
) {

  let modal =
    document.getElementById("questionModal");


  if (!modal) {

    createQuestionModal();

    modal =
      document.getElementById(
        "questionModal"
      );

  }


  document.getElementById(
    "modalCategory"
  ).textContent =
    category;


  document.getElementById(
    "modalPoints"
  ).textContent =
    points + " نقطة";


  document.getElementById(
    "modalQuestion"
  ).textContent =
    question.question;


  document.getElementById(
    "modalAnswer"
  ).textContent =
    question.answer;


  document.getElementById(
    "modalAnswer"
  ).style.display =
    "none";


  document.getElementById(
    "modalActions"
  ).style.display =
    "none";


  document.getElementById(
    "showAnswerButton"
  ).style.display =
    "block";


  modal.classList.add("active");
}


/* =========================
   CREATE MODAL
========================= */

function createQuestionModal() {

  const modal =
    document.createElement("div");

  modal.id =
    "questionModal";

  modal.className =
    "modal";


  modal.innerHTML = `

    <div class="modal-box">

      <div
        id="modalCategory"
        class="modal-category">
      </div>

      <div
        id="modalPoints"
        class="modal-points">
      </div>

      <div
        id="modalQuestion"
        class="question-text">
      </div>

      <button
        id="showAnswerButton"
        class="primary"
        onclick="showAnswer()">
        إظهار الإجابة
      </button>

      <div
        id="modalAnswer"
        class="answer">
      </div>

      <div
        id="modalActions"
        class="actions">

        <button
          class="green"
          onclick="answerQuestion(true)">
          ✓ إجابة صحيحة
        </button>

        <button
          class="red"
          onclick="answerQuestion(false)">
          ✗ إجابة خاطئة
        </button>

        <button
          class="gray"
          onclick="skipQuestion()">
          تجاوز
        </button>

      </div>

    </div>

  `;


  document.body.appendChild(modal);
}


/* =========================
   SHOW ANSWER
========================= */

function showAnswer() {

  document.getElementById(
    "modalAnswer"
  ).style.display =
    "block";


  document.getElementById(
    "modalActions"
  ).style.display =
    "grid";


  document.getElementById(
    "showAnswerButton"
  ).style.display =
    "none";
}


/* =========================
   ANSWER QUESTION
========================= */

async function answerQuestion(correct) {

  const selected =
    game.selected;


  if (!selected) return;


  const currentTeam =
    game.turn === 0
      ? game.team1
      : game.team2;


  if (correct) {

    game.scores[game.turn] +=
      Number(selected.points);

  }


  const result =
    await api("submitAnswer", {

      gameId:
        game.id,

      team1:
        game.team1,

      team2:
        game.team2,

      category:
        selected.category,

      questionId:
        selected.question.id,

      question:
        selected.question.question,

      points:
        selected.points,

      team:
        currentTeam,

      correct

    });


  if (!result.success) {

    alert(
      result.message ||
      "حدث خطأ في تسجيل النتيجة"
    );

    return;
  }


  finishQuestion();
}


/* =========================
   SKIP QUESTION
========================= */

async function skipQuestion() {

  const selected =
    game.selected;


  if (!selected) return;


  const currentTeam =
    game.turn === 0
      ? game.team1
      : game.team2;


  const result =
    await api("submitAnswer", {

      gameId:
        game.id,

      team1:
        game.team1,

      team2:
        game.team2,

      category:
        selected.category,

      questionId:
        selected.question.id,

      question:
        selected.question.question,

      points:
        selected.points,

      team:
        currentTeam,

      correct: false

    });


  if (!result.success) {

    alert(
      result.message ||
      "حدث خطأ"
    );

    return;
  }


  finishQuestion();
}


/* =========================
   FINISH QUESTION
========================= */

function finishQuestion() {

  if (!game.selected) return;


  game.used[
    game.selected.question.id
  ] = true;


  game.turn =
    game.turn === 0
      ? 1
      : 0;


  closeModal();

  updateGameUI();

  checkGameEnd();
}


/* =========================
   UPDATE GAME UI
========================= */

function updateGameUI() {

  const team1Name =
    document.getElementById(
      "team1Name"
    );

  const team2Name =
    document.getElementById(
      "team2Name"
    );

  const score1 =
    document.getElementById(
      "score1"
    );

  const score2 =
    document.getElementById(
      "score2"
    );

  const turnName =
    document.getElementById(
      "turnName"
    );


  if (team1Name)
    team1Name.textContent =
      game.team1;


  if (team2Name)
    team2Name.textContent =
      game.team2;


  if (score1)
    score1.textContent =
      game.scores[0];


  if (score2)
    score2.textContent =
      game.scores[1];


  if (turnName)
    turnName.textContent =
      game.turn === 0
        ? game.team1
        : game.team2;


  const team1Card =
    document.getElementById(
      "team1Card"
    );

  const team2Card =
    document.getElementById(
      "team2Card"
    );


  if (team1Card) {

    team1Card.classList.toggle(
      "active",
      game.turn === 0
    );

  }


  if (team2Card) {

    team2Card.classList.toggle(
      "active",
      game.turn === 1
    );

  }
}


/* =========================
   CHECK END
========================= */

function checkGameEnd() {

  const totalCells =
    6 * 5;


  const usedCount =
    Object.keys(game.used).length;


  if (usedCount >= totalCells) {

    endGame();

  }
}


/* =========================
   END GAME
========================= */

function endGame() {

  let winner;


  if (
    game.scores[0] >
    game.scores[1]
  ) {

    winner =
      game.team1;

  } else if (
    game.scores[1] >
    game.scores[0]
  ) {

    winner =
      game.team2;

  } else {

    winner =
      "تعادل";

  }


  let endScreen =
    document.getElementById(
      "endScreen"
    );


  if (!endScreen) {

    endScreen =
      document.createElement(
        "section"
      );

    endScreen.id =
      "endScreen";

    endScreen.className =
      "screen";


    endScreen.innerHTML = `

      <div class="card end-card">

        <h1>
          🏆 انتهت اللعبة
        </h1>

        <div
          id="finalWinner"
          class="winner">
        </div>

        <div
          id="finalScores">
        </div>

        <button
          onclick="showScreen('gameScreen')">
          لعبة جديدة
        </button>

      </div>

    `;


    document.getElementById(
      "app"
    ).appendChild(endScreen);

  }


  document.getElementById(
    "finalWinner"
  ).textContent =
    winner;


  document.getElementById(
    "finalScores"
  ).innerHTML = `

    <p>
      ${game.team1}:
      <strong>
        ${game.scores[0]}
      </strong>
    </p>

    <p>
      ${game.team2}:
      <strong>
        ${game.scores[1]}
      </strong>
    </p>

  `;


  showScreen("endScreen");
}


/* =========================
   CLOSE MODAL
========================= */

function closeModal() {

  const modal =
    document.getElementById(
      "questionModal"
    );


  if (modal) {

    modal.classList.remove(
      "active"
    );

  }


  game.selected =
    null;
}


/* =========================
   LOGOUT
========================= */

function logout() {

  currentUser = null;

  game = {

    id: null,

    team1: "",

    team2: "",

    scores: [0, 0],

    turn: 0,

    used: {},

    selected: null

  };


  const loginAccount =
    document.getElementById(
      "loginAccount"
    );

  const loginCode =
    document.getElementById(
      "loginCode"
    );


  if (loginAccount)
    loginAccount.value = "";


  if (loginCode)
    loginCode.value = "";


  showScreen(
    "loginScreen"
  );
}
