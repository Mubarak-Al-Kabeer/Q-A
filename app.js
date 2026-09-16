/* =====================================================
   GOOGLE APPS SCRIPT API
===================================================== */

const API_URL =
  "https://script.google.com/macros/s/AKfycbwtM6EpRaz9R09523IEtdiTWbghH2HQ1cVc9CQjAn32r6UsFIfZQ0doSF1PddQjKExgkw/exec";


/* =====================================================
   GAME STATE
===================================================== */

let currentUser = null;
let sessionId = null;

let game = {
  id: null,
  team1: "",
  team2: "",
  scores: [0, 0],
  turn: 0,
  used: {},
  selected: null,
  questions: []
};


/* =====================================================
   API
===================================================== */

async function api(action, data = {}) {

  const response = await fetch(API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },

    body: JSON.stringify({
      action,
      ...data
    })
  });

  const result = await response.json();

  return result;
}


/* =====================================================
   SCREENS
===================================================== */

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


function showLogin() {
  showScreen("loginScreen");
}


function showRegister() {
  showScreen("registerScreen");
}


function showForgot() {
  showScreen("forgotScreen");
}


function showHome() {
  showScreen("homeScreen");
}


function showTeams() {

  if (!currentUser) {
    showLogin();
    return;
  }

  if (
    currentUser.role !== "ADMIN" &&
    Number(currentUser.gamesRemaining || 0) <= 0
  ) {

    alert(
      "لا توجد ألعاب متبقية في حسابك."
    );

    return;
  }

  showScreen("teamsScreen");
}


function showAdmin() {

  if (
    !currentUser ||
    currentUser.role !== "ADMIN"
  ) {

    alert("ليس لديك صلاحية المسؤول.");

    return;
  }

  showScreen("adminScreen");

  loadAdmin();
}


/* =====================================================
   REGISTER
===================================================== */

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

  const password =
    document
      .getElementById("registerPassword")
      .value;

  const password2 =
    document
      .getElementById("registerPassword2")
      .value;

  const message =
    document.getElementById(
      "registerMessage"
    );


  if (
    !nickname ||
    !phone ||
    !email ||
    !password
  ) {

    message.textContent =
      "جميع البيانات مطلوبة.";

    return;
  }


  if (password !== password2) {

    message.textContent =
      "رمزا الدخول غير متطابقين.";

    return;
  }


  message.textContent =
    "جاري إنشاء الحساب...";


  try {

    const result =
      await api("register", {
        nickname,
        phone,
        email,
        password
      });


    if (!result.success) {

      message.textContent =
        result.message || "تعذر إنشاء الحساب.";

      return;
    }


    document.getElementById(
      "newAccountId"
    ).textContent =
      result.accountId;


    showScreen("waitingScreen");


  } catch (error) {

    message.textContent =
      "حدث خطأ في الاتصال بالخادم.";
  }
}


/* =====================================================
   LOGIN
===================================================== */

async function login() {

  const accountId =
    document
      .getElementById("loginAccount")
      .value
      .trim();

  const password =
    document
      .getElementById("loginPassword")
      .value;

  const message =
    document.getElementById(
      "loginMessage"
    );


  if (!accountId || !password) {

    message.textContent =
      "أدخل رقم الحساب والرمز.";

    return;
  }


  message.textContent =
    "جاري تسجيل الدخول...";


  try {

    const result =
      await api("login", {
        accountId,
        password
      });


    if (!result.success) {

      message.textContent =
        result.message || "تعذر تسجيل الدخول.";

      return;
    }


    sessionId =
      result.sessionId;

    currentUser =
      result.user;


    localStorage.setItem(
      "sessionId",
      sessionId
    );


    updateHome();


    showHome();


  } catch (error) {

    console.error(error);

    message.textContent =
      "تعذر الاتصال بالخادم.";
  }
}


/* =====================================================
   RESTORE SESSION
===================================================== */

