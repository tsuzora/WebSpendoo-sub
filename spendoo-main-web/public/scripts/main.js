import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm";
// Impor 'db' dan fungsi firestore
import { auth } from "./firebase.js";
// import {
//   doc,
//   addDoc,
//   setDoc,
//   deleteDoc,
//   onSnapshot,
//   collection,
//   query,
//   Timestamp, // Pastikan Timestamp diimpor
// } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// Warna Kategori (Sesuai Screenshot/Tema)
const CAT_COLORS = {
    'Salary': '#2ecc71', 'Allowance': '#f1c40f', 
    'Investment': '#9b59b6', 'Bonus': '#e91e63',
    'Business': '#3498db', 'Fund': '#e74c3c',
    'Honorarium': '#1abc9c', 'Royalty': '#95a5a6',
    'Electronics': '#e67e22', 'Energy': '#f1c40f',
    'Groceries': '#e74c3c', 'Internet': '#9b59b6',
    'Education': '#3498db', 'Furniture': '#e91e63',
    'Clothes': '#1abc9c', 'Transport': '#7f8c8d',
    'Others': '#34495e', 'Food': '#d35400', 'Bills': '#c0392b'
};

// === KAMUS SARAN (ADVICE DICTIONARY) ===
const ADVICE_MESSAGES = {
    'Salary': "Income dropped. Check your payroll or work hours.",
    'Investment': "Returns decreased. Re-evaluate your portfolio strategy.",
    'Business': "Revenue is down. Try boosting promotions or sales.",
    'Food': "Food spending spiked! Try cooking at home more often.",
    'Transport': "Transport costs rose. Consider carpooling or public transit.",
    'Shopping': "Shopping is high. Differentiate needs vs wants.",
    'Entertainment': "Fun costs went up. Look for free local events.",
    'Bills': "Bills are higher. Check for energy leaks or subscriptions.",
    // Default fallback
    'default_expense': "This expense increased noticeably. Review your transactions.",
    'default_income': "This income source decreased. Monitor it closely."
};

// === VARIABEL GLOBAL & STATE ===
let currentUserId = null;
let transactions = [];
let currentTxIdToEdit = null; // null jika 'add', ID jika 'edit'
let currentTxType = "expense"; // 'income' or 'expense'
let currentTxDate = new Date();
let currentDatePickerDate = new Date(); // Untuk navigasi kalender
let unsubscribeFromFirestore = null; // Untuk menyimpan fungsi unsub
let currentFilter = 'all'; // Options: 'all', 'income', 'expense'
let currentSort = 'date';  // Options: 'date', 'category'

// === MODIFIKASI: FUNGSI HELPER UNTUK KONVERSI BULAN ===
/**
 * Mengubah nama bulan (String) menjadi angka (0-11)
 * @param {string} monthName - Nama bulan (misal "October")
 * @returns {number} - Indeks bulan (misal 9)
 */
function monthNameToIndex(monthName) {
  if (!monthName) return new Date().getMonth(); // Default ke bulan ini jika data rusak
  const date = new Date(`${monthName} 1, 2000`); // Dapatkan tanggal dari nama bulan
  return date.getMonth(); // 0 = Jan, 1 = Feb, ..., 9 = Oct
}

// === DATA STATIS (KATEGORI, DLL) ===
// ... (Bagian ICONS, CATEGORIES, PAYMENT_METHODS Anda tidak berubah) ...
const ICONS = {
  SALARY: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12h0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5z"/><path d="M18 12.5V17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-4.5"/></svg>`,
  INVESTMENT: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="5"></line><line x1="12" y1="19" x2="12" y2="23"></line><line x1="5" y1="12" x2="1" y2="12"></line><line x1="23" y1="12" x2="19" y2="12"></line><line x1="19.07" y1="4.93" x2="16.24" y2="7.76"></line><line x1="7.76" y1="16.24" x2="4.93" y2="19.07"></line><line x1="19.07" y1="19.07" x2="16.24" y2="16.24"></line><line x1="7.76" y1="7.76" x2="4.93" y2="4.93"></line><circle cx="12" cy="12" r="6"></circle><path d="M12 8v4l2 1"/></svg>`,
  BUSINESS: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l2.09 5.23a2 2 0 0 0 1.83 1.27h12.16a2 2 0 0 0 1.83-1.27L22 12V2H12z"/><path d="M2 7h20"/><path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 12v3"/><path d="M12 17h.01"/></svg>`,
  ROYALTY: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 12 2-2 2 2"/> <path d="m9 16 2-2 2 2"/> <path d="m9 8 2-2 2 2"/> <path d="M3 3v18h18"/><path d="M21 21V3H3"/></svg>`,
  HONORARIUM: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`,
  BONUS: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11v-1a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1"/><path d="M15 11v-1a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1"/><path d="M4 11h16"/><path d="M3 13a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V10H3v3z"/><path d="M12 16v3"/><path d="M10 19h4"/></svg>`,
  ALLOWANCE: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s5.33-8 10-8 10 8 10 8-5.33 8-10 8-10-8-10-8z"/><circle cx="12" cy="12" r="2"/></svg>`,
  FUND: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 3.34a10 10 0 1 1-10 0"/></svg>`,
  OTHERS: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`,
  FOOD: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18"/><path d="M12 3v18"/><path d="m19.49 19.49-4.24-4.24"/><path d="m4.51 4.51 4.24 4.24"/><path d="m19.49 4.51-4.24 4.24"/><path d="m4.51 19.49 4.24-4.24"/></svg>`,
  TRANSPORT: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14v-7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v7z"/><path d="m16 17 2 0"/><path d="m6 17-2 0"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
  BILLS: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  SHOPPING: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  HEALTH: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  ENTERTAINMENT: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>`,
  EDUCATION: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M12 11V5"/><path d="M9.5 11.5 12 13l2.5-1.5"/><path d="M12 17v-4"/></svg>`,
  CASH: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>`,
  DEBIT: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
  EWALLET: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8"/><path d="M18 12h-8"/><path d="M18 16h-8"/><path d="m22 12-3 3-3-3"/><path d="m16 16 3-3 3 3"/></svg>`,
};
const CATEGORIES = {
  income: [
    { name: "Salary", icon: ICONS.SALARY },
    { name: "Investment", icon: ICONS.INVESTMENT },
    { name: "Business", icon: ICONS.BUSINESS },
    { name: "Royalty", icon: ICONS.ROYALTY },
    { name: "Honorarium", icon: ICONS.HONORARIUM },
    { name: "Bonus", icon: ICONS.BONUS },
    { name: "Allowance", icon: ICONS.ALLOWANCE },
    { name: "Fund", icon: ICONS.FUND },
    { name: "Others", icon: ICONS.OTHERS },
  ],
  expense: [
    { name: "Food", icon: ICONS.FOOD },
    { name: "Transport", icon: ICONS.TRANSPORT },
    { name: "Bills", icon: ICONS.BILLS },
    { name: "Shopping", icon: ICONS.SHOPPING },
    { name: "Health", icon: ICONS.HEALTH },
    { name: "Entertainment", icon: ICONS.ENTERTAINMENT },
    { name: "Education", icon: ICONS.EDUCATION },
    { name: "Others", icon: ICONS.OTHERS },
  ],
};
const PAYMENT_METHODS = [
  { name: "Cash", icon: ICONS.CASH },
  { name: "Debit Card", icon: ICONS.DEBIT },
  { name: "E-Wallet", icon: ICONS.EWALLET },
  { name: "Others", icon: ICONS.OTHERS },
];

