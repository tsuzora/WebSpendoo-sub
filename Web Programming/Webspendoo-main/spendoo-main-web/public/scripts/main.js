import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
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

// === VARIABEL GLOBAL & STATE ===
let currentUserId = null;
let transactions = [];
let currentTxIdToEdit = null; // null jika 'add', ID jika 'edit'
let currentTxType = "expense"; // 'income' or 'expense'
let currentTxDate = new Date();
let currentDatePickerDate = new Date(); // Untuk navigasi kalender
let unsubscribeFromFirestore = null; // Untuk menyimpan fungsi unsub

// === ANALYZE PAGE ===
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const MONTH_LABELS_SHORT = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

let financialChartInstance = null;
let analyzeViewMode = "month";     // 'month' = Per Bulan, 'year' = Per Tahun
let analyzeSeriesType = "income";  // 'income' atau 'expense'

// DOM
const viewMonthBtn = document.getElementById("view-month");
const viewYearBtn  = document.getElementById("view-year");
const selectYear   = document.getElementById("select-year");
const selectMonth  = document.getElementById("select-month");
const labelMonth   = document.getElementById("label-month");
const typeIncomeBtn  = document.getElementById("type-income");
const typeExpenseBtn = document.getElementById("type-expense");

// === ADVICE / DONUT CHARTS ===
let adviceIncomeChart = null;
let adviceExpenseChart = null;

const CATEGORY_COLORS = [
  "#22c55e","#4ade80","#bef264","#f97316",
  "#fb923c","#facc15","#38bdf8","#6366f1",
  "#a855f7","#ec4899","#f97373","#f59e0b"
];

const adviceIncomePeriodEl  = document.getElementById("advice-income-period");
const adviceExpensePeriodEl = document.getElementById("advice-expense-period");
const adviceIncomeTotalEl   = document.getElementById("advice-income-total");
const adviceExpenseTotalEl  = document.getElementById("advice-expense-total");
const adviceIncomeArrowEl   = document.getElementById("advice-income-arrow");
const adviceExpenseArrowEl  = document.getElementById("advice-expense-arrow");
const adviceIncomeTextEl    = document.getElementById("advice-income-text");
const adviceExpenseTextEl   = document.getElementById("advice-expense-text");
const adviceIncomeLegendEl  = document.getElementById("advice-income-legend");
const adviceExpenseLegendEl = document.getElementById("advice-expense-legend");


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
const balanceAmount = $("#balance-amount");
const transactionList = $("#transaction-list");
const noTransactionMsg = $("#no-transaction-msg");
const fabAddTx = $("#fab-add-tx");
// Halaman Transaksi
const pageTx = $("#page-tx");
const btnBackToHome = $("#btn-back-to-home");
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

  // Setup event listener UI
  setupEventListeners();

  // Sembunyikan loader jika ada
  if (loader) loader.classList.add("hidden");
}

// === MODIFIKASI DIMULAI: Listener Realtime Firestore ===
async function fetchTransactions() {
  if (!auth.currentUser) return;

  try {
    // 1. Get Security Token
    const token = await auth.currentUser.getIdToken();

    // 2. Call Vercel Server
    const response = await fetch("/api/transactions", {
      method: "GET",
      headers: { Authorization: token },
    });

    if (!response.ok) throw new Error("Failed to fetch");

    const data = await response.json();

    // 3. Normalization (Fix Date Objects from JSON string)
    transactions = data.map((tx) => {
      // Server sends date strings, convert back to JS Date Object for your app logic
      // Note: We don't use Firebase Timestamp objects anymore on frontend
      let dateObj = new Date();
      if (tx.date && tx.date._seconds) {
        // Handle if server sent raw Firestore timestamp
        dateObj = new Date(tx.date._seconds * 1000);
      } else if (tx.date) {
        dateObj = new Date(tx.date);
      }

      return { ...tx, date: dateObj }; // We pretend it's a Timestamp object for your logic
    });

    // Sort descending
    transactions.sort((a, b) => b.date - a.date);

    renderTransactions();
    calculateBalance();
    initOrUpdateAnalyzeControls();
  } catch (e) {
    console.error("Error fetching transactions:", e);
    showAlert("Error", "Gagal mengambil data: " + e.message);
  }
}
// === MODIFIKASI SELESAI: Listener Realtime Firestore ===

