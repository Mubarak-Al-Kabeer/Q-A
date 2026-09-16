/* =====================================================
   GOOGLE APPS SCRIPT API
===================================================== */

const API_URL =
  "https://script.google.com/macros/s/AKfycbwtM6EpRaz9R09523IEtdiTWbghH2HQ1cVc9CQjAn32r6UsFIfZQ0doSF1PddQjKExgkw/exec";


/* =====================================================
   SESSION
===================================================== */

let session = {
  account: null,
  code: null,
  nickname: null,
  role: null,
  gamesAllowed: 0,
  gamesPlayed: 0
};


/* =====================================================
   GOOGLE REQUEST
===================================================== */

function api(functionName, args = []) {

  return new Promise((resolve, reject) => {

    const callbackName =
      "callback_" +
      Date.now() +
      "_" +
      Math.floor(
        Math.random() * 100000
      );

    window[callbackName] =
      function(result) {

        delete window[callbackName];

        script.remove();

        resolve(result);

      };


    const script =
      document.createElement(
        "script"
      );


    const params =
      new URLSearchParams();


    params.set(
      "callback",
      callbackName
    );


    params.set(
      "function",
      functionName
    );


    params.set(
      "args",
      JSON.stringify(args)
    );


    script.src =
      API_URL +
      "?" +
      params.toString();


    script.onerror =
      function() {

        delete window[callbackName];

        script.remove();

        reject(
          new Error(
            "تعذر الاتصال بالخادم"
          )
        );

      };


    document.body.appendChild(
      script
    );

  });

}


/* =====================================================
   SCREEN
===================================================== */

function showScreen(id) {

  document
    .querySelectorAll(".screen")
    .forEach(screen => {

      screen.classList.remove(
        "active"
      );

    });


  const target =
    document.getElementById(id);


  if (target) {

    target.classList.add(
      "active"
    );

  }

}


/* =====================================================
   REGISTER
===================================================== */

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


  message.textContent =
    "";


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


  try {

    message.textContent =
      "جاري إنشاء الحساب...";


    const result =
      await api(
        "registerUser",
        [{
          nickname,
          phone,
          email,
          code
        }]
      );


    if (!result.success) {

      message.textContent =
        result.message;

      return;

    }


    document.getElementById(
      "pendingAccount"
    ).textContent =
      result.account;


    showScreen(
      "pendingScreen"
    );


  } catch (error) {

    message.textContent =
      error.message;

  }

}


/* =====================================================
   LOGIN
===================================================== */

async function login() {

  const account =
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


  const message =
    document.getElementById(
      "loginMessage"
    );


  message.textContent =
    "";


  if (!account || !code) {

    message.textContent =
      "أدخل رقم الحساب والرمز";

    return;

  }


  try {

    message.textContent =
      "جاري تسجيل الدخول...";


    const result =
      await api(
        "loginUser",
        [
          account,
          code
        ]
      );


    if (!result.success) {

      if (result.pending) {

        document.getElementById(
          "pendingAccount"
        ).textContent =
          result.account;


        showScreen(
          "pendingScreen"
        );

        return;

      }


      message.textContent =
        result.message;

      return;

    }


    session = {

      account:
        result.account,

      code:
        code,

      nickname:
        result.nickname,

      role:
        result.role,

      gamesAllowed:
        Number(
          result.gamesAllowed
        ) || 0,

      gamesPlayed:
        Number(
          result.gamesPlayed
        ) || 0

    };


    localStorage.setItem(
      "medicalQuizSession",
      JSON.stringify(
        session
      )
    );


    if (
      result.role === "ADMIN"
    ) {

      showScreen(
        "adminScreen"
      );

      loadUsers();

    } else {

      updateUserDashboard();

      showScreen(
        "userScreen"
      );

    }


  } catch (error) {

    message.textContent =
      error.message;

  }

}


/* =====================================================
   USER DASHBOARD
===================================================== */

function updateUserDashboard() {

  document.getElementById(
    "userNickname"
  ).textContent =
    session.nickname;


  document.getElementById(
    "userAccount"
  ).textContent =
    session.account;


  document.getElementById(
    "gamesAllowed"
  ).textContent =
    session.gamesAllowed;


  document.getElementById(
    "gamesPlayed"
  ).textContent =
    session.gamesPlayed;


  document.getElementById(
    "gamesRemaining"
  ).textContent =
    Math.max(
      0,
      session.gamesAllowed -
      session.gamesPlayed
    );

}


/* =====================================================
   OPEN GAME SETUP
===================================================== */

function openGameSetup() {

  const remaining =
    session.gamesAllowed -
    session.gamesPlayed;


  if (
    session.role !== "ADMIN" &&
    remaining <= 0
  ) {

    document.getElementById(
      "userMessage"
    ).textContent =
      "لا توجد ألعاب متبقية في حسابك.";

    return;

  }


  showScreen(
    "gameSetupScreen"
  );

}


/* =====================================================
   START GAME
===================================================== */