// === SELEKTOR DOM ===
// ... (Bagian Selektor DOM Anda tidak berubah) ...
const $ = document.querySelector.bind(document);
const loader = $("#loader");
// Home
const userNameDisplay = document.getElementById("userName");
const profilePic = document.getElementById("profilePic");
const logoutBtn = document.getElementById("logoutBtn");
const userGreetingName = $("#user-greeting-name");
// const balanceAmount = $("#balance-amount");
// const transactionList = $("#transaction-list");
// const noTransactionMsg = $("#no-transaction-msg");
// const fabAddTx = $("#fab-add-tx");
// Halaman Transaksi
const pageTx = $("#page-tx");
// const btnBackToHome = $("#btn-back-to-home");
const txPageTitle = $("#tx-page-title");
const btnTxTypeIncome = $("#btn-tx-type-income");
const btnTxTypeExpense = $("#btn-tx-type-expense");
const btnOpenDatePicker = $("#btn-open-datepicker");
const txDateDisplay = $("#tx-date-display");
const btnOpenTimePicker = $("#btn-open-timepicker");
const txTimeDisplay = $("#tx-time-display");
const txAmount = $("#tx-amount");
const txCategory = $("#tx-category");
const paymentMethodContainer = $("#payment-method-container");
const txPayment = $("#tx-payment");
const btnSaveTx = $("#btn-save-tx");
const btnDeleteTx = $("#btn-delete-tx");
// Modal Kategori
const categoryModal = $("#category-modal");
const categoryModalContent = $("#category-modal-content");
const categoryModalTitle = $("#category-modal-title");
const categoryGrid = $("#category-grid");
const btnCloseCategoryModal = $("#btn-close-category-modal");
// Modal Payment
const paymentModal = $("#payment-modal");
const paymentModalContent = $("#payment-modal-content");
const paymentGrid = $("#payment-grid");
const btnClosePaymentModal = $("#btn-close-payment-modal");
// Modal Date Picker
const datepickerModal = $("#datepicker-modal");
const datepickerMonthYear = $("#datepicker-month-year");
const datepickerPrevMonth = $("#datepicker-prev-month");
const datepickerNextMonth = $("#datepicker-next-month");
const datepickerDaysGrid = $("#datepicker-days-grid");
// Modal Time Picker
const timepickerModal = $("#timepicker-modal");
const timeHourUp = $("#time-hour-up");
const timeHourDown = $("#time-hour-down");
const timeHourDisplay = $("#time-hour-display");
const timeMinuteUp = $("#time-minute-up");
const timeMinuteDown = $("#time-minute-down");
const timeMinuteDisplay = $("#time-minute-display");
const timeAmpmAm = $("#time-ampm-am");
const timeAmpmPm = $("#time-ampm-pm");
const btnSetTime = $("#btn-set-time");
// Modal Alert
const alertModal = $("#alert-modal");
const alertTitle = $("#alert-title");
const alertMessage = $("#alert-message");
const btnCloseAlert = $("#btn-close-alert");

// === FUNGSI UTAMA ===

// Inisialisasi Aplikasi setelah Auth
function initApp(user) {
  currentUserId = user.uid;
  console.log("User ID:", currentUserId);

  // Tampilkan info user
  const displayName = user.displayName || user.email?.split("@")[0] || "User";
  if (userNameDisplay) userNameDisplay.textContent = displayName;
  if (userGreetingName) userGreetingName.textContent = displayName;

  if (user.photoURL) {
    if (profilePic) profilePic.src = user.photoURL;
  } else {
    // Ganti path fallback agar konsisten
    if (profilePic) profilePic.src = "Assets/img/user.png";
  }

  // Mulai listener Firestore
  fetchTransactions();

  // Sembunyikan loader jika ada
  if (loader) loader.classList.add("hidden");
}