// Render Daftar Transaksi di Home
// MODIFIKASI: Mengganti format tanggal di render agar sesuai desain gambar
function renderTransactions() {
  transactionList.innerHTML = "";

  if (transactions.length === 0) {
    noTransactionMsg.classList.remove("hidden");
    return;
  }

  noTransactionMsg.classList.add("hidden");

  transactions.forEach((tx) => {
    // 'tx.date' sekarang dijamin adalah Timestamp
    // berkat modifikasi di setupFirestoreListener
    const txDate = tx.date.toDate();
    const typeClass = tx.type; // 'income' or 'expense'

    const categoryData = CATEGORIES[tx.type]?.find(
      (c) => c.name === tx.category
    ) || { icon: ICONS.OTHERS };
    const icon = categoryData.icon;

    const txElement = document.createElement("div");
    txElement.className = `tx-item ${typeClass}`;
    txElement.dataset.id = tx.id;

    txElement.innerHTML = `
            <div class="tx-item-left">
                <div class="tx-item-icon">
                    ${icon}
                </div>
                <div class="tx-item-details">
                    <p class="tx-item-category">${tx.category}</p>
                    <p class="tx-item-date">${formatDate(txDate, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}</p>
                </div>
            </div>
            <p class="tx-item-amount">Rp${formatCurrency(tx.amount)}</p>
        `;

    txElement.addEventListener("click", () => {
      openTxPage("edit", tx.id);
    });

    transactionList.appendChild(txElement);
  });
}

// Hitung dan Tampilkan Saldo
function calculateBalance() {
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

// Pastikan dapat objek Date dari field tx.date
function getTxDate(tx) {
  if (!tx || !tx.date) return null;
  if (typeof tx.date.toDate === "function") {
    return tx.date.toDate();
  }
  return new Date(tx.date);
}

// Ambil semua tahun yang ada di data transaksi
function getAvailableYears() {
  const yearSet = new Set();

  transactions.forEach((tx) => {
    const d = getTxDate(tx);
    if (!d || isNaN(d)) return;
    yearSet.add(d.getFullYear());
  });

  const years = Array.from(yearSet).sort((a, b) => a - b);
  return years;
}

// Ambil semua bulan (0-11) pada tahun tertentu
function getAvailableMonthsForYear(year) {
  const monthSet = new Set();

  transactions.forEach((tx) => {
    const d = getTxDate(tx);
    if (!d || isNaN(d)) return;
    if (d.getFullYear() === year) {
      monthSet.add(d.getMonth());
    }
  });

  return Array.from(monthSet).sort((a, b) => a - b);
}

function buildDailyData(year, monthIndex) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const incomePerDay = new Array(daysInMonth).fill(0);
  const expensePerDay = new Array(daysInMonth).fill(0);

  transactions.forEach((tx) => {
    const d = getTxDate(tx);
    if (!d || isNaN(d)) return;

    if (d.getFullYear() === year && d.getMonth() === monthIndex) {
      const day = d.getDate(); // 1..daysInMonth
      const idx = day - 1;
      const amount = Number(tx.amount) || 0;

      if (tx.type === "income") {
        incomePerDay[idx] += amount;
      } else if (tx.type === "expense") {
        expensePerDay[idx] += amount;
      }
    }
  });

  const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

  return {
    labels,
    incomeData: incomePerDay,
    expenseData: expensePerDay,
  };
}

function buildMonthlyData(year) {
  const incomePerMonth = new Array(12).fill(0);
  const expensePerMonth = new Array(12).fill(0);

  transactions.forEach((tx) => {
    const d = getTxDate(tx);
    if (!d || isNaN(d)) return;

    if (d.getFullYear() === year) {
      const m = d.getMonth(); // 0..11
      const amount = Number(tx.amount) || 0;

      if (tx.type === "income") {
        incomePerMonth[m] += amount;
      } else if (tx.type === "expense") {
        expensePerMonth[m] += amount;
      }
    }
  });

  return {
    labels: MONTH_LABELS_SHORT,
    incomeData: incomePerMonth,
    expenseData: expensePerMonth,
  };
}

// Tentukan periode aktif (month/year) dari analyzeViewMode
function getCurrentPeriod() {
  const year = Number(selectYear?.value || new Date().getFullYear());
  if (analyzeViewMode === "month") {
    const monthIndex = Number(selectMonth?.value || new Date().getMonth());
    return { type: "month", year, monthIndex };
  }
  return { type: "year", year };
}