async function restoreSession() {

  const saved =
    localStorage.getItem(
      "sessionId"
    );

  if (!saved) {
    return;
  }

  try {

    const result =
      await api("me", {
        sessionId: saved
      });


    if (!result.success) {

      localStorage.removeItem(
        "sessionId"
      );

      return;
    }


    sessionId =
      saved;

    currentUser =
      result.user;


    updateHome();


    showHome();


  } catch (error) {

    console.error(error);
  }
}


/* =====================================================
   UPDATE HOME
===================================================== */

function updateHome() {

  if (!currentUser) {
    return;
  }


  document.getElementById(
    "userNickname"
  ).textContent =
    currentUser.nickname;


  document.getElementById(
    "userAccount"
  ).textContent =
    currentUser.accountId;


  document.getElementById(
    "gamesRemaining"
  ).textContent =
    currentUser.role === "ADMIN"
      ? "∞"
      : currentUser.gamesRemaining;


  const adminButton =
    document.getElementById(
      "adminButton"
    );


  if (
    currentUser.role === "ADMIN"
  ) {

    adminButton.classList.remove(
      "hidden"
    );

  } else {

    adminButton.classList.add(
      "hidden"
    );
  }
}


/* =====================================================
   LOGOUT
===================================================== */

async function logout() {

  if (sessionId) {

    try {

      await api("logout", {
        sessionId
      });

    } catch (error) {

      console.error(error);
    }
  }


  sessionId = null;

  currentUser = null;

  localStorage.removeItem(
    "sessionId"
  );


  showLogin();
}


/* =====================================================
   START GAME
===================================================== */

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

  const message =
    document.getElementById(
      "teamsMessage"
    );


  if (!team1 || !team2) {

    message.textContent =
      "أدخل اسم الفريقين.";

    return;
  }


  message.textContent =
    "جاري بدء اللعبة...";


  try {

    const result =
      await api("startGame", {
        sessionId,
        team1,
        team2
      });


    if (!result.success) {

      message.textContent =
        result.message;

      return;
    }


    game = {

      id:
        result.gameId,

      team1,
      team2,

      scores:
        [0, 0],

      turn:
        0,

      used:
        {},

      selected:
        null,

      questions:
        []
    };


    if (
      currentUser.role !== "ADMIN"
    ) {

      currentUser.gamesRemaining =
        result.gamesRemaining;
    }


    updateHome();


    await loadQuestions();


    updateGameUI();


    showScreen(
      "gameScreen"
    );


  } catch (error) {

    console.error(error);

    message.textContent =
      "حدث خطأ في الاتصال.";
  }
}


/* =====================================================
   LOAD QUESTIONS
===================================================== */

async function loadQuestions() {

  const result =
    await api("questions", {
      sessionId
    });


  if (!result.success) {

    alert(
      result.message ||
      "تعذر تحميل الأسئلة."
    );

    return;
  }


  game.questions =
    result.questions || [];


  createBoard(
    result.categories,
    result.points,
    game.questions
  );
}


/* =====================================================
   CREATE BOARD
===================================================== */