// === MODIFIKASI DIMULAI: Listener Realtime Firestore ===
const BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://spendoo-backend.vercel.app";
// === MODIFIKASI DIMULAI: Listener Realtime Firestore ===
async function fetchTransactions() {
  if (!auth.currentUser) return;

  try {
    // 1. Get Security Token
    const token = await auth.currentUser.getIdToken();

    // 2. Call Vercel Server
    const response = await fetch(`${BASE_URL}/api/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch");

    const data = await response.json();

    // 3. Normalization (Fix Date Objects from JSON string)
    transactions = data.map((tx) => {
      // Server sends date strings, convert back to JS Date Object for your app logic
      let dateObj = new Date();
      if (tx.date && tx.date._seconds) {
        // Handle if server sent raw Firestore timestamp
        dateObj = new Date(tx.date._seconds * 1000);
      } else if (tx.date) {
        dateObj = new Date(tx.date);
      }

      return { ...tx, date: dateObj }; 
    });

    // Sort descending
    transactions.sort((a, b) => b.date - a.date);

    renderTransactions();
    renderHistoryTable();
    calculateBalance();
  } catch (e) {
    console.error("Error fetching transactions:", e);
    showAlert("Error", "Gagal mengambil data: " + e.message);
  }
}

function renderHomeTable() {
  // Target the specific container in the Home Section
  const container = document.getElementById("home-scroll-container");
  if (!container) return;

  container.innerHTML = "";

  // Optional: Limit to recent 10 transactions
  const recentTransactions = getProcessedTransactions()

  if (recentTransactions.length === 0) {
    container.innerHTML = `<div style="padding:20px; text-align:center; color:#888;">No recent activity.</div>`;
    return;
  }

  recentTransactions.forEach((tx) => {
    // 1. Date Handling
    let txDate;
    if (tx.date && typeof tx.date.toDate === "function") {
      txDate = tx.date.toDate();
    } else {
      txDate = new Date(tx.date);
    }
    const dateStr = formatDate(txDate, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const amountStr = formatCurrency(tx.amount);

    // 2. Icon Handling
    const catObj = CATEGORIES[tx.type]?.find((c) => c.name === tx.category);
    const icon = catObj ? catObj.icon : ICONS.OTHERS;

    // 3. Create Row using your Template Structure
    const row = document.createElement("div");
    row.className = `list-row ${tx.type}`;
    row.setAttribute("role", "row");
    row.dataset.id = tx.id;

    // 4. Inject HTML matching the template
    // We put the Icon inside #cell-name since there is no separate "Type" column in this template
    row.innerHTML = `
      <div id="cell-name" role="gridcell">
         <div style="width:24px; height:24px; color: ${
           tx.type === "income" ? "#2ecc71" : "#e74c3c"
         }">${icon}</div>
         <span style="font-size:24px">${tx.category}</span>
      </div>
      
      <div id="cell-amount" role="gridcell" style="color:#fff">
         ${tx.type === "expense" ? "-" : "+"} Rp${amountStr}
      </div>
      
      <div id="cell-date" role="gridcell">
         ${dateStr}
      </div>
    `;

    // 5. Add Click Listener
    row.addEventListener("click", () => openTxPage("edit", tx.id));

    container.appendChild(row);
  });
}
// === MODIFIKASI SELESAI: Listener Realtime Firestore ===

// Render Daftar Transaksi di Home
// MODIFIKASI: Mengganti format tanggal di render agar sesuai desain gambar
// === REPLACED: Render Home Table (Was renderTransactions) ===
// === RENDER HOME TABLE (CSS Class Version) ===
function renderTransactions() {
  const container = document.getElementById("home-scroll-container");
  if (!container) return;

  container.innerHTML = "";

  if (transactions.length === 0) {
    container.innerHTML = `<div style="padding:20px; text-align:center; color:#888;">No recent activity.</div>`;
    return;
  }

  // Limit to recent 10
  const recentTransactions = transactions.slice(0, 10);

  recentTransactions.forEach((tx) => {
    // 1. Date Handling
    let txDate;
    if (tx.date && typeof tx.date.toDate === "function") {
      txDate = tx.date.toDate();
    } else {
      txDate = new Date(tx.date);
    }
    const dateStr = formatDate(txDate, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const amountStr = formatCurrency(tx.amount);

    // 2. Icon & Color Class Logic
    const catObj = CATEGORIES[tx.type]?.find((c) => c.name === tx.category);
    const icon = catObj ? catObj.icon : ICONS.OTHERS;

    // Determine which class to use based on type
    const colorClass = tx.type === "income" ? "text-income" : "text-expense";
    const sign = tx.type === "expense" ? "-" : "+";

    // 3. Create Row
    const row = document.createElement("div");
    row.className = "list-row";
    row.setAttribute("role", "row");
    row.dataset.id = tx.id;

    // 4. Inject HTML (Using CSS Classes)
    row.innerHTML = `
      <div id="cell-name" role="gridcell">
         <div class="icon-wrapper ${colorClass}">${icon}</div>
         <span>${tx.category}</span>
      </div>
      
      <div id="cell-amount" role="gridcell" class="${colorClass}">
         ${sign} Rp${amountStr}
      </div>
      
      <div id="cell-date" role="gridcell">
         ${dateStr}
      </div>
    `;

    // 5. Click Listener
    row.addEventListener("click", () => openTxPage("edit", tx.id));

    container.appendChild(row);
  });
}

function renderHistoryTable() {
  // 1. Target the existing scroll container in HTML
  const scrollContainer = document.getElementById("scroll-container");

  // Safety check: if we aren't on a page with this container, stop.
  if (!scrollContainer) return;

  // 2. Clear current rows (so we don't duplicate when saving)
  scrollContainer.innerHTML = "";

  // 3. Handle Empty State
  if (transactions.length === 0) {
    scrollContainer.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--sp-gray);">
        No transactions yet.
      </div>`;
    return;
  }

  // 4. Generate & Append Rows
  transactions.forEach((tx) => {
    // --- Date Safety Check ---
    let txDate;
    if (tx.date && typeof tx.date.toDate === "function") {
      txDate = tx.date.toDate();
    } else {
      txDate = new Date(tx.date);
    }

    // Formatting
    const dateString = formatDate(txDate, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const amountString = formatCurrency(tx.amount);

    // Icon Logic
    const categoryObj = CATEGORIES[tx.type]?.find(
      (c) => c.name === tx.category
    );
    const icon = categoryObj ? categoryObj.icon : ICONS.OTHERS;

    // Create Row Element
    const row = document.createElement("div");
    row.className = "list-row";
    row.dataset.id = tx.id;

    // Inject HTML Structure
    row.innerHTML = `
      <div id="cell-name"">
         <div style="width:32px; height:32px;">${icon}</div>
         <span>
            ${tx.category} 
            <small style="opacity:0.6; display:block; font-size:0.8em;">${
              tx.paymentMethod
            }</small>
         </span>
      </div>
      <div id="cell-date">${dateString}</div>
      <div id="cell-amount" class="${
        tx.type === "income" ? "income" : "expense"
      }" style="font-weight:bold;">
         ${tx.type === "expense" ? "-" : "+"} Rp${amountString}
      </div>
    `;

    // Add Edit Listener
    row.addEventListener("click", () => openTxPage("edit", tx.id));

    // Append to container
    scrollContainer.appendChild(row);
  });
}

// Hitung dan Tampilkan Saldo
function calculateBalance() {
  const balanceAmount = document.getElementById("balance-amount");

  if (!balanceAmount) return;

  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((tx) => {
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }
  });

  const balance = totalIncome - totalExpense;
  balanceAmount.textContent = `Rp${formatCurrency(balance)}`;
}

// Buka Halaman Tambah/Edit Transaksi
function openTxPage(mode, txId = null) {
  currentTxIdToEdit = mode === "edit" ? txId : null;

  if (mode === "edit") {
    txPageTitle.textContent = "Edit Transaction";
    btnDeleteTx.classList.add("show");

    const tx = transactions.find((t) => t.id === txId);
    if (tx) {
      // Ini aman karena 'tx.date' sudah jadi Timestamp
      currentTxDate = tx.date.toDate();
      updateTxType(tx.type);
      txAmount.value = tx.amount;
      txCategory.value = tx.category;
      txPayment.value = tx.paymentMethod || "";
    } else {
      showAlert("Error", "Transaksi tidak ditemukan.");
      return;
    }
  } else {
    // mode 'add'
    txPageTitle.textContent = "Add Transaction";
    btnDeleteTx.classList.remove("show");

    // Reset form
    currentTxDate = new Date();
    updateTxType("expense"); // Default
    txAmount.value = "";
    txCategory.value = "";
    txPayment.value = "";
  }

  updateDateTimeDisplay();
  pageTx.classList.add("show");
}

// Tutup Halaman Transaksi
function closeTxPage() {
  pageTx.classList.remove("show");
  currentTxIdToEdit = null;
}

// Update Tampilan Tombol Income/Expense
function updateTxType(type) {
  currentTxType = type;
  if (type === "income") {
    btnTxTypeIncome.classList.add("income-active");
    btnTxTypeExpense.classList.remove("expense-active");
  } else {
    // expense
    btnTxTypeExpense.classList.add("expense-active");
    btnTxTypeIncome.classList.remove("income-active");
  }

  paymentMethodContainer.style.display = "block";
  txCategory.value = "";
  txPayment.value = "";
}

