/* =========================================================
   سين جيم الطبي
   GitHub Frontend
   لا توجد هنا بيانات حسابات أو كلمات مرور
========================================================= */

const API_URL =
  "https://script.google.com/macros/s/AKfycbwtM6EpRaz9R09523IEtdiTWbghH2HQ1cVc9CQjAn32r6UsFIfZQ0doSF1PddQjKExgkw/exec";


/* =========================================================
   حالة المستخدم
========================================================= */

let currentUser = null;

let currentGame = {
  gameId: null,
  team1: "",
  team2: "",
  score1: 0,
  score2: 0,
  turn: 0,
  used: {},
  selected: null
};


/* =========================================================
   التنقل بين الصفحات
========================================================= */

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


/* =========================================================
   الرسائل
========================================================= */

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


/* =========================================================
   تنظيف الرسائل
========================================================= */

function clearMessage(elementId) {

  const element =
    document.getElementById(elementId);

  if (!element) return;

  element.textContent = "";

  element.className =
    "message";
}


/* =========================================================
   الاتصال بـ Google Apps Script
========================================================= */

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


    if (!response.ok) {

      throw new Error(
        "HTTP " + response.status
      );

    }


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


/* =========================================================
   إنشاء حساب
========================================================= */

async function register() {

  clearMessage(
    "registerMessage"
  );


  const nickname =
    document
      .getElementById(
        "registerNickname"
      )
      ?.value
      .trim();


  const phone =
    document
      .getElementById(
        "registerPhone"
      )
      ?.value
      .trim();


  const email =
    document
      .getElementById(
        "registerEmail"
      )
      ?.value
      .trim();


  const code =
    document
      .getElementById(
        "registerCode"
      )
      ?.value
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
    await api(
      "register",
      {
        nickname,
        phone,
        email,
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


  const waitingAccount =
    document.getElementById(
      "waitingAccount"
    );


  if (waitingAccount) {

    waitingAccount.textContent =
      result.accountNumber || "";

  }


  showScreen(
    "waitingScreen"
  );

}


/* =========================================================
   تسجيل الدخول
========================================================= */

async function login() {

  clearMessage(
    "loginMessage"
  );


  const accountNumber =
    document
      .getElementById(
        "loginAccount"
      )
      ?.value
      .trim();


  const code =
    document
      .getElementById(
        "loginCode"
      )
      ?.value
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
        accountNumber,
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


  /* -----------------------------------------
     الحساب بانتظار الموافقة
  ----------------------------------------- */

  if (
    result.user.status ===
    "PENDING"
  ) {

    const waitingAccount =
      document.getElementById(
        "waitingAccount"
      );


    if (waitingAccount) {

      waitingAccount.textContent =
        result.user.accountNumber;

    }


    showScreen(
      "waitingScreen"
    );

    return;
  }


  /* -----------------------------------------
     الحساب مرفوض
  ----------------------------------------- */

  if (
    result.user.status ===
    "REJECTED"
  ) {

    showMessage(
      "loginMessage",
      "تم رفض الحساب من المسؤول"
    );

    currentUser = null;

    return;
  }


  /* -----------------------------------------
     الحساب غير مفعل
  ----------------------------------------- */

  if (
    result.user.status !==
    "APPROVED"
  ) {

    showMessage(
      "loginMessage",
      "الحساب غير مفعل"
    );

    currentUser = null;

    return;
  }


  /* -----------------------------------------
     عرض معلومات اللاعب
  ----------------------------------------- */

  updatePlayerInfo();


  showScreen(
    "gameScreen"
  );

}


/* =========================================================
   تحديث معلومات اللاعب
========================================================= */

function updatePlayerInfo() {

  if (!currentUser) return;


  const nickname =
    document.getElementById(
      "playerNickname"
    );


  if (nickname) {

    nickname.textContent =
      currentUser.nickname || "";

  }


  const gamesRemaining =
    document.getElementById(
      "gamesRemaining"
    );


  if (gamesRemaining) {

    gamesRemaining.textContent =
      Number(
        currentUser.gamesRemaining || 0
      );

  }

}


/* =========================================================
   استرجاع الرمز
========================================================= */

async function forgotCode() {

  clearMessage(
    "forgotMessage"
  );


  const accountNumber =
    document
      .getElementById(
        "forgotAccount"
      )
      ?.value
      .trim();


  const phone =
    document
      .getElementById(
        "forgotPhone"
      )
      ?.value
      .trim();


  const email =
    document
      .getElementById(
        "forgotEmail"
      )
      ?.value
      .trim();


  if (
    !accountNumber ||
    !phone ||
    !email
  ) {

    showMessage(
      "forgotMessage",
      "أدخل رقم الحساب والتلفون والإيميل"
    );

    return;
  }


  const result =
    await api(
      "forgotCode",
      {
        accountNumber,
        phone,
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
    "تم التحقق من البيانات",
    "success"
  );

}


/* =========================================================
   بدء لعبة
========================================================= */

async function startGame() {

  clearMessage(
    "gameMessage"
  );


  const team1 =
    document
      .getElementById(
        "team1"
      )
      ?.value
      .trim();


  const team2 =
    document
      .getElementById(
        "team2"
      )
      ?.value
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
    currentUser.status !==
    "APPROVED"
  ) {

    showMessage(
      "gameMessage",
      "الحساب غير مفعل"
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


  currentGame =
    {

      gameId:
        result.gameId,

      team1:
        team1,

      team2:
        team2,

      score1:
        0,

      score2:
        0,

      turn:
        0,

      used:
        {},

      selected:
        null

    };


  currentUser.gamesRemaining =
    Number(
      result.gamesRemaining
    );


  updatePlayerInfo();


  /* تحميل لوحة الأسئلة */

  await loadGameBoard();


  showScreen(
    "gameBoardScreen"
  );

}


/* =========================================================
   تحميل لوحة الأسئلة
========================================================= */

async function loadGameBoard() {

  const result =
    await api(
      "getQuestions"
    );


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

}


/* =========================================================
   إنشاء لوحة اللعبة
========================================================= */

function createBoard(
  questions
) {

  const board =
    document.getElementById(
      "board"
    );


  if (!board) return;


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
        "category";


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
            "question";


          button.textContent =
            point;


          const matching =
            questions.filter(
              q =>

                q.category ===
                category &&

                Number(q.points) ===
                Number(point)

            );


          if (
            matching.length ===
            0
          ) {

            button.disabled =
              true;


            button.classList.add(
              "used"
            );

          } else {

            button.onclick =
              function() {

                openQuestion(
                  category,
                  point,
                  button
                );

              };

          }


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
   فتح السؤال
========================================================= */

async function openQuestion(
  category,
  points,
  button
) {

  if (
    !button ||
    button.disabled
  ) {

    return;

  }


  button.disabled =
    true;


  button.classList.add(
    "used"
  );


  const result =
    await api(
      "getRandomQuestion",
      {
        category,
        points
      }
    );


  if (!result.success) {

    button.disabled =
      false;


    button.classList.remove(
      "used"
    );


    alert(
      result.message ||
      "لا يوجد سؤال متاح"
    );

    return;

  }


  currentGame.selected = {

    category:
      category,

    points:
      points,

    button:
      button,

    question:
      result.question

  };


  const categoryElement =
    document.getElementById(
      "modalCategory"
    );


  const pointsElement =
    document.getElementById(
      "modalPoints"
    );


  const questionElement =
    document.getElementById(
      "modalQuestion"
    );


  const answerElement =
    document.getElementById(
      "answer"
    );


  const actionsElement =
    document.getElementById(
      "actions"
    );


  const showAnswerButton =
    document.getElementById(
      "showAnswer"
    );


  if (categoryElement) {

    categoryElement.textContent =
      category;

  }


  if (pointsElement) {

    pointsElement.textContent =
      points + " نقطة";

  }


  if (questionElement) {

    questionElement.textContent =
      result.question.question;

  }


  if (answerElement) {

    answerElement.textContent =
      result.question.answer;

    answerElement.style.display =
      "none";

  }


  if (actionsElement) {

    actionsElement.style.display =
      "none";

  }


  if (showAnswerButton) {

    showAnswerButton.style.display =
      "block";

  }


  const modal =
    document.getElementById(
      "modal"
    );


  if (modal) {

    modal.classList.add(
      "active"
    );

  }

}


/* =========================================================
   إظهار الإجابة
========================================================= */

function showAnswer() {

  const answer =
    document.getElementById(
      "answer"
    );


  const actions =
    document.getElementById(
      "actions"
    );


  const button =
    document.getElementById(
      "showAnswer"
    );


  if (answer) {

    answer.style.display =
      "block";

  }


  if (actions) {

    actions.style.display =
      "grid";

  }


  if (button) {

    button.style.display =
      "none";

  }

}


/* =========================================================
   الإجابة على السؤال
========================================================= */

async function answerQuestion(
  correct
) {

  const selected =
    currentGame.selected;


  if (!selected) return;


  const teamPlaying =
    currentGame.turn === 0
      ? currentGame.team1
      : currentGame.team2;


  if (correct) {

    if (
      currentGame.turn ===
      0
    ) {

      currentGame.score1 +=
        Number(
          selected.points
        );

    } else {

      currentGame.score2 +=
        Number(
          selected.points
        );

    }

  }


  const result =
    await api(
      "submitAnswer",
      {

        gameId:
          currentGame.gameId,

        team1:
          currentGame.team1,

        team2:
          currentGame.team2,

        category:
          selected.category,

        questionId:
          selected.question.id,

        question:
          selected.question.question,

        points:
          selected.points,

        team:
          teamPlaying,

        correct:
          correct

      }
    );


  if (!result.success) {

    alert(
      result.message ||
      "حدث خطأ أثناء تسجيل الإجابة"
    );

    return;

  }


  markQuestionUsed();


  closeModal();


  switchTurn();


  updateGameUI();


  checkGameEnd();

}


/* =========================================================
   تجاوز السؤال
========================================================= */

async function skipQuestion() {

  const selected =
    currentGame.selected;


  if (!selected) return;


  const teamPlaying =
    currentGame.turn === 0
      ? currentGame.team1
      : currentGame.team2;


  const result =
    await api(
      "submitAnswer",
      {

        gameId:
          currentGame.gameId,

        team1:
          currentGame.team1,

        team2:
          currentGame.team2,

        category:
          selected.category,

        questionId:
          selected.question.id,

        question:
          selected.question.question,

        points:
          selected.points,

        team:
          teamPlaying,

        correct:
          false

      }
    );


  if (!result.success) {

    alert(
      result.message ||
      "حدث خطأ أثناء تسجيل السؤال"
    );

    return;

  }


  markQuestionUsed();


  closeModal();


  switchTurn();


  updateGameUI();


  checkGameEnd();

}


/* =========================================================
   تسجيل السؤال كمستخدم
========================================================= */

function markQuestionUsed() {

  const selected =
    currentGame.selected;


  if (!selected) return;


  currentGame.used[
    selected.question.id
  ] = true;


  if (
    selected.button
  ) {

    selected.button.disabled =
      true;

    selected.button.classList.add(
      "used"
    );

  }

}


/* =========================================================
   تبديل الدور
========================================================= */

function switchTurn() {

  currentGame.turn =
    currentGame.turn === 0
      ? 1
      : 0;

}


/* =========================================================
   تحديث واجهة اللعبة
========================================================= */

function updateGameUI() {

  const team1Name =
    document.getElementById(
      "gameTeam1Name"
    );


  const team2Name =
    document.getElementById(
      "gameTeam2Name"
    );


  const score1 =
    document.getElementById(
      "gameScore1"
    );


  const score2 =
    document.getElementById(
      "gameScore2"
    );


  const turnName =
    document.getElementById(
      "gameTurnName"
    );


  if (team1Name) {

    team1Name.textContent =
      currentGame.team1;

  }


  if (team2Name) {

    team2Name.textContent =
      currentGame.team2;

  }


  if (score1) {

    score1.textContent =
      currentGame.score1;

  }


  if (score2) {

    score2.textContent =
      currentGame.score2;

  }


  if (turnName) {

    turnName.textContent =
      currentGame.turn === 0
        ? currentGame.team1
        : currentGame.team2;

  }


  const card1 =
    document.getElementById(
      "gameTeam1Card"
    );


  const card2 =
    document.getElementById(
      "gameTeam2Card"
    );


  if (card1) {

    card1.classList.toggle(
      "active",
      currentGame.turn === 0
    );

  }


  if (card2) {

    card2.classList.toggle(
      "active",
      currentGame.turn === 1
    );

  }

}


/* =========================================================
   نهاية اللعبة
========================================================= */

function checkGameEnd() {

  const totalCells =
    6 * 5;


  const usedCount =
    Object.keys(
      currentGame.used
    ).length;


  if (
    usedCount >=
    totalCells
  ) {

    endGame();

  }

}


/* =========================================================
   عرض نهاية اللعبة
========================================================= */

function endGame() {

  let winnerText;


  if (
    currentGame.score1 >
    currentGame.score2
  ) {

    winnerText =
      currentGame.team1;

  } else if (
    currentGame.score2 >
    currentGame.score1
  ) {

    winnerText =
      currentGame.team2;

  } else {

    winnerText =
      "تعادل";

  }


  const winner =
    document.getElementById(
      "winner"
    );


  if (winner) {

    winner.textContent =
      winnerText;

  }


  const finalScores =
    document.getElementById(
      "finalScores"
    );


  if (finalScores) {

    finalScores.innerHTML = `

      <p>
        ${escapeHtml(currentGame.team1)}:
        <strong>
          ${currentGame.score1}
        </strong>
      </p>

      <p>
        ${escapeHtml(currentGame.team2)}:
        <strong>
          ${currentGame.score2}
        </strong>
      </p>

    `;

  }


  showScreen(
    "endScreen"
  );

}


/* =========================================================
   إغلاق السؤال
========================================================= */

function closeModal() {

  const modal =
    document.getElementById(
      "modal"
    );


  if (modal) {

    modal.classList.remove(
      "active"
    );

  }


  currentGame.selected =
    null;

}


/* =========================================================
   لعبة جديدة
========================================================= */

function newGame() {

  currentGame = {

    gameId: null,

    team1: "",

    team2: "",

    score1: 0,

    score2: 0,

    turn: 0,

    used: {},

    selected: null

  };


  const team1 =
    document.getElementById(
      "team1"
    );


  const team2 =
    document.getElementById(
      "team2"
    );


  if (team1) {

    team1.value = "";

  }


  if (team2) {

    team2.value = "";

  }


  showScreen(
    "gameScreen"
  );

}


/* =========================================================
   تسجيل الخروج
========================================================= */

function logout() {

  currentUser =
    null;


  currentGame = {

    gameId: null,

    team1: "",

    team2: "",

    score1: 0,

    score2: 0,

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


  if (loginAccount) {

    loginAccount.value =
      "";

  }


  if (loginCode) {

    loginCode.value =
      "";

  }


  showScreen(
    "loginScreen"
  );

}


/* =========================================================
   حماية HTML عند عرض أسماء الفرق
========================================================= */

function escapeHtml(value) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   تشغيل أولي
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    showScreen(
      "loginScreen"
    );

  }
);
