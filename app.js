/* =====================================================
   GOOGLE APPS SCRIPT API
===================================================== */

const API_URL =
  'https://script.google.com/macros/s/AKfycbwtM6EpRaz9R09523IEtdiTWbghH2HQ1cVc9CQjAn32r6UsFIfZQ0doSF1PddQjKExgkw/exec';


/* =====================================================
   STATE
===================================================== */

let currentUser = null;

let game = {

  id: null,

  team1: '',

  team2: '',

  scores: [0, 0],

  turn: 0,

  selected: null

};


/* =====================================================
   API
===================================================== */

async function api(functionName, ...args) {

  const response =
    await fetch(API_URL, {

      method: 'POST',

      headers: {
        'Content-Type':
          'text/plain;charset=utf-8'
      },

      body: JSON.stringify({

        function:
          functionName,

        args:
          args

      })

    });


  return await response.json();

}


/* =====================================================
   SCREEN
===================================================== */

function showScreen(id) {

  document
    .querySelectorAll('.screen')
    .forEach(screen => {

      screen.classList.remove(
        'active'
      );

    });


  const screen =
    document.getElementById(id);


  if (screen) {

    screen.classList.add(
      'active'
    );

  }

}


/* =====================================================
   MESSAGE
===================================================== */

function message(id, text) {

  const element =
    document.getElementById(id);


  if (element) {

    element.textContent =
      text;

  }

}


/* =====================================================
   REGISTER
===================================================== */

async function register() {

  const nickname =
    document
      .getElementById(
        'registerNickname'
      )
      .value
      .trim();


  const phone =
    document
      .getElementById(
        'registerPhone'
      )
      .value
      .trim();


  const email =
    document
      .getElementById(
        'registerEmail'
      )
      .value
      .trim();


  const code =
    document
      .getElementById(
        'registerCode'
      )
      .value
      .trim();


  const confirm =
    document
      .getElementById(
        'registerCodeConfirm'
      )
      .value
      .trim();


  if (
    !nickname ||
    !phone ||
    !email ||
    !code
  ) {

    message(
      'registerMessage',
      'أكمل جميع البيانات'
    );

    return;

  }


  if (code !== confirm) {

    message(
      'registerMessage',
      'الرمزان غير متطابقين'
    );

    return;

  }


  message(
    'registerMessage',
    'جاري إنشاء الحساب...'
  );


  try {

    const result =
      await api(
        'registerUser',
        {
          nickname:
            nickname,

          phone:
            phone,

          email:
            email,

          code:
            code
        }
      );


    if (!result.success) {

      message(
        'registerMessage',
        result.message
      );

      return;

    }


    document
      .getElementById(
        'pendingAccount'
      )
      .textContent =
        result.account;


    message(
      'registerMessage',
      ''
    );


    showScreen(
      'pendingScreen'
    );

  } catch (error) {

    console.error(error);

    message(
      'registerMessage',
      'حدث خطأ في الاتصال بالخادم'
    );

  }

}


/* =====================================================
   LOGIN
===================================================== */

async function login() {

  const account =
    document
      .getElementById(
        'loginAccount'
      )
      .value
      .trim();


  const code =
    document
      .getElementById(
        'loginCode'
      )
      .value
      .trim();


  if (!account || !code) {

    message(
      'loginMessage',
      'أدخل رقم الحساب والرمز'
    );

    return;

  }


  message(
    'loginMessage',
    'جاري تسجيل الدخول...'
  );


  try {

    const result =
      await api(
        'loginUser',
        account,
        code
      );


    if (!result.success) {

      if (result.pending) {

        document
          .getElementById(
            'pendingAccount'
          )
          .textContent =
            result.account;


        showScreen(
          'pendingScreen'
        );

        return;

      }


      message(
        'loginMessage',
        result.message
      );

      return;

    }


    currentUser = {

      account:
        result.account,

      code:
        code,

      nickname:
        result.nickname,

      role:
        result.role,

      gamesAllowed:
        result.gamesAllowed,

      gamesPlayed:
        result.gamesPlayed

    };


    if (
      result.role === 'ADMIN'
    ) {

      showScreen(
        'adminScreen'
      );

      loadUsers();

    } else {

      showUserDashboard();

    }

  } catch (error) {

    console.error(error);

    message(
      'loginMessage',
      'تعذر الاتصال بالخادم'
    );

  }

}