// Update Tampilan Input Tanggal & Waktu
function updateDateTimeDisplay() {
  txDateDisplay.textContent = formatDate(currentTxDate, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  txTimeDisplay.textContent = formatTime(currentTxDate);
}

// === MODIFIKASI DIMULAI: Simpan Transaksi ===
async function saveTransaction() {
  const amount = parseFloat(txAmount.value);
  const category = txCategory.value;
  const paymentMethod = txPayment.value;

  // Ambil tanggal dari 'currentTxDate' (JS Date object)
  const jsDate = currentTxDate;

  // Validasi
  if (!amount || amount <= 0) {
    showAlert("Input Salah", "Jumlah (amount) harus diisi dan lebih dari 0.");
    return;
  }
  if (!category) {
    showAlert("Input Salah", "Kategori harus dipilih.");
    return;
  }
  if (!paymentMethod) {
    showAlert("Input Salah", "Metode pembayaran harus dipilih.");
    return;
  }

  // --- KONVERSI DATA UNTUK DISIMPAN ---
  // Ubah JS Date ke format mobile (date, month, year)
  const txData = {
    type: currentTxType,
    amount: amount,
    category: category,
    paymentMethod: paymentMethod,
    date: jsDate.getDate(),
    month: jsDate.toLocaleDateString("en-US", { month: "long" }),
    year: jsDate.getFullYear(),
    userID: currentUserId || "guest", // Handle null UserID
  };

  try {
    btnSaveTx.disabled = true;
    btnSaveTx.textContent = "Menyimpan...";

    const user = auth.currentUser;

    // ============================================================
    // 1. GUEST MODE LOGIC (Local Storage)
    // ============================================================
    if (!user) {
      // Create a local transaction object
      const guestTx = {
        id: currentTxIdToEdit || "guest_" + Date.now(), // Generate unique ID
        ...txData,
        date: jsDate, // Keep as Date object for immediate rendering
      };

      if (currentTxIdToEdit) {
        // Edit Existing
        const index = transactions.findIndex((t) => t.id === currentTxIdToEdit);
        if (index !== -1) transactions[index] = guestTx;
      } else {
        // Add New (Add to top of list)
        transactions.unshift(guestTx);
      }

      // Update UI Immediately
      renderTransactions();
      renderHomeTable();
      renderHistoryTable();
      calculateBalance();
      closeTxPage();

      console.log("Transaction saved locally (Guest Mode)");
      return;
    }

    // ============================================================
    // 2. SERVER LOGIC (Logged In User)
    // ============================================================
    const token = await user.getIdToken();

    const payload = {
      ...txData,
      date: jsDate.toISOString(),
      id: currentTxIdToEdit,
    };

    const response = await fetch(`${BASE_URL}/api/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Server failed to save");

    console.log("Transaction saved via Server");
    await fetchTransactions(); // Refresh from server
    closeTxPage();
  } catch (e) {
    console.error("Error saving transaction:", e);
    showAlert("Error", "Gagal menyimpan transaksi. " + e.message);
  } finally {
    // Reset Button State
    btnSaveTx.disabled = false;
    btnSaveTx.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1C1B23" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Save`;
  }
}
// === MODIFIKASI SELESAI: Simpan Transaksi ===

// Hapus Transaksi
async function deleteTransaction() {
  if (!currentTxIdToEdit) return;

  // Ganti ini dengan modal konfirmasi kustom jika ada waktu
  const confirmed = confirm("Apakah Anda yakin ingin menghapus transaksi ini?");
  if (!confirmed) return;

  const collectionPath = `users/${currentUserId}/transactions`;
  const docRef = doc(db, collectionPath, currentTxIdToEdit);

  try {
    btnDeleteTx.disabled = true;
    const token = await auth.currentUser.getIdToken();

    const response = await fetch(
      `${BASE_URL}/api/transactions/?id=${currentTxIdToEdit}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error("Delete failed");

    console.log("Deleted via server");

    // REFRESH DATA
    await fetchTransactions();

    closeTxPage();
  } catch (e) {
    console.error("Error deleting transaction:", e);
    showAlert("Error", "Gagal menghapus transaksi. " + e.message);
  } finally {
    btnDeleteTx.disabled = false;
  }
}

// === FUNGSI MODAL (Kategori, Payment, Date, Time) ===
// ... (Kode modal Anda tidak perlu diubah) ...
// Buka Modal Kategori
function openCategoryModal() {
  categoryModalTitle.textContent = `Category ${
    currentTxType === "income" ? "Income" : "Expense"
  }`;
  const categories = CATEGORIES[currentTxType];

  categoryGrid.innerHTML = "";
  categories.forEach((cat) => {
    const item = document.createElement("button");
    item.className = "grid-item";
    item.innerHTML = `
            ${cat.icon}
            <span>${cat.name}</span>
        `;
    item.onclick = () => {
      txCategory.value = cat.name;
      closeCategoryModal();
    };
    categoryGrid.appendChild(item);
  });

  categoryModal.classList.remove("hidden");
  categoryModal.classList.add("sheet");
}
function closeCategoryModal() {
  categoryModal.classList.add("hidden");
  categoryModal.classList.remove("sheet");
}

// Buka Modal Payment
function openPaymentModal() {
  paymentGrid.innerHTML = "";
  // Selalu tampilkan semua payment method
  PAYMENT_METHODS.forEach((method) => {
    const item = document.createElement("button");
    item.className = "grid-item";
    item.innerHTML = `
            ${method.icon}
            <span>${method.name}</span>
        `;
    item.onclick = () => {
      txPayment.value = method.name;
      closePaymentModal();
    };
    paymentGrid.appendChild(item);
  });

  paymentModal.classList.remove("hidden");
  paymentModal.classList.add("sheet");
}
function closePaymentModal() {
  paymentModal.classList.add("hidden");
  paymentModal.classList.remove("sheet");
}

// Buka Modal Date Picker
function openDatePicker() {
  currentDatePickerDate = new Date(currentTxDate.getTime());
  renderDatePicker();
  datepickerModal.classList.remove("hidden");
  datepickerModal.classList.add("datepicker");
}
function closeDatePicker() {
  datepickerModal.classList.add("hidden");
  datepickerModal.classList.remove("datepicker");
}
function renderDatePicker() {
  const year = currentDatePickerDate.getFullYear();
  const month = currentDatePickerDate.getMonth();

  datepickerMonthYear.textContent = formatDate(currentDatePickerDate, {
    month: "long",
    year: "numeric",
  });

  datepickerDaysGrid.innerHTML = "";

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  for (let i = 0; i < startDay; i++) {
    datepickerDaysGrid.innerHTML += `<div class="empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const btn = document.createElement("button");
    btn.textContent = day;

    const thisDate = new Date(year, month, day);
    const today = new Date();

    if (
      day === currentTxDate.getDate() &&
      month === currentTxDate.getMonth() &&
      year === currentTxDate.getFullYear()
    ) {
      btn.classList.add("selected");
    }

    if (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear() &&
      !btn.classList.contains("selected")
    ) {
      btn.classList.add("today");
    }

    btn.onclick = () => {
      currentTxDate.setFullYear(year, month, day);
      updateDateTimeDisplay();
      closeDatePicker();
    };
    datepickerDaysGrid.appendChild(btn);
  }
}

// Buka Modal Time Picker
function openTimePicker() {
  let hour = currentTxDate.getHours();
  let minute = currentTxDate.getMinutes();
  let ampm = "AM";

  if (hour >= 12) {
    ampm = "PM";
    if (hour > 12) hour -= 12;
  }
  if (hour === 0) hour = 12;

  timeHourDisplay.textContent = String(hour).padStart(2, "0");
  timeMinuteDisplay.textContent = String(minute).padStart(2, "0");
  updateTimePickerAMPM(ampm);

  timepickerModal.classList.remove("hidden");
  timepickerModal.classList.add("timepicker");
}
function closeTimePicker() {
  timepickerModal.classList.add("hidden");
  timepickerModal.classList.remove("timepicker");
}
function updateTimePickerAMPM(ampm) {
  if (ampm === "AM") {
    timeAmpmAm.classList.add("active");
    timeAmpmPm.classList.remove("active");
  } else {
    timeAmpmPm.classList.add("active");
    timeAmpmAm.classList.remove("active");
  }
}
function setTimeFromPicker() {
  let hour = parseInt(timeHourDisplay.textContent);
  const minute = parseInt(timeMinuteDisplay.textContent);
  const isPM = timeAmpmPm.classList.contains("active");

  if (isPM && hour !== 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;

  currentTxDate.setHours(hour, minute);
  updateDateTimeDisplay();
  closeTimePicker();
}

// Tampilkan Modal Peringatan
function showAlert(title, message) {
  alertTitle.textContent = title;
  alertMessage.textContent = message;
  alertModal.classList.remove("hidden");
}

// === FUNGSI HELPERS ===
function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID").format(value);
}
function formatDate(date, options) {
  return date.toLocaleDateString("id-ID", options);
}
function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

document.body.addEventListener("click", (e) => {
  const btnFilterIncome = document.getElementById("filter-income-btn");
  if (btnFilterIncome) {
    btnFilterIncome.addEventListener("click", () => {
      // Toggle: If already 'income', switch back to 'all'
      if (currentFilter === "income") {
        currentFilter = "all";
        btnFilterIncome.classList.remove("active");
      } else {
        currentFilter = "income";
        // Reset other buttons
        btnFilterIncome.classList.add("active");
        document
          .getElementById("filter-expense-btn")
          .classList.remove("active");
      }
      renderHomeTable(); // Re-render table
    });
  }

  // 2. Expense Filter
  const btnFilterExpense = document.getElementById("filter-expense-btn");
  if (btnFilterExpense) {
    btnFilterExpense.addEventListener("click", () => {
      // Toggle
      if (currentFilter === "expense") {
        currentFilter = "all";
        btnFilterExpense.classList.remove("active");
      } else {
        currentFilter = "expense";
        btnFilterExpense.classList.add("active");
        document.getElementById("filter-income-btn").classList.remove("active");
      }
      renderHomeTable();
    });
  }

  // 3. Category Sort
  const btnFilterCat = document.getElementById("filter-cat-btn");
  if (btnFilterCat) {
    btnFilterCat.addEventListener("click", () => {
      // Toggle Sort Mode
      if (currentSort === "category") {
        currentSort = "date";
        btnFilterCat.classList.remove("active");
      } else {
        currentSort = "category";
        btnFilterCat.classList.add("active");
      }
      renderHomeTable();
    });
  }
  const fabBtn =
    e.target.closest(".fab-add") || e.target.closest("#fab-add-tx");
  if (fabBtn) {
    openTxPage("add");
  }
  const backHome =
    e.target.closest("#btn-back-to-home") ||
    e.target.closest(".tx-page-back-btn");
  if (backHome) {
    closeTxPage();
  }
  const saveBtn = e.target.closest("#btn-save-tx");
  if (saveBtn) {
    saveTransaction();
  }

  const deleteBtn = e.target.closest("#btn-delete-tx");
  if (deleteBtn) {
    deleteTransaction();
  }

  // --- 4. Transaction Type Toggles ---
  const incomeBtn = e.target.closest("#btn-tx-type-income");
  if (incomeBtn) {
    updateTxType("income");
  }

  const expenseBtn = e.target.closest("#btn-tx-type-expense");
  if (expenseBtn) {
    updateTxType("expense");
  }

  if (e.target.closest("#tx-category")) openCategoryModal();
  if (e.target.closest("#tx-payment")) openPaymentModal();
  if (e.target.closest("#btn-open-datepicker")) openDatePicker();
  if (e.target.closest("#btn-open-timepicker")) openTimePicker();

  // --- 6. Close Modals (Buttons) ---
  if (e.target.closest("#btn-close-category-modal")) closeCategoryModal();
  if (e.target.closest("#btn-close-payment-modal")) closePaymentModal();
  if (e.target.closest("#btn-close-alert")) alertModal.classList.add("hidden");

  // --- 7. Close Modals (Backdrop Clicks) ---
  // Note: We check e.target directly here (not closest) to ensure we clicked the background
  if (e.target.id === "category-modal") closeCategoryModal();
  if (e.target.id === "payment-modal") closePaymentModal();
  if (e.target.id === "datepicker-modal") closeDatePicker();
  if (e.target.id === "timepicker-modal") closeTimePicker();

  // --- 8. Date/Time Picker Controls ---
  if (e.target.closest("#datepicker-prev-month")) {
    currentDatePickerDate.setMonth(currentDatePickerDate.getMonth() - 1);
    renderDatePicker();
  }
  if (e.target.closest("#datepicker-next-month")) {
    currentDatePickerDate.setMonth(currentDatePickerDate.getMonth() + 1);
    renderDatePicker();
  }

  if (e.target.closest("#btn-set-time")) setTimeFromPicker();
  if (e.target.closest("#time-ampm-am")) updateTimePickerAMPM("AM");
  if (e.target.closest("#time-ampm-pm")) updateTimePickerAMPM("PM");

  // Time Picker Arrows (Helper function to reduce repetition)
  const handleTimeChange = (btnId, displayElem, delta, min, max) => {
    if (e.target.closest(btnId)) {
      let value = parseInt(displayElem.textContent) + delta;
      if (value > max) value = min;
      if (value < min) value = max;
      displayElem.textContent = String(value).padStart(2, "0");
    }
  };

  handleTimeChange("#time-hour-up", timeHourDisplay, 1, 1, 12);
  handleTimeChange("#time-hour-down", timeHourDisplay, -1, 1, 12);
  handleTimeChange("#time-minute-up", timeMinuteDisplay, 1, 0, 59);
  handleTimeChange("#time-minute-down", timeMinuteDisplay, -1, 0, 59);
});

// === OTENTIKASI ===
onAuthStateChanged(auth, (user) => {
  // Cek apakah user masuk sebagai Guest dari localStorage
  const isGuest = localStorage.getItem("isGuest") === "true";

  if (user) {
    // === KONDISI 1: USER LOGIN RESMI FIREBASE ===
    console.log("onAuthStateChanged: User logged in", user.uid);

    // Hapus flag guest jika user login beneran (untuk kebersihan data)
    localStorage.removeItem("isGuest");

    // Jalankan fungsi inisialisasi aplikasi Anda
    if (typeof initApp === "function") initApp(user);

    // Update localStorage sesuai data akun
    // Pastikan elemen profilePic dan userNameDisplay ada sebelum mengakses propertinya
    const profilePic = document.getElementById("profilePic");
    const userNameDisplay = document.getElementById("userName");

    if (profilePic) localStorage.setItem("userPhoto", profilePic.src);
    if (userNameDisplay)
      localStorage.setItem("userName", userNameDisplay.textContent);
  } else if (isGuest) {
    // === KONDISI 2: USER ADALAH GUEST ===
    console.log("onAuthStateChanged: Guest mode active.");

    // Jangan redirect! Biarkan mereka di halaman ini.
    // Kita bisa set UI manual di sini jika elemen sudah ada di DOM
    const userNameDisplay = document.getElementById("userName");
    const profilePic = document.getElementById("profilePic");

    if (userNameDisplay) userNameDisplay.textContent = "Guest";
    if (profilePic) profilePic.src = "assets/img/user.png";

  } else {
    // === KONDISI 3: BELUM LOGIN & BUKAN GUEST ===
    console.log("onAuthStateChanged: No user. Redirecting to login.");

    if (typeof unsubscribeFromFirestore === "function") {
      unsubscribeFromFirestore();
      // unsubscribeFromFirestore = null; // Uncomment jika variabel ini bisa diakses
    }

    // Redirect ke index.html jika user tidak ada di halaman login/signup
    if (
      !window.location.pathname.endsWith("index.html") &&
      !window.location.pathname.endsWith("signup.html")
    ) {
      window.location.href = "index.html";
    }
  }
});

// Tombol logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
      showAlert("Error", "Gagal logout. " + error.message);
    } finally {
      localStorage.clear();
      window.location.href = "index.html";
    }
  });
}

