/* =========================================================
   ADMIN MENU
========================================================= */

function isAdmin() {

  if (!currentUser) {
    return false;
  }

  return (
    String(currentUser.accountNumber) === "3854" ||
    String(currentUser.role).toUpperCase() === "ADMIN"
  );
}


/* =========================================================
   SHOW ADMIN MENU
========================================================= */

function showAdminMenu() {

  if (!isAdmin()) {
    return;
  }

  const adminMenu =
    document.getElementById("adminMenu");

  const gameSetup =
    document.getElementById("gameSetupArea");

  const adminPanel =
    document.getElementById("adminPanel");

  if (adminMenu) {
    adminMenu.style.display = "block";
  }

  if (gameSetup) {
    gameSetup.style.display = "none";
  }

  if (adminPanel) {
    adminPanel.style.display = "none";
  }
}


/* =========================================================
   SHOW GAME SETUP
========================================================= */

function showGameSetup() {

  const gameSetup =
    document.getElementById("gameSetupArea");

  const adminMenu =
    document.getElementById("adminMenu");

  const adminPanel =
    document.getElementById("adminPanel");

  if (adminMenu) {
    adminMenu.style.display = "none";
  }

  if (adminPanel) {
    adminPanel.style.display = "none";
  }

  if (gameSetup) {
    gameSetup.style.display = "block";
  }
}


/* =========================================================
   SHOW ADMIN PANEL
========================================================= */

async function showAdminPanel() {

  if (!isAdmin()) {
    alert("غير مصرح لك بالدخول");
    return;
  }

  const adminMenu =
    document.getElementById("adminMenu");

  const gameSetup =
    document.getElementById("gameSetupArea");

  const adminPanel =
    document.getElementById("adminPanel");

  if (adminMenu) {
    adminMenu.style.display = "none";
  }

  if (gameSetup) {
    gameSetup.style.display = "none";
  }

  if (adminPanel) {
    adminPanel.style.display = "block";
  }

  await loadAccounts();
}


/* =========================================================
   LOAD ACCOUNTS
========================================================= */

async function loadAccounts() {

  if (!isAdmin()) {
    return;
  }

  const container =
    document.getElementById("accountsList");

  if (!container) {
    return;
  }

  container.innerHTML =
    '<div class="loading">جاري تحميل الحسابات...</div>';


  const result =
    await apiRequest({
      action: "getAccounts",
      accountNumber:
        String(currentUser.accountNumber)
    });


  console.log("ACCOUNTS:", result);


  if (!result.success) {

    container.innerHTML =
      `<div class="loading">
        ${escapeHtml(
          result.message ||
          "تعذر تحميل الحسابات"
        )}
      </div>`;

    return;
  }


  const accounts =
    result.accounts || [];


  updateAccountStats(accounts);


  if (!accounts.length) {

    container.innerHTML =
      '<div class="loading">لا توجد حسابات</div>';

    return;
  }


  container.innerHTML = "";


  accounts.forEach(account => {

    const row =
      document.createElement("div");

    row.className =
      "account-row";


    const status =
      String(
        account.status || ""
      ).toUpperCase();


    let statusText =
      "غير معروف";

    let statusClass =
      "";


    if (status === "APPROVED") {

      statusText = "مقبول";

      statusClass =
        "status-approved";

    } else if (
      status === "PENDING"
    ) {

      statusText = "بانتظار";

      statusClass =
        "status-pending";

    } else if (
      status === "REJECTED"
    ) {

      statusText = "مرفوض";

      statusClass =
        "status-rejected";
    }


    row.innerHTML = `

      <div class="account-number">
        ${escapeHtml(account.accountNumber)}
      </div>


      <div class="account-name">

        <div>
          ${escapeHtml(
            account.nickname || "-"
          )}
        </div>

        <small>
          ${escapeHtml(
            account.email || ""
          )}
        </small>

      </div>


      <div>
        ${escapeHtml(
          account.phone || "-"
        )}
      </div>


      <div
        class="account-status ${statusClass}"
      >
        ${statusText}
      </div>


      <div class="account-actions">

        ${
          status !== "APPROVED"
            ? `
              <button
                class="approve-button"
                onclick="changeAccountStatus(
                  '${escapeJs(account.accountNumber)}',
                  'APPROVED'
                )"
              >
                ✓ قبول
              </button>
            `
            : ""
        }


        ${
          status !== "REJECTED"
            ? `
              <button
                class="reject-button"
                onclick="changeAccountStatus(
                  '${escapeJs(account.accountNumber)}',
                  'REJECTED'
                )"
              >
                ✗ رفض
              </button>
            `
            : ""
        }

      </div>

    `;


    container.appendChild(row);

  });

}


/* =========================================================
   ACCOUNT STATS
========================================================= */

function updateAccountStats(accounts) {

  const total =
    accounts.length;


  const pending =
    accounts.filter(
      account =>
        String(
          account.status
        ).toUpperCase() === "PENDING"
    ).length;


  const approved =
    accounts.filter(
      account =>
        String(
          account.status
        ).toUpperCase() === "APPROVED"
    ).length;


  const totalElement =
    document.getElementById(
      "totalAccounts"
    );

  const pendingElement =
    document.getElementById(
      "pendingAccounts"
    );

  const approvedElement =
    document.getElementById(
      "approvedAccounts"
    );


  if (totalElement) {
    totalElement.textContent = total;
  }

  if (pendingElement) {
    pendingElement.textContent = pending;
  }

  if (approvedElement) {
    approvedElement.textContent = approved;
  }

}


/* =========================================================
   CHANGE ACCOUNT STATUS
========================================================= */

async function changeAccountStatus(
  accountNumber,
  status
) {

  if (!isAdmin()) {
    alert("غير مصرح لك");
    return;
  }


  const text =
    status === "APPROVED"
      ? "هل تريد قبول هذا الحساب؟"
      : "هل تريد رفض هذا الحساب؟";


  if (!confirm(text)) {
    return;
  }


  const result =
    await apiRequest({

      action: "updateAccountStatus",

      adminAccountNumber:
        String(
          currentUser.accountNumber
        ),

      accountNumber:
        String(accountNumber),

      status:
        status

    });


  console.log(
    "UPDATE ACCOUNT:",
    result
  );


  if (!result.success) {

    alert(
      result.message ||
      "تعذر تحديث الحساب"
    );

    return;
  }


  await loadAccounts();

}