/* =====================================================
   USER DASHBOARD
===================================================== */

function showUserDashboard() {

  document
    .getElementById(
      'userNickname'
    )
    .textContent =
      currentUser.nickname;


  document
    .getElementById(
      'userAccount'
    )
    .textContent =
      currentUser.account;


  updateGameStats();


  showScreen(
    'userScreen'
  );

}


function updateGameStats() {

  const allowed =
    Number(
      currentUser.gamesAllowed
    ) || 0;


  const played =
    Number(
      currentUser.gamesPlayed
    ) || 0;


  const remaining =
    Math.max(
      allowed - played,
      0
    );


  document
    .getElementById(
      'gamesAllowed'
    )
    .textContent =
      allowed;


  document
    .getElementById(
      'gamesPlayed'
    )
    .textContent =
      played;


  document
    .getElementById(
      'gamesRemaining'
    )
    .textContent =
      remaining;

}


/* =====================================================
   START GAME
===================================================== */

async function startGame() {

  const team1 =
    document
      .getElementById(
        'team1'
      )
      .value
      .trim();


  const team2 =
    document
      .getElementById(
        'team2'
      )
      .value
      .trim();


  if (!team1 || !team2) {

    message(
      'gameMessage',
      'أدخل اسم الفريقين'
    );

    return;

  }


  message(
    'gameMessage',
    'جاري بدء اللعبة...'
  );


  try {

    const result =
      await api(
        'createGame',

        currentUser.account,

        currentUser.code,

        team1,

        team2

      );


    if (!result.success) {

      message(
        'gameMessage',
        result.message
      );

      return;

    }


    game.id =
      result.gameId;

    game.team1 =
      team1;

    game.team2 =
      team2;

    game.scores =
      [0, 0];

    game.turn =
      0;

    game.selected =
      null;


    document
      .getElementById(
        'team1Name'
      )
      .textContent =
      team1;


    document
      .getElementById(
        'team2Name'
      )
      .textContent =
      team2;


    await loadBoard();


    showScreen(
      'gameScreen'
    );

  } catch (error) {

    console.error(error);

    message(
      'gameMessage',
      'حدث خطأ في الاتصال'
    );

  }

}


/* =====================================================
   LOAD BOARD
===================================================== */

async function loadBoard() {

  try {

    const result =
      await api(
        'getQuestions'
      );


    createBoard(
      result
    );

    updateGameUI();

  } catch (error) {

    console.error(error);

    alert(
      'تعذر تحميل الأسئلة'
    );

  }

}


/* =====================================================
   BOARD
===================================================== */

function createBoard(
  questions
) {

  const board =
    document.getElementById(
      'board'
    );


  board.innerHTML = '';


  const categories = [

    'التشريح',

    'الإحالة',

    'الأدوات والمعدات',

    'العلامات الحيوية',

    'الأدوية',

    'الطوارئ والإسعافات'

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
          'div'
        );

      column.className =
        'category';


      const title =
        document.createElement(
          'div'
        );

      title.className =
        'category-title';

      title.textContent =
        category;

      column.appendChild(
        title
      );


      points.forEach(
        point => {

          const button =
            document.createElement(
              'button'
            );

          button.className =
            'question';

          button.textContent =
            point;


          const exists =
            questions.some(
              q =>
                q.category ===
                  category &&
                Number(q.points) ===
                  point
            );


          if (!exists) {

            button.disabled =
              true;

            button.classList.add(
              'used'
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

  button.disabled =
    true;

  button.classList.add(
    'used'
  );


  try {

    const result =
      await api(
        'getRandomQuestion',
        category,
        points
      );


    if (!result.success) {

      button.disabled =
        false;

      button.classList.remove(
        'used'
      );

      alert(
        result.message
      );

      return;

    }


    game.selected = {

      category:
        category,

      points:
        points,

      button:
        button,

      question:
        result.question

    };


    document
      .getElementById(
        'modalCategory'
      )
      .textContent =
      category;


    document
      .getElementById(
        'modalPoints'
      )
      .textContent =
      points