const navLinks = document.querySelectorAll(".nav-links a");

navLinks.forEach((link) => {
  link.addEventListener("click", function (e) {
    navLinks.remove((btn) => btn.classList.remove("active"));

    this.classList.add("active");
  });
});

const container = document.getElementById("profileContainer");

// Toggle on click
container.addEventListener("click", (e) => {
  e.stopPropagation();
  container.classList.toggle("active");
});

// Close when clicking outside
document.addEventListener("click", (e) => {
  if (!container.contains(e.target)) {
    container.classList.remove("active");
  }
});

// === HELPER: Filter & Sort Data ===
function getProcessedTransactions() {
  // 1. Create a copy of the array
  let processed = [...transactions];

  // 2. Apply Filter (Income/Expense)
  if (currentFilter !== 'all') {
    processed = processed.filter(tx => tx.type === currentFilter);
  }

  // 3. Apply Sort (Date vs Category)
  if (currentSort === 'category') {
    // Sort A-Z by Category Name
    processed.sort((a, b) => a.category.localeCompare(b.category));
  } else {
    // Default: Sort by Date (Newest first)
    processed.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return processed;
}
// === VARIABEL GLOBAL CHART ===
let financialChartInstance = null;
let analyzeViewMode = 'monthly'; // 'monthly' or 'yearly'
let analyzeDate = new Date(); // Tanggal yang sedang dilihat di Analyze

// === FUNGSI LOGIKA CHART ===

function initChartPage() {
    renderChartControls();
    updateChartData();
}

// 1. Render Teks Periode (Ex: "August 2025" atau "2025")
function renderChartControls() {
    const label = document.getElementById('chart-period-label');
    const btnMonthly = document.getElementById('btn-view-monthly');
    const btnYearly = document.getElementById('btn-view-yearly');

    if (!label) return;

    if (analyzeViewMode === 'monthly') {
        // Tampilkan Bulan & Tahun
        label.textContent = formatDate(analyzeDate, { month: 'long', year: 'numeric' });
        btnMonthly.classList.add('active');
        btnYearly.classList.remove('active');
    } else {
        // Tampilkan Tahun saja
        label.textContent = analyzeDate.getFullYear();
        btnYearly.classList.add('active');
        btnMonthly.classList.remove('active');
    }
}
// === FUNGSI YANG HILANG: MENGGAMBAR CHART UTAMA ===
// === VERSI AMAN: RENDER CHART ===
function renderCanvasChart(labels, incomeData, expenseData) {
    const ctx = document.getElementById('financialChart');
    
    // Cek 1: Apakah elemen canvas ada di HTML?
    if (!ctx) {
        console.error("Canvas element #financialChart not found!");
        return;
    }

    // Cek 2: Apakah library Chart.js sudah termuat?
    if (typeof Chart === 'undefined') {
        console.error("Chart.js library not loaded yet.");
        return;
    }

    // Hapus chart lama jika ada
    if (financialChartInstance) {
        financialChartInstance.destroy();
    }

    // GUNAKAN TRY-CATCH AGAR TIDAK MEMATIKAN FUNGSI LAIN JIKA ERROR
    try {
        financialChartInstance = new Chart(ctx, {
            type: 'bar', 
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: '#2ecc71',
                        borderColor: '#2ecc71',
                        borderWidth: 1,
                        borderRadius: 4,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Expense',
                        data: expenseData,
                        backgroundColor: '#e74c3c',
                        borderColor: '#e74c3c',
                        borderWidth: 1,
                        borderRadius: 4,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Penting agar menyesuaikan CSS height
                scales: {
                    x: { ticks: { color: '#aebdb4' }, grid: { display: false } },
                    y: { ticks: { color: '#aebdb4' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                },
                plugins: {
                    legend: { labels: { color: '#fff' } }
                }
            }
        });
        console.log("Chart rendered successfully!");
    } catch (error) {
        console.error("Gagal menggambar chart:", error);
        // Script akan lanjut jalan ke bawah (update breakdown) meskipun chart error
    }
}

// 2. Olah Data & Render Chart
// === UPDATE: LOGIKA CHART DENGAN EMPTY STATE ===
function updateChartData() {
  const canvasContainer = document.getElementById("chart-canvas-container");
  const emptyStateContainer = document.getElementById("chart-empty-state");
  const emptyTitle = document.getElementById("empty-state-title");
  const emptyDesc = document.getElementById("empty-state-desc");

  // Elemen tambahan
  const breakdownSection = document.getElementById("breakdown-section");
  const adviceSection = document.getElementById("advice-section");

  if (!canvasContainer || !emptyStateContainer) return;

  // 1. SIAPKAN DATA
  let labels = [];
  let incomeData = [];
  let expenseData = [];
  let totalDataCount = 0;

  const validTx = transactions;

  if (analyzeViewMode === "monthly") {
    const year = analyzeDate.getFullYear();
    const month = analyzeDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    incomeData = new Array(daysInMonth).fill(0);
    expenseData = new Array(daysInMonth).fill(0);

    validTx.forEach((tx) => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === year && txDate.getMonth() === month) {
        const dayIndex = txDate.getDate() - 1;
        // [PENTING] Gunakan Number() agar tidak dianggap teks
        const amount = Number(tx.amount) || 0;

        if (tx.type === "income") incomeData[dayIndex] += amount;
        else expenseData[dayIndex] += amount;

        totalDataCount++;
      }
    });
  } else {
    const year = analyzeDate.getFullYear();
    labels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    incomeData = new Array(12).fill(0);
    expenseData = new Array(12).fill(0);

    validTx.forEach((tx) => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === year) {
        const monthIndex = txDate.getMonth();
        const amount = Number(tx.amount) || 0;

        if (tx.type === "income") incomeData[monthIndex] += amount;
        else expenseData[monthIndex] += amount;
        totalDataCount++;
      }
    });
  }

  // 2. TENTUKAN TAMPILAN
  if (totalDataCount === 0) {
    // === KOSONG ===
    canvasContainer.classList.add("hidden");
    if (breakdownSection) breakdownSection.classList.add("hidden"); // Sembunyikan Donut
    if (adviceSection) adviceSection.classList.add("hidden"); // Sembunyikan Advice

    if (financialChartInstance) {
      financialChartInstance.destroy();
      financialChartInstance = null;
    }

    emptyStateContainer.classList.remove("hidden");

    if (analyzeViewMode === "monthly") {
      const monthName = formatDate(analyzeDate, { month: "long" });
      emptyTitle.textContent = `No Transactions in ${monthName}`;
      emptyDesc.textContent = `There's no transaction yet for this month!`;
    } else {
      const yearNum = analyzeDate.getFullYear();
      emptyTitle.textContent = `No Transactions in ${yearNum}`;
      emptyDesc.textContent = `There's no transaction yet for this year!`;
    }

    canvasContainer.style.display = "none";
    emptyStateContainer.style.display = "flex";
  } else {
    // === ADA DATA ===
    emptyStateContainer.classList.add("hidden");
    canvasContainer.classList.remove("hidden");
    emptyStateContainer.style.display = "none";
    canvasContainer.style.display = "block";

    // Render Chart
    renderCanvasChart(labels, incomeData, expenseData);

    // Render Donut & Total
    if (typeof updateBreakdownSection === "function") {
      updateBreakdownSection();
    }

    // Render Advice (Hitung total dulu)
    const totalIncome = incomeData.reduce((a, b) => a + b, 0);
    const totalExpense = expenseData.reduce((a, b) => a + b, 0);

    // Panggil fungsi Advice (Pastikan fungsinya sudah dibuat di bawah)
    if (typeof updateAdviceSection === "function") {
      updateAdviceSection(totalIncome, totalExpense);
    }
  }
}