function createBoard(
  categories,
  points,
  questions
) {

  const board =
    document.getElementById(
      "board"
    );


  board.innerHTML = "";


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


          const available =
            questions.some(
              q =>
                q.category === category &&
                Number(q.points) ===
                  Number(point)
            );


          if (!available) {

            button.disabled =
              true;

            button.classList.add(
              "used"
            );

          } else {

            button.onclick =
              () =>
                openQuestion(
                  category,
                  point,
                  button
                );
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


/* =====================================================
   OPEN QUESTION
===================================================== */

async function openQuestion(
  category,
  points,
  button
) {

  if (button.disabled) {
    return;
  }


  button.disabled =
    true;


  button.classList.add(
    "used"
  );


  try {

    const result =
      await api("getQuestion", {
        sessionId,
        category,
        points
      });


    if (!result.success) {

      button.disabled =
        false;

      button.classList.remove(
        "used"
      );

      alert(
        result.message
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
      result.question.question;


    document.getElementById(
      "answer"
    ).textContent =
      result.question.answer;


    document.getElementById(
      "answer"
    ).style.display =
      "none";


    document.getElementById(
      "actions"
    ).style.display =
      "none";


    document.getElementById(
      "showAnswer"
    ).style.display =
      "block";


    document.getElementById(
      "modal"
    ).classList.add(
      "active"
    );


  } catch (error) {

    button.disabled =
      false;

    button.classList.remove(
      "used"
    );

    alert(
      "حدث خطأ أثناء تحميل السؤال."
    );
  }
}


/* =====================================================
   SHOW ANSWER
===================================================== */

function showAnswer() {

  document.getElementById(
    "answer"
  ).style.display =
    "block";


  document.getElementById(
    "actions"
  ).style.display =
    "grid";


  document.getElementById(
    "showAnswer"
  ).style.display =
    "none";
}


/* =====================================================
   ANSWER
===================================================== */

async function answerQuestion(
  correct
) {

  const selected =
    game.selected;


  if (!selected) {
    return;
  }


  const answeringTeam =
    game.turn === 0
      ? game.team1
      : game.team2;


  if (correct) {

    game.scores[
      game.turn
    ] +=
      Number(
        selected.points
      );
  }


  try {

    const result =
      await api(
        "submitAnswer",
        {

          sessionId,

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
            answeringTeam,

          correct
        }
      );


    if (!result.success) {

      alert(
        result.message ||
        "تعذر تسجيل النتيجة."
      );

      return;
    }


    finishQuestion();


  } catch (error) {

    console.error(error);

    alert(
      "حدث خطأ أثناء تسجيل الإجابة."
    );
  }
}


/* =====================================================
   SKIP
===================================================== */

async function skipQuestion() {

  await answerQuestion(false);
}


/* =====================================================
   FINISH QUESTION
===================================================== */

function finishQuestion() {

  if (!game.selected) {
    return;
  }


  game.used[
    game.selected.question.id
  ] = true;


  game.turn =
    game.turn === 0
      ? 1
      : 0;


  closeModal();


  updateGameUI();


  checkEnd();
}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeModal() {

  document
    .getElementById("modal")
    .classList.remove(
      "active"
    );

  game.selected =
    null;
}


/* =====================================================
   UPDATE GAME UI
===================================================== */

function updateGameUI() {

  document.getElementById(
    "team1Name"
  ).textContent =
    game.team1;


  document.getElementById(
    "team2Name"
  ).textContent =
    game.team2;


  document.getElementById(
    "score1"
  ).textContent =
    game.scores[0];


  document.getElementById(
    "score2"
  ).textContent =
    game.scores[1];


  document.getElementById(
    "turnName"
  ).textContent =
    game.turn === 0
      ? game.team1
      : game.team2;


  document
    .getElementById(
      "team1Card"
    )
    .classList.toggle(
      "active",
      game.turn === 0
    );


  document
    .getElementById(
      "team2Card"
    )
    .classList.toggle(
      "active",
      game.turn === 1
    );
}


/* =====================================================
   END
===================================================== */

function checkEnd() {

  const total =
    6 * 5;


  const used =
    Object.keys(
      game.used
    ).length;


  if (used >= total) {

    endGame();
  }
}


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


  document.getElementById(
    "winner"
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


  showScreen(
    "endScreen"
  );
}


/* =====================================================
   ADMIN
===================================================== */

async function loadAdmin() {

  if (
    !currentUser ||
    currentUser.role !== "ADMIN"
  ) {

    return;
  }


  try {

    const stats =
      await api(
        "stats",
        {
          sessionId
        }
      );


    if (stats.success) {

      document.getElementById(
        "statTotal"
      ).textContent =
        stats.stats.total;

      document.getElementById(
        "statPending"
      ).textContent =
        stats.stats.pending;

      document.getElementById(
        "statApproved"
      ).textContent =
        stats.stats.approved;

      document.getElementById(
        "statSuspended"
      ).textContent =
        stats.stats.suspended;
    }


    const users =
      await api(
        "adminUsers",
        {
          sessionId
        }
      );


    if (users.success) {

      renderUsers(
        users.users
      );
    }


  } catch (error) {

    console.error(error);

    alert(
      "تعذر تحميل لوحة المسؤول."
    );
  }
}


/* =====================================================
   RENDER USERS
===================================================== */

function renderUsers(users) {

  const container =
    document.getElementById(
      "usersTable"
    );


  container.innerHTML = "";


  if (!users.length) {

    container.innerHTML =
      "<p>لا توجد حسابات.</p>";

    return;
  }


  users.forEach(
    user => {

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "user-row";


      const statusText =
        {

          PENDING:
            "⏳ بانتظار الموافقة",

          APPROVED:
            "✅ مقبول",

          REJECTED:
            "❌ مرفوض",

          SUSPENDED:
            "⛔ موقوف"

        }[user.status] ||
        user.status;


      row.innerHTML = `

        <div>
          <strong>
            ${escapeHtml(user.nickname)}
          </strong>
        </div>

        <div>
          رقم الحساب:
          <strong>
            ${escapeHtml(user.accountId)}
          </strong>
        </div>

        <div>
          الهاتف:
          ${escapeHtml(user.phone)}
        </div>

        <div>
          البريد:
          ${escapeHtml(user.email)}
        </div>

        <div>
          الحالة:
          ${statusText}
        </div>

        <div>
          الألعاب:
          ${user.role === "ADMIN"
            ? "∞"
            : `${user.gamesUsed} / ${user.gamesAllowed}`}
        </div>

        ${
          user.role !== "ADMIN"
            ? `
              <div class="user-actions">

                ${
                  user.status === "PENDING"
                    ? `
                      <button
                        class="approve"
                        onclick="approveUser('${user.accountId}')">
                        قبول
                      </button>

                      <button
                        class="reject"
                        onclick="rejectUser('${user.accountId}')">
                        رفض
                      </button>
                    `
                    : ""
                }

                ${
                  user.status === "APPROVED"
                    ? `
                      <button
                        class="suspend"
                        onclick="suspendUser('${user.accountId}')">
                        إيقاف
                      </button>
                    `
                    : ""
                }

                ${
                  user.status === "SUSPENDED"
                    ? `
                      <button
                        class="activate"
                        onclick="activateUser('${user.accountId}')">
                        تفعيل
                      </button>
                    `
                    : ""
                }

                <button
                  class="games"
                  onclick="addGames('${user.accountId}')">
                  + ألعاب
                </button>

                <button
                  class="games"
                  onclick="removeGames('${user.accountId}')">
                  - ألعاب
                </button>

                <button
                  class="activate"
                  onclick="resetPassword('${user.accountId}')">
                  تغيير الرمز
                </button>

                <button
                  class="reject"
                  onclick="deleteUser('${user.accountId}')">
                  حذف
                </button>

              </div>
            `
            : ""
        }

      `;


      container.appendChild(
        row
      );

    }
  );
}


/* =====================================================
   ADMIN ACTIONS
===================================================== */

async function approveUser(accountId) {

  await adminAction(
    "approveUser",
    accountId
  );
}


async function rejectUser(accountId) {

  await adminAction(
    "rejectUser",
    accountId
  );
}


async function suspendUser(accountId) {

  await adminAction(
    "suspendUser",
    accountId
  );
}


async function activateUser(accountId) {

  await adminAction(
    "activateUser",
    accountId
  );
}


async function adminAction(
  action,
  accountId
) {

  const result =
    await api(
      action,
      {
        sessionId,
        accountId
      }
    );


  if (!result.success) {

    alert(
      result.message ||
      "حدث خطأ."
    );

    return;
  }


  loadAdmin();
}


/* =====================================================
   ADD GAMES
===================================================== */

async function addGames(accountId) {

  const amount =
    prompt(
      "كم لعبة تريد إضافتها؟"
    );


  if (!amount) {
    return;
  }


  const result =
    await api(
      "addGames",
      {

        sessionId,

        accountId,

        amount:
          Number(amount)

      }
    );


  if (!