async function startGame() {

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


  const message =
    document.getElementById(
      "gameMessage"
    );


  if (!team1 || !team2) {

    message.textContent =
      "أدخل اسم الفريقين";

    return;

  }


  try {

    message.textContent =
      "جاري تجهيز اللعبة...";


    const result =
      await api(
        "createGame",
        [
          session.account,
          session.code,
          team1,
          team2
        ]
      );


    if (!result.success) {

      message.textContent =
        result.message;

      return;

    }


    /*
      هنا لاحقاً نفتح لوحة
      سين جيم الطبية الكاملة.
    */

    message.textContent =
      "تم إنشاء اللعبة بنجاح. سنضيف لوحة اللعبة في الخطوة التالية.";

  } catch (error) {

    message.textContent =
      error.message;

  }

}


/* =====================================================
   ADMIN - LOAD USERS
===================================================== */

async function loadUsers() {

  const container =
    document.getElementById(
      "usersContainer"
    );


  container.innerHTML =
    "<p>جاري تحميل الحسابات...</p>";


  try {

    const result =
      await api(
        "getUsers",
        [
          session.account,
          session.code
        ]
      );


    if (!result.success) {

      container.innerHTML =
        `<p>${result.message}</p>`;

      return;

    }


    if (
      !result.users ||
      result.users.length === 0
    ) {

      container.innerHTML =
        "<p>لا توجد حسابات حتى الآن.</p>";

      return;

    }


    container.innerHTML =
      "";


    result.users.forEach(
      user => {

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "user-row";


        row.innerHTML = `

          <div>
            <strong>
              ${escapeHtml(
                user.account
              )}
            </strong>
          </div>

          <div>
            ${escapeHtml(
              user.nickname
            )}
          </div>

          <div>
            ${escapeHtml(
              user.email
            )}
          </div>

          <div>
            ألعاب:
            <strong>
              ${user.gamesAllowed}
            </strong>
          </div>

          <div>
            مستخدمة:
            <strong>
              ${user.gamesPlayed}
            </strong>
          </div>

          <div>

            <div class="status ${
              getStatusClass(
                user.status
              )
            }">

              ${getStatusText(
                user.status
              )}

            </div>

            <div class="admin-actions">

              <button
                class="approve"
                onclick="changeStatus(
                  '${user.account}',
                  'APPROVED'
                )">
                قبول
              </button>

              <button
                class="reject"
                onclick="changeStatus(
                  '${user.account}',
                  'REJECTED'
                )">
                رفض
              </button>

              <button
                class="suspend"
                onclick="changeStatus(
                  '${user.account}',
                  'SUSPENDED'
                )">
                إيقاف
              </button>

              <button
                class="add-games"
                onclick="addGames(
                  '${user.account}'
                )">
                + ألعاب
              </button>

            </div>

          </div>

        `;


        container.appendChild(
          row
        );

      }
    );


  } catch (error) {

    container.innerHTML =
      `<p>${error.message}</p>`;

  }

}


/* =====================================================
   ADMIN - STATUS
===================================================== */

async function changeStatus(
  account,
  status
) {

  const confirmed =
    confirm(
      `هل تريد تغيير حالة الحساب ${account}؟`
    );


  if (!confirmed)
    return;


  try {

    const result =
      await api(
        "updateUserStatus",
        [
          session.account,
          session.code,
          account,
          status
        ]
      );


    if (!result.success) {

      alert(
        result.message
      );

      return;

    }


    loadUsers();


  } catch (error) {

    alert(
      error.message
    );

  }

}


/* =====================================================
   ADMIN - ADD GAMES
===================================================== */

async function addGames(
  account
) {

  const amount =
    prompt(
      "كم لعبة تريد إضافتها؟"
    );


  if (
    amount === null
  )
    return;


  const number =
    Number(amount);


  if (
    !number ||
    number <= 0
  ) {

    alert(
      "أدخل رقم صحيح"
    );

    return;

  }


  try {

    const result =
      await api(
        "addGames",
        [
          session.account,
          session.code,
          account,
          number
        ]
      );


    if (!result.success) {

      alert(
        result.message
      );

      return;

    }


    alert(
      `تمت إضافة ${number} لعبة`
    );


    loadUsers();


  } catch (error) {

    alert(
      error.message
    );

  }

}


/* =====================================================
   STATUS TEXT
===================================================== */

function getStatusText(
  status
) {

  switch (status) {

    case "PENDING":
      return "بانتظار الموافقة";

    case "APPROVED":
      return "مقبول";

    case "REJECTED":
      return "مرفوض";

    case "SUSPENDED":
      return "موقوف";

    default:
      return status;

  }

}


function getStatusClass(
  status
) {

  return String(
    status
  ).toLowerCase();

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(
  value
) {

  return String(
    value || ""
  )
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


/* =====================================================
   LOGOUT
===================================================== */

function logout() {

  session = {

    account: null,
    code: null,
    nickname: null,
    role: null,
    gamesAllowed: 0,
    gamesPlayed: 0

  };


  localStorage.removeItem(
    "medicalQuizSession"
  );


  showScreen(
    "loginScreen"
  );

}


/* =====================================================
   INITIALIZE
===================================================== */

window.addEventListener(
  "load",
  function() {

    /*
      لا نعتمد على localStorage
      للدخول التلقائي لأن الرمز يجب
      إعادة التحقق منه مع الخادم.
    */

    showScreen(
      "loginScreen"
    );

  }
);