// === EVENT LISTENER KHUSUS ANALYZE PAGE ===
// Tambahkan ini di bagian bawah, di dalam event listener document click yang sudah ada atau buat baru

document.body.addEventListener('click', (e) => {
    // 1. Toggle Monthly
    if (e.target.id === 'btn-view-monthly') {
        analyzeViewMode = 'monthly';
        analyzeDate = new Date(); // Reset ke hari ini
        initChartPage();
    }
    // 2. Toggle Yearly
    if (e.target.id === 'btn-view-yearly') {
        analyzeViewMode = 'yearly';
        analyzeDate = new Date(); // Reset ke tahun ini
        initChartPage();
    }

    // 3. Navigasi Previous (<)
    if (e.target.closest('#btn-chart-prev')) {
        if (analyzeViewMode === 'monthly') {
            analyzeDate.setMonth(analyzeDate.getMonth() - 1);
        } else {
            analyzeDate.setFullYear(analyzeDate.getFullYear() - 1);
        }
        initChartPage();
    }

    // 4. Navigasi Next (>)
    if (e.target.closest('#btn-chart-next')) {
        if (analyzeViewMode === 'monthly') {
            analyzeDate.setMonth(analyzeDate.getMonth() + 1);
        } else {
            analyzeDate.setFullYear(analyzeDate.getFullYear() + 1);
        }
        initChartPage();
    }
});