// Periode sebelumnya untuk perbandingan
function getPreviousPeriod(period) {
  if (period.type === "month") {
    let y = period.year;
    let m = period.monthIndex - 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    return { type: "month", year: y, monthIndex: m };
  }
  return { type: "year", year: period.year - 1 };
}

// Ambil transaksi sesuai periode + tipe (income / expense)
function filterTransactionsByPeriod(period, txType) {
  return transactions.filter((tx) => {
    if (txType && tx.type !== txType) return false;
    const d = getTxDate(tx);
    if (!d || isNaN(d)) return false;
    if (period.type === "month") {
      return d.getFullYear() === period.year && d.getMonth() === period.monthIndex;
    }
    return d.getFullYear() === period.year;
  });
}

// Agregasi per kategori
function aggregateCategory(period, txType) {
  const map = new Map();
  const list = filterTransactionsByPeriod(period, txType);

  list.forEach((tx) => {
    const cat = tx.category || "Other";
    const amount = Number(tx.amount) || 0;
    map.set(cat, (map.get(cat) || 0) + amount);
  });

  const labels = Array.from(map.keys());
  const data   = Array.from(map.values());

  return { labels, data, total: data.reduce((a, b) => a + b, 0) };
}

function drawAdviceDonut(canvasId, labels, data, isIncome) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return null;
  const ctx = canvas.getContext("2d");

  const colors = labels.map((_, idx) => CATEGORY_COLORS[idx % CATEGORY_COLORS.length]);

  const chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.label || "";
              const value = ctx.parsed || 0;
              return `${label}: Rp${formatCurrency(value)}`;
            }
          }
        }
      }
    }
  });

  return { chart, colors };
}

function buildAdviceLegend(containerEl, labels, colors) {
  if (!containerEl) return;
  containerEl.innerHTML = labels.map((label, idx) => `
    <li>
      <span class="dot" style="background-color:${colors[idx]};"></span>
      ${label}
    </li>
  `).join("");
}