// MODIFIKASI NAV LINK: Saat klik menu "Analyze", render chartnya
const analyzeLink = document.querySelector('.nav-link[data-target="analyze"]');
if (analyzeLink) {
    analyzeLink.addEventListener('click', () => {
        // Beri sedikit delay agar section aktif dulu (display block) baru chart dirender
        setTimeout(() => {
            initChartPage();
        }, 100);
    });
}

// === LOGIKA BREAKDOWN (DONUT & COMPARISON) ===

let incomeChartInstance = null;
let expenseChartInstance = null;

function updateBreakdownSection() {
    const breakdownSection = document.getElementById('breakdown-section');
    const periodNameEls = document.querySelectorAll('.period-name');
    
    // Jika tidak ada data chart utama, sembunyikan juga breakdown ini
    breakdownSection.classList.remove('hidden');

    // 1. Update Nama Periode (August / 2025)
    const currentPeriodName = analyzeViewMode === 'monthly' 
        ? formatDate(analyzeDate, { month: 'long' }) 
        : analyzeDate.getFullYear();
    
    periodNameEls.forEach(el => el.textContent = currentPeriodName);

    // 2. Proses Data Income & Expense
    processBreakdownData('income');
    processBreakdownData('expense');
}

function processBreakdownData(type) {
    // A. Filter Data Saat Ini
    const currentData = getTransactionsByPeriod(analyzeDate, type);
    const totalCurrent = currentData.reduce((sum, t) => sum + t.amount, 0);

    // B. Filter Data Sebelumnya (Previous) untuk Komparasi
    let prevDate = new Date(analyzeDate);
    if (analyzeViewMode === 'monthly') {
        prevDate.setMonth(prevDate.getMonth() - 1);
    } else {
        prevDate.setFullYear(prevDate.getFullYear() - 1);
    }
    const prevData = getTransactionsByPeriod(prevDate, type);
    const totalPrev = prevData.reduce((sum, t) => sum + t.amount, 0);

    // C. Hitung Persentase Perubahan
    let percentage = 0;
    if (totalPrev > 0) {
        percentage = ((totalCurrent - totalPrev) / totalPrev) * 100;
    } else if (totalCurrent > 0) {
        percentage = 100; // Jika sebelumnya 0 dan sekarang ada, anggap naik 100%
    }

    // D. Update Text UI
    const totalDisplay = document.getElementById(`${type}-total-display`);
    const compText = document.getElementById(`${type}-comparison`);
    
    totalDisplay.textContent = `Rp${formatCurrency(totalCurrent)}`;

    const formattedPercent = Math.abs(percentage).toFixed(0);
    const direction = percentage >= 0 ? 'increased' : 'decreased';
    const arrow = percentage >= 0 ? '▲' : '▼';
    const colorClass = percentage >= 0 ? 'up' : 'down';
    const prevPeriodName = analyzeViewMode === 'monthly' 
        ? formatDate(prevDate, { month: 'long' }) 
        : prevDate.getFullYear();

    compText.className = `comparison-text ${colorClass}`;
    compText.innerHTML = `<span class="arrow">${arrow}</span> Your total ${type} ${direction} by <b>${formattedPercent}%</b> compared to ${prevPeriodName}.`;

    // E. Group by Category untuk Chart
    const categoryMap = {};
    currentData.forEach(tx => {
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
    });

    const labels = Object.keys(categoryMap);
    const dataValues = Object.values(categoryMap);
    const bgColors = labels.map(cat => CAT_COLORS[cat] || '#999');

    // F. Render Donut Chart
    renderDonut(type, labels, dataValues, bgColors);
    
    // G. Render Custom Legend
    renderCustomLegend(type, labels, bgColors);
}

// Helper: Ambil transaksi berdasarkan periode aktif
function getTransactionsByPeriod(dateObj, type) {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    
    return transactions.filter(tx => {
        const txDate = new Date(tx.date);
        const matchType = tx.type === type;
        
        if (analyzeViewMode === 'monthly') {
            return matchType && txDate.getFullYear() === year && txDate.getMonth() === month;
        } else {
            return matchType && txDate.getFullYear() === year;
        }
    });
}

// === FIX: RENDER DONUT DENGAN AMAN ===
function renderDonut(type, labels, data, colors) {
    const canvasId = `${type}DonutChart`;
    const ctx = document.getElementById(canvasId);
    
    // Cek elemen
    if (!ctx) {
        console.warn(`Canvas #${canvasId} tidak ditemukan.`);
        return;
    }

    // Hapus chart lama agar tidak menumpuk (glitch saat hover)
    if (type === 'income' && incomeChartInstance) {
        incomeChartInstance.destroy();
        incomeChartInstance = null;
    }
    if (type === 'expense' && expenseChartInstance) {
        expenseChartInstance.destroy();
        expenseChartInstance = null;
    }

    // Render Chart Baru
    try {
        const newChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Ini butuh CSS height yang sudah kita set
                cutout: '70%', // Ketebalan donut
                plugins: {
                    legend: { display: false }, // Legend custom
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                 let val = new Intl.NumberFormat('id-ID').format(context.raw);
                                 return ` ${context.label}: Rp${val}`;
                            }
                        }
                    }
                }
            }
        });

        // Simpan instance ke variabel global
        if (type === 'income') incomeChartInstance = newChart;
        else expenseChartInstance = newChart;
        
    } catch (e) {
        console.error(`Gagal render donut ${type}:`, e);
    }
}

function renderCustomLegend(type, labels, colors) {
    const container = document.getElementById(`${type}-legend`);
    container.innerHTML = '';

    labels.forEach((label, index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <span class="legend-dot" style="background-color: ${colors[index]}"></span>
            ${label}
        `;
        container.appendChild(item);
    });
}

// === FUNGSI LOGIKA GRADE & ADVICE ===
// === FUNGSI LOGIKA GRADE & ADVICE (YANG SEBELUMNYA HILANG) ===
function updateAdviceSection(totalIncome, totalExpense) {
    const adviceWrapper = document.getElementById('advice-section');
    const gradeCard = document.getElementById('grade-card');
    const gradeTitle = document.getElementById('grade-title');
    const gradeDesc = document.getElementById('grade-desc');
    const adviceGrid = document.getElementById('advice-grid');

    if (!adviceWrapper) return; // Safety check

    // Tampilkan Section
    adviceWrapper.classList.remove('hidden');

    // 1. HITUNG GRADE
    let savingsRate = 0;
    if (totalIncome > 0) {
        savingsRate = (totalIncome - totalExpense) / totalIncome;
    } else if (totalExpense > 0) {
        savingsRate = -1; 
    }

    gradeCard.className = 'grade-card'; // Reset class
    if (savingsRate >= 0.4) {
        gradeCard.classList.add('excellent');
        gradeTitle.textContent = "EXCELLENT!";
        gradeDesc.textContent = "Outstanding! You saved over 40% of your income.";
    } else if (savingsRate >= 0.2) {
        gradeCard.classList.add('good');
        gradeTitle.textContent = "GOOD JOB!";
        gradeDesc.textContent = "You're doing well by saving over 20%.";
    } else if (savingsRate >= 0) {
        gradeCard.classList.add('fair');
        gradeTitle.textContent = "FAIR";
        gradeDesc.textContent = "You are breaking even. Try to save more.";
    } else {
        gradeCard.classList.add('poor');
        gradeTitle.textContent = "NEEDS ATTENTION";
        gradeDesc.textContent = "Warning! Expenses exceed income.";
    }

    // 2. GENERATE ADVICE
    adviceGrid.innerHTML = '';
    const currentCats = getCategorySums(analyzeDate);
    
    // Bandingkan dengan bulan lalu
    let prevDate = new Date(analyzeDate);
    if (analyzeViewMode === 'monthly') prevDate.setMonth(prevDate.getMonth() - 1);
    else prevDate.setFullYear(prevDate.getFullYear() - 1);
    
    const prevCats = getCategorySums(prevDate);
    let adviceCount = 0;

    for (const [key, amount] of Object.entries(currentCats)) {
        const [type, catName] = key.split('_');
        const prevAmount = prevCats[key] || 0;
        let percentChange = 0;

        if (prevAmount > 0) percentChange = ((amount - prevAmount) / prevAmount) * 100;
        else if (amount > 0) percentChange = 100;

        let isBadTrend = false;
        // Logic muncul saran: Expense naik > 10% ATAU Income turun > 5%
        if (type === 'expense' && percentChange > 10 && amount > 50000) isBadTrend = true;
        else if (type === 'income' && percentChange < -5) isBadTrend = true;

        if (isBadTrend) {
            adviceCount++;
            let msg = ADVICE_MESSAGES[catName] || ADVICE_MESSAGES['default_expense'];
            const indicatorColor = type === 'expense' ? '#e74c3c' : '#f1c40f';
            
            // Cari Icon
            const catObj = CATEGORIES[type]?.find(c => c.name === catName);
            const iconSvg = catObj ? catObj.icon : '⚠️';

            const card = document.createElement('div');
            card.className = 'advice-card';
            card.style.borderLeftColor = indicatorColor;
            card.innerHTML = `
                <div class="advice-icon-box" style="color: ${indicatorColor}">${iconSvg}</div>
                <div class="advice-details">
                    <div class="advice-header">
                        <span class="advice-cat-name">${catName}</span>
                        <span class="advice-trend" style="color:${indicatorColor}">
                            ${type === 'expense' ? '▲' : '▼'} ${Math.abs(percentChange).toFixed(0)}%
                        </span>
                    </div>
                    <p class="advice-text">${msg}</p>
                </div>
            `;
            adviceGrid.appendChild(card);
        }
    }
    
    // Jika tidak ada saran
    if (adviceCount === 0) {
        adviceGrid.innerHTML = `<div style="text-align:center; padding:20px; color:#fff;">No negative trends! Keep it up! 🎉</div>`;
    }
}

// Helper: Hitung total per kategori untuk periode tertentu
function getCategorySums(dateObj) {
    const sums = {};
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();

    transactions.forEach(tx => {
        const txDate = new Date(tx.date);
        let match = false;
        if (analyzeViewMode === 'monthly') {
            match = (txDate.getFullYear() === year && txDate.getMonth() === month);
        } else {
            match = (txDate.getFullYear() === year);
        }

        if (match) {
            const key = `${tx.type}_${tx.category}`;
            sums[key] = (sums[key] || 0) + tx.amount;
        }
    });
    return sums;
}

// === GENERATOR DATA DUMMY (UNTUK TESTING) ===
function generateDummyData() {
    console.log("Generating dummy data for December...");
    
    // Pastikan array transactions kosong dulu agar bersih
    transactions = []; 

    const categories = {
        income: ['Salary', 'Bonus', 'Business', 'Investment'],
        expense: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment']
    };

    // Loop untuk 15 hari pertama di bulan Desember 2025
    for (let i = 1; i <= 15; i++) {
        // Random Tipe (Income / Expense)
        const isExpense = Math.random() > 0.3; // 70% kemungkinan expense
        const type = isExpense ? 'expense' : 'income';
        
        // Random Kategori
        const catList = categories[type];
        const category = catList[Math.floor(Math.random() * catList.length)];

        // Random Amount (50rb - 500rb untuk expense, 1jt - 5jt untuk income)
        let amount;
        if (type === 'income') {
            amount = Math.floor(Math.random() * (5000000 - 1000000) + 1000000);
        } else {
            amount = Math.floor(Math.random() * (500000 - 50000) + 50000);
        }

        // Buat Tanggal: Desember 2025 (Bulan 11 di JS karena index mulai 0)
        const date = new Date(2025, 11, i); 

        transactions.push({
            id: `dummy_${i}`,
            type: type,
            amount: amount,
            category: category,
            paymentMethod: 'Cash', // Default
            date: date, // Objek Date native
            description: 'Dummy Data Testing'
        });
    }

    console.log(`Berhasil membuat ${transactions.length} transaksi dummy.`);
    
    // --- PENTING: RE-RENDER CHART & TAMPILAN ---
    // Kita set view mode ke Monthly & Desember agar langsung terlihat
    analyzeViewMode = 'monthly';
    analyzeDate = new Date(2025, 11, 1); // Set kalender aplikasi ke Des 2025
    
    // Panggil fungsi-fungsi render
    if (typeof initChartPage === 'function') initChartPage();
    if (typeof renderTransactions === 'function') renderTransactions();
    if (typeof calculateBalance === 'function') calculateBalance();
}

// Jalankan fungsinya langsung!
generateDummyData();