function refreshAdviceSection() {
  if (!transactions || transactions.length === 0) {
    // kalau tidak ada data, biarkan teks default
    return;
  }

  const period   = getCurrentPeriod();
  const prev     = getPreviousPeriod(period);

  const isMonth  = period.type === "month";
  const periodLabel = isMonth
    ? `${MONTH_NAMES[period.monthIndex]} ${period.year}`
    : String(period.year);

  if (adviceIncomePeriodEl)  adviceIncomePeriodEl.textContent  = periodLabel;
  if (adviceExpensePeriodEl) adviceExpensePeriodEl.textContent = periodLabel;

  // ============= INCOME =============
  const aggInc  = aggregateCategory(period, "income");
  const aggIncPrev = aggregateCategory(prev, "income");

  if (adviceIncomeTotalEl) {
    adviceIncomeTotalEl.textContent = "Rp" + formatCurrency(aggInc.total);
  }

  let incChangeText = "No previous income data for comparison.";
  let incArrowClass = "";
  let incArrowChar  = "▲";

  if (aggIncPrev.total > 0) {
    const diff = aggInc.total - aggIncPrev.total;
    const pct  = (diff / aggIncPrev.total) * 100;
    const pctStr = Math.abs(pct).toFixed(0) + "%";

    if (pct > 0) {
      incChangeText = `Your total income increased by ${pctStr} compared to previous period.`;
      incArrowClass = "up";
      incArrowChar  = "▲";
    } else if (pct < 0) {
      incChangeText = `Your total income decreased by ${pctStr} compared to previous period.`;
      incArrowClass = "down";
      incArrowChar  = "▼";
    } else {
      incChangeText = "Your total income is the same as previous period.";
      incArrowClass = "up";
      incArrowChar  = "▲";
    }
  }

  if (adviceIncomeArrowEl) {
    adviceIncomeArrowEl.textContent = incArrowChar;
    adviceIncomeArrowEl.classList.remove("up","down");
    if (incArrowClass) adviceIncomeArrowEl.classList.add(incArrowClass);
  }
  if (adviceIncomeTextEl) {
    adviceIncomeTextEl.textContent = incChangeText;
  }

  // render donut income
  if (adviceIncomeChart) adviceIncomeChart.destroy();
  const incomeResult = drawAdviceDonut("adviceIncomeChart", aggInc.labels, aggInc.data, true);
  if (incomeResult && adviceIncomeLegendEl) {
    buildAdviceLegend(adviceIncomeLegendEl, aggInc.labels, incomeResult.colors);
    adviceIncomeChart = incomeResult.chart;
  }

  // ============= EXPENSE =============
  const aggExp  = aggregateCategory(period, "expense");
  const aggExpPrev = aggregateCategory(prev, "expense");

  if (adviceExpenseTotalEl) {
    adviceExpenseTotalEl.textContent = "Rp" + formatCurrency(aggExp.total);
  }

  let expChangeText = "No previous spending data for comparison.";
  let expArrowClass = "";
  let expArrowChar  = "▲";

  if (aggExpPrev.total > 0) {
    const diff = aggExp.total - aggExpPrev.total;
    const pct  = (diff / aggExpPrev.total) * 100;
    const pctStr = Math.abs(pct).toFixed(0) + "%";

    if (pct > 0) {
      expChangeText = `Your total spending increased by ${pctStr} compared to previous period.`;
      expArrowClass = "down"; // naik = buruk, panah merah
      expArrowChar  = "▼";
    } else if (pct < 0) {
      expChangeText = `Your total spending decreased by ${pctStr} compared to previous period.`;
      expArrowClass = "up";
      expArrowChar  = "▲";
    } else {
      expChangeText = "Your total spending is the same as previous period.";
      expArrowClass = "down";
      expArrowChar  = "▼";
    }
  }

  if (adviceExpenseArrowEl) {
    adviceExpenseArrowEl.textContent = expArrowChar;
    adviceExpenseArrowEl.classList.remove("up","down");
    if (expArrowClass) adviceExpenseArrowEl.classList.add(expArrowClass);
  }
  if (adviceExpenseTextEl) {
    adviceExpenseTextEl.textContent = expChangeText;
  }

  // render donut expense
  if (adviceExpenseChart) adviceExpenseChart.destroy();
  const expenseResult = drawAdviceDonut("adviceExpenseChart", aggExp.labels, aggExp.data, false);
  if (expenseResult && adviceExpenseLegendEl) {
    buildAdviceLegend(adviceExpenseLegendEl, aggExp.labels, expenseResult.colors);
    adviceExpenseChart = expenseResult.chart;
  }
}

function drawFinancialChart(labels, incomeData, expenseData, title) {
  const canvas = document.getElementById("financialChart");
  if (!canvas || !window.Chart) return;

  const ctx = canvas.getContext("2d");

  if (financialChartInstance) {
    financialChartInstance.destroy();
  }

  financialChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          backgroundColor: "rgba(34, 197, 94, 0.8)",
          borderRadius: 4,
        },
        {
          label: "Expense",
          data: expenseData,
          backgroundColor: "rgba(239, 68, 68, 0.8)",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#e5e7eb" },
        },
        title: {
          display: true,
          text: title,
          color: "#e5e7eb",
        },
      },
      scales: {
        x: {
          ticks: { color: "#e5e7eb" },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: "#e5e7eb",
            callback: (value) => "Rp" + formatCurrency(value),
          },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
        },
      },
    },
  });
}

function initOrUpdateAnalyzeControls() {
  if (!viewMonthBtn || !viewYearBtn || !selectYear || !selectMonth) return;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const hasTx = transactions && transactions.length > 0;

  // --- TAHUN ---
  let years = hasTx ? getAvailableYears() : [currentYear];
  if (years.length === 0) years = [currentYear];

  const prevYear = Number(selectYear.value);
  const defaultYear = years.includes(prevYear)
    ? prevYear
    : years[years.length - 1];

  selectYear.innerHTML = years
    .map((y) => `<option value="${y}">${y}</option>`)
    .join("");
  selectYear.value = String(defaultYear);

  // --- BULAN ---
  let months;
  if (hasTx) {
    months = getAvailableMonthsForYear(defaultYear);
  } else {
    // kalau belum ada transaksi, tampilkan semua bulan supaya chart tetap full
    months = Array.from({ length: 12 }, (_, i) => i); // 0..11
  }
  if (months.length === 0) {
    months = Array.from({ length: 12 }, (_, i) => i);
  }

  const prevMonth = Number(selectMonth.value);
  let defaultMonth = months.includes(prevMonth)
    ? prevMonth
    : months.includes(currentMonth)
    ? currentMonth
    : months[0];

  selectMonth.innerHTML = months
    .map((m) => `<option value="${m}">${MONTH_NAMES[m]}</option>`)
    .join("");
  selectMonth.value = String(defaultMonth);

  // gambar / update chart
  refreshAnalyzeChart();
}

function refreshAnalyzeChart() {
  if (!selectYear) return;

  const year = Number(selectYear.value || new Date().getFullYear());
  const emptyEl = document.getElementById("chart-empty-state");
  const canvas = document.getElementById("financialChart");

  let labels, incomeData, expenseData, title;

  if (analyzeViewMode === "month") {
    const monthIndex = Number(selectMonth.value || new Date().getMonth());
    const data = buildDailyData(year, monthIndex);
    labels = data.labels;
    incomeData = data.incomeData;
    expenseData = data.expenseData;
    title = `Per Hari — ${MONTH_NAMES[monthIndex]} ${year}`;
  } else {
    const data = buildMonthlyData(year);
    labels = data.labels;
    incomeData = data.incomeData;
    expenseData = data.expenseData;
    title = `Per Bulan — ${year}`;
  }

  // === update tulisan Total Income / Expense di atas chart ===
  const totalIncome = incomeData.reduce((a, b) => a + b, 0);
  const totalExpense = expenseData.reduce((a, b) => a + b, 0);

  const summaryLabelEl = document.getElementById("analyze-summary-label");
  const summaryValueEl = document.getElementById("analyze-total-value");

  if (summaryLabelEl && summaryValueEl) {
    if (analyzeSeriesType === "expense") {
      summaryLabelEl.textContent = "Total Expense";
      summaryValueEl.textContent = "Rp" + formatCurrency(totalExpense);
    } else {
      summaryLabelEl.textContent = "Total Income";
      summaryValueEl.textContent = "Rp" + formatCurrency(totalIncome);
    }
  }

  // === cek apakah ada data untuk periode ini ===
  const hasIncome = incomeData.some((v) => v !== 0);
  const hasExpense = expenseData.some((v) => v !== 0);
  const hasData = hasIncome || hasExpense;

  if (!hasData) {
    // hancurkan chart lama kalau ada
    if (financialChartInstance) {
      financialChartInstance.destroy();
      financialChartInstance = null;
    }
    if (canvas) canvas.style.display = "none";
    if (emptyEl) {
      emptyEl.style.display = "flex";
      emptyEl.textContent = "No data yet for this period";
    }
  } else {
    if (canvas) canvas.style.display = "block";
    if (emptyEl) emptyEl.style.display = "none";
    drawFinancialChart(labels, incomeData, expenseData, title);
  }

  // Advice bagian bawah juga di-refresh (baik mode bulan maupun tahun)
  refreshAdviceSection();
}


// === EVENT LISTENER UNTUK ANALYZE PAGE ===
if (viewMonthBtn && viewYearBtn && selectYear && selectMonth) {
  viewMonthBtn.addEventListener("click", () => {
    analyzeViewMode = "month";
    viewMonthBtn.classList.add("active");
    viewYearBtn.classList.remove("active");
    labelMonth.style.display = "";
    selectMonth.style.display = "";
    refreshAnalyzeChart();
  });

  viewYearBtn.addEventListener("click", () => {
    analyzeViewMode = "year";
    viewYearBtn.classList.add("active");
    viewMonthBtn.classList.remove("active");
    labelMonth.style.display = "none";
    selectMonth.style.display = "none";
    refreshAnalyzeChart();
  });

  selectYear.addEventListener("change", () => {
    // kalau year berubah, update daftar bulan untuk mode 'month'
    if (analyzeViewMode === "month") {
      const year = Number(selectYear.value);
      const months = getAvailableMonthsForYear(year);
      selectMonth.innerHTML = months
        .map((m) => `<option value="${m}">${MONTH_NAMES[m]}</option>`)
        .join("");
    }
    refreshAnalyzeChart();
  });

  selectMonth.addEventListener("change", () => {
    if (analyzeViewMode === "month") {
      refreshAnalyzeChart();
    }
  });
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

    // Simpan dalam format mobile agar sinkron
    date: jsDate.getDate(), // Angka (misal: 21)
    month: jsDate.toLocaleDateString("en-US", { month: "long" }), // String (misal: "October")
    year: jsDate.getFullYear(), // Angka (misal: 2025)

    // Tambahkan userID, ini praktik yang baik
    userID: currentUserId,
  };
  // --- AKHIR KONVERSI DATA ---

  const collectionPath = `users/${currentUserId}/transactions`;

  try {
    btnSaveTx.disabled = true;
    btnSaveTx.textContent = "Menyimpan...";

    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");

    const token = await user.getIdToken();

    // Prepare Payload
    const payload = {
      ...txData,
      date: jsDate.toISOString(), // Send as String to server
      id: currentTxIdToEdit, // Undefined if adding, ID if editing
    };

    // Send to Server
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Server failed to save");

    console.log("Transaction saved via Server");

    // REFRESH DATA (Since we don't have realtime listener anymore)
    await fetchTransactions();

    closeTxPage();
  } catch (e) {
    console.error("Error saving transaction:", e);
    showAlert("Error", "Gagal menyimpan transaksi. " + e.message);
  } finally {
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

    const response = await fetch(`/api/transactions?id=${currentTxIdToEdit}`, {
      method: "DELETE",
      headers: { Authorization: token },
    });

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

// === EVENT LISTENERS UI ===
// ... (Event Listener Anda tidak perlu diubah) ...
function setupEventListeners() {
  // Halaman Home
  fabAddTx.addEventListener("click", () => openTxPage("add"));

  // Halaman Transaksi
  btnBackToHome.addEventListener("click", closeTxPage);
  btnTxTypeIncome.addEventListener("click", () => updateTxType("income"));
  btnTxTypeExpense.addEventListener("click", () => updateTxType("expense"));
  btnSaveTx.addEventListener("click", saveTransaction);
  btnDeleteTx.addEventListener("click", deleteTransaction);

  // Pembuka Modal
  txCategory.addEventListener("click", openCategoryModal);
  txPayment.addEventListener("click", openPaymentModal);
  btnOpenDatePicker.addEventListener("click", openDatePicker);
  btnOpenTimePicker.addEventListener("click", openTimePicker);

  // Penutup Modal
  btnCloseCategoryModal.addEventListener("click", closeCategoryModal);
  categoryModal.addEventListener("click", (e) => {
    if (e.target === categoryModal) closeCategoryModal();
  });
  btnClosePaymentModal.addEventListener("click", closePaymentModal);
  paymentModal.addEventListener("click", (e) => {
    if (e.target === paymentModal) closePaymentModal();
  });
  datepickerModal.addEventListener("click", (e) => {
    if (e.target === datepickerModal) closeDatePicker();
  });
  timepickerModal.addEventListener("click", (e) => {
    if (e.target === timepickerModal) closeTimePicker();
  });
  btnCloseAlert.addEventListener("click", () =>
    alertModal.classList.add("hidden")
  );

  // Kontrol Date Picker
  datepickerPrevMonth.addEventListener("click", () => {
    currentDatePickerDate.setMonth(currentDatePickerDate.getMonth() - 1);
    renderDatePicker();
  });
  datepickerNextMonth.addEventListener("click", () => {
    currentDatePickerDate.setMonth(currentDatePickerDate.getMonth() + 1);
    renderDatePicker();
  });

  // Kontrol Time Picker
  btnSetTime.addEventListener("click", setTimeFromPicker);
  timeAmpmAm.addEventListener("click", () => updateTimePickerAMPM("AM"));
  timeAmpmPm.addEventListener("click", () => updateTimePickerAMPM("PM"));

  const changeTime = (element, delta, min, max, wrap) => {
    let value = parseInt(element.textContent);
    value += delta;
    if (wrap) {
      if (value > max) value = min;
      if (value < min) value = max;
    } else {
      if (value > max) value = max;
      if (value < min) value = min;
    }
    element.textContent = String(value).padStart(2, "0");
  };

  timeHourUp.addEventListener("click", () =>
    changeTime(timeHourDisplay, 1, 1, 12, true)
  );
  timeHourDown.addEventListener("click", () =>
    changeTime(timeHourDisplay, -1, 1, 12, true)
  );
  timeMinuteUp.addEventListener("click", () =>
    changeTime(timeMinuteDisplay, 1, 0, 59, true)
  );
  timeMinuteDown.addEventListener("click", () =>
    changeTime(timeMinuteDisplay, -1, 0, 59, true)
  );
}

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
