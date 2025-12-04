import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import { auth } from "./firebase.js";

// === VARIABEL GLOBAL & STATE ===
let currentUserId = null;
let transactions = [];
let currentTxIdToEdit = null;
let currentTxType = "expense";
let currentTxDate = new Date();
let currentDatePickerDate = new Date();
let unsubscribeFromFirestore = null;

// === VARIABEL GLOBAL CHART ===
let financialChartInstance = null;
let analyzeViewMode = 'monthly'; // 'monthly' or 'yearly'
let analyzeDate = new Date(); // Tanggal yang sedang dilihat di Analyze
let incomeChartInstance = null;
let expenseChartInstance = null;

// === DATA STATIS (KATEGORI, ICONS, ETC) ===
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
const ADVICE_MESSAGES = {
  Food: "You're spending a lot on food. Try cooking at home more often.",
  Transport: "Transport costs are high. Consider using public transport or carpooling.",
  Shopping: "Shopping expenses are up. Maybe wait for sales or discounts?",
  default_expense: "Your spending in this category has increased significantly.",
};
const CAT_COLORS = {
  Food: '#e67e22',
  Transport: '#3498db',
  Shopping: '#9b59b6',
  Bills: '#e74c3c',
  Salary: '#2ecc71',
  Business: '#f1c40f'
};

// === SELEKTOR DOM ===
const $ = document.querySelector.bind(document);
const loader = $("#loader");
// Home
const userNameDisplay = document.getElementById("userName");
const profilePic = document.getElementById("profilePic");
const logoutBtn = document.getElementById("logoutBtn");
const userGreetingName = $("#user-greeting-name");
// Halaman Transaksi
const pageTx = $("#page-tx");
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
// Modals
const categoryModal = $("#category-modal");
const categoryModalTitle = $("#category-modal-title");
const categoryGrid = $("#category-grid");
const btnCloseCategoryModal = $("#btn-close-category-modal");
const paymentModal = $("#payment-modal");
const paymentGrid = $("#payment-grid");
const btnClosePaymentModal = $("#btn-close-payment-modal");
const datepickerModal = $("#datepicker-modal");
const datepickerMonthYear = $("#datepicker-month-year");
const datepickerDaysGrid = $("#datepicker-days-grid");
const timepickerModal = $("#timepicker-modal");
const timeHourDisplay = $("#time-hour-display");
const timeMinuteDisplay = $("#time-minute-display");
const timeAmpmAm = $("#time-ampm-am");
const timeAmpmPm = $("#time-ampm-pm");
const btnSetTime = $("#btn-set-time");
const alertModal = $("#alert-modal");
const alertTitle = $("#alert-title");
const alertMessage = $("#alert-message");
const btnCloseAlert = $("#btn-close-alert");

// === FUNGSI UTAMA ===

function initApp(user) {
  currentUserId = user.uid;
  
  const displayName = user.displayName || user.email?.split("@")[0] || "User";
  if (userNameDisplay) userNameDisplay.textContent = displayName;
  if (userGreetingName) userGreetingName.textContent = displayName;

  if (user.photoURL) {
    if (profilePic) profilePic.src = user.photoURL;
  } else {
    if (profilePic) profilePic.src = "../assets/img/user.png";
  }

  fetchTransactions();
  if (loader) loader.classList.add("hidden");
}

const BASE_URL = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://spendoo-backend.vercel.app";

async function fetchTransactions() {
  if (!auth.currentUser) return;

  try {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(`${BASE_URL}/api/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch");

    const data = await response.json();

    transactions = data.map((tx) => {
      let dateObj = new Date();
      if (tx.date && tx.date._seconds) {
        dateObj = new Date(tx.date._seconds * 1000);
      } else if (tx.date) {
        dateObj = new Date(tx.date);
      }
      return { ...tx, date: dateObj }; 
    });

    // Sort descending
    transactions.sort((a, b) => b.date - a.date);

    renderHomeTable();
    renderHistoryTable();
    calculateBalance();
    
    // Refresh chart if we are on analyze page
    if (typeof updateChartData === "function") updateChartData();

  } catch (e) {
    console.error("Error fetching transactions:", e);
    showAlert("Error", "Gagal mengambil data: " + e.message);
  }
}

function renderHomeTable() {
  const container = document.getElementById("home-scroll-container");
  if (!container) return;

  container.innerHTML = "";
  const recentTransactions = transactions.slice(0, 10);

  if (recentTransactions.length === 0) {
    container.innerHTML = `<div style="padding:20px; text-align:center; color:#888;">No recent activity.</div>`;
    return;
  }

  recentTransactions.forEach((tx) => {
    let txDate = new Date(tx.date);
    const dateStr = formatDate(txDate, { month: "short", day: "numeric", year: "numeric" });
    const amountStr = formatCurrency(tx.amount);
    const catObj = CATEGORIES[tx.type]?.find((c) => c.name === tx.category);
    const icon = catObj ? catObj.icon : ICONS.OTHERS;

    const row = document.createElement("div");
    row.className = `list-row ${tx.type}`;
    row.setAttribute("role", "row");
    row.dataset.id = tx.id;

    row.innerHTML = `
      <div id="cell-name" role="gridcell">
         <div style="width:24px; height:24px; color: ${tx.type === "income" ? "#2ecc71" : "#e74c3c"}">${icon}</div>
         <span style="font-size:24px">${tx.category}</span>
      </div>
      <div id="cell-amount" role="gridcell" style="color: ${tx.type === "income" ? "#2ecc71" : "#e74c3c"}">
         ${tx.type === "expense" ? "-" : "+"} Rp${amountStr}
      </div>
      <div id="cell-date" role="gridcell">
         ${dateStr}
      </div>
    `;
    row.addEventListener("click", () => openTxPage("edit", tx.id));
    container.appendChild(row);
  });
}

function renderHistoryTable() {
  const scrollContainer = document.getElementById("scroll-container");
  if (!scrollContainer) return;
  scrollContainer.innerHTML = "";

  const historyData = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (historyData.length === 0) {
    scrollContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--sp-gray);">No transactions yet.</div>`;
    return;
  }

  historyData.forEach((tx) => {
    const txDate = new Date(tx.date);
    const dateString = formatDate(txDate, { day: "numeric", month: "short", year: "numeric" });
    const amountString = formatCurrency(tx.amount);
    const categoryObj = CATEGORIES[tx.type]?.find((c) => c.name === tx.category);
    const icon = categoryObj ? categoryObj.icon : ICONS.OTHERS;

    let editedHtml = "";
    if (tx.editedAt) {
      let editDate = new Date(tx.editedAt);
      editedHtml = `<small style="display:block; font-size:0.75rem; color:#f1c40f; margin-top:4px;">Edited: ${formatDate(editDate, {day: 'numeric', month: 'short'})}</small>`;
    }

    const row = document.createElement("div");
    row.className = "list-row";
    row.dataset.id = tx.id;
    row.innerHTML = `
      <div id="cell-name">
         <div style="width:32px; height:32px;">${icon}</div>
         <span>${tx.category} <small style="opacity:0.6; display:block; font-size:0.8em;">${tx.paymentMethod}</small></span>
      </div>
      <div id="cell-date">${dateString} ${editedHtml}</div>
      <div id="cell-amount" class="${tx.type === "income" ? "income" : "expense"}" style="font-weight:bold;">
         ${tx.type === "expense" ? "-" : "+"} Rp${amountString}
      </div>
    `;
    scrollContainer.appendChild(row);
  });
}

function calculateBalance() {
  const balanceAmount = document.getElementById("balance-amount");
  if (!balanceAmount) return;
  let totalIncome = 0;
  let totalExpense = 0;
  transactions.forEach((tx) => {
    if (tx.type === "income") totalIncome += tx.amount;
    else totalExpense += tx.amount;
  });
  balanceAmount.textContent = `Rp${formatCurrency(totalIncome - totalExpense)}`;
}

// === FUNGSI CHART & ANALYZE ===
function initChartPage() {
    renderChartControls();
    updateChartData();
}

function renderChartControls() {
    const label = document.getElementById('chart-period-label');
    const btnMonthly = document.getElementById('btn-view-monthly');
    const btnYearly = document.getElementById('btn-view-yearly');

    if (!label) return;

    if (analyzeViewMode === 'monthly') {
        label.textContent = formatDate(analyzeDate, { month: 'long', year: 'numeric' });
        btnMonthly.classList.add('active');
        btnYearly.classList.remove('active');
    } else {
        label.textContent = analyzeDate.getFullYear();
        btnYearly.classList.add('active');
        btnMonthly.classList.remove('active');
    }
}

function renderCanvasChart(labels, incomeData, expenseData) {
    const ctx = document.getElementById('financialChart');
    if (!ctx) return;

    if (financialChartInstance) financialChartInstance.destroy();

    try {
        financialChartInstance = new Chart(ctx, {
            type: 'bar', 
            data: {
                labels: labels,
                datasets: [
                    { label: 'Income', data: incomeData, backgroundColor: '#2ecc71', borderRadius: 4 },
                    { label: 'Expense', data: expenseData, backgroundColor: '#e74c3c', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#aebdb4' }, grid: { display: false } },
                    y: { ticks: { color: '#aebdb4' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                },
                plugins: { legend: { labels: { color: '#fff' } } }
            }
        });
    } catch (error) {
        console.error("Gagal menggambar chart:", error);
    }
}

function updateChartData() {
  const canvasContainer = document.getElementById("chart-canvas-container");
  const emptyStateContainer = document.getElementById("chart-empty-state");
  const emptyTitle = document.getElementById("empty-state-title");
  const emptyDesc = document.getElementById("empty-state-desc");
  const breakdownSection = document.getElementById("breakdown-section");
  const adviceSection = document.getElementById("advice-section");

  if (!canvasContainer || !emptyStateContainer) return;

  let labels = [];
  let incomeData = [];
  let expenseData = [];
  let totalDataCount = 0;

  if (analyzeViewMode === "monthly") {
    const year = analyzeDate.getFullYear();
    const month = analyzeDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    incomeData = new Array(daysInMonth).fill(0);
    expenseData = new Array(daysInMonth).fill(0);

    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === year && txDate.getMonth() === month) {
        const dayIndex = txDate.getDate() - 1;
        if (tx.type === "income") incomeData[dayIndex] += Number(tx.amount);
        else expenseData[dayIndex] += Number(tx.amount);
        totalDataCount++;
      }
    });
  } else {
    // Yearly View
    const year = analyzeDate.getFullYear();
    labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    incomeData = new Array(12).fill(0);
    expenseData = new Array(12).fill(0);
    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === year) {
        const monthIndex = txDate.getMonth();
        if (tx.type === "income") incomeData[monthIndex] += Number(tx.amount);
        else expenseData[monthIndex] += Number(tx.amount);
        totalDataCount++;
      }
    });
  }

  if (totalDataCount === 0) {
    canvasContainer.classList.add("hidden");
    if (breakdownSection) breakdownSection.classList.add("hidden");
    if (adviceSection) adviceSection.classList.add("hidden");
    emptyStateContainer.classList.remove("hidden");
    emptyStateContainer.style.display = "flex";
  } else {
    emptyStateContainer.classList.add("hidden");
    emptyStateContainer.style.display = "none";
    canvasContainer.classList.remove("hidden");
    canvasContainer.style.display = "block";
    
    renderCanvasChart(labels, incomeData, expenseData);
    updateBreakdownSection();
    
    const totalIncome = incomeData.reduce((a, b) => a + b, 0);
    const totalExpense = expenseData.reduce((a, b) => a + b, 0);
    updateAdviceSection(totalIncome, totalExpense);
  }
}

function updateBreakdownSection() {
    const breakdownSection = document.getElementById('breakdown-section');
    const periodNameEls = document.querySelectorAll('.period-name');
    breakdownSection.classList.remove('hidden');

    const currentPeriodName = analyzeViewMode === 'monthly' ? formatDate(analyzeDate, { month: 'long' }) : analyzeDate.getFullYear();
    periodNameEls.forEach(el => el.textContent = currentPeriodName);

    processBreakdownData('income');
    processBreakdownData('expense');
}

function processBreakdownData(type) {
    const currentData = getTransactionsByPeriod(analyzeDate, type);
    const totalCurrent = currentData.reduce((sum, t) => sum + t.amount, 0);

    let prevDate = new Date(analyzeDate);
    if (analyzeViewMode === 'monthly') prevDate.setMonth(prevDate.getMonth() - 1);
    else prevDate.setFullYear(prevDate.getFullYear() - 1);
    
    const prevData = getTransactionsByPeriod(prevDate, type);
    const totalPrev = prevData.reduce((sum, t) => sum + t.amount, 0);

    let percentage = 0;
    if (totalPrev > 0) percentage = ((totalCurrent - totalPrev) / totalPrev) * 100;
    else if (totalCurrent > 0) percentage = 100;

    const totalDisplay = document.getElementById(`${type}-total-display`);
    const compText = document.getElementById(`${type}-comparison`);
    
    totalDisplay.textContent = `Rp${formatCurrency(totalCurrent)}`;
    const formattedPercent = Math.abs(percentage).toFixed(0);
    const direction = percentage >= 0 ? 'increased' : 'decreased';
    const arrow = percentage >= 0 ? '▲' : '▼';
    const colorClass = percentage >= 0 ? 'up' : 'down';
    
    compText.className = `comparison-text ${colorClass}`;
    compText.innerHTML = `<span class="arrow">${arrow}</span> Total ${type} ${direction} by <b>${formattedPercent}%</b>.`;

    const categoryMap = {};
    currentData.forEach(tx => categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount);
    
    const labels = Object.keys(categoryMap);
    const dataValues = Object.values(categoryMap);
    const bgColors = labels.map(cat => CAT_COLORS[cat] || '#999');

    renderDonut(type, labels, dataValues, bgColors);
    renderCustomLegend(type, labels, bgColors);
}

function renderDonut(type, labels, data, colors) {
    const ctx = document.getElementById(`${type}DonutChart`);
    if (!ctx) return;
    
    if (type === 'income' && incomeChartInstance) { incomeChartInstance.destroy(); incomeChartInstance = null; }
    if (type === 'expense' && expenseChartInstance) { expenseChartInstance.destroy(); expenseChartInstance = null; }

    try {
        const newChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { display: false } }
            }
        });
        if (type === 'income') incomeChartInstance = newChart;
        else expenseChartInstance = newChart;
    } catch (e) { console.error(e); }
}

function renderCustomLegend(type, labels, colors) {
    const container = document.getElementById(`${type}-legend`);
    container.innerHTML = '';
    labels.forEach((label, index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<span class="legend-dot" style="background-color: ${colors[index]}"></span>${label}`;
        container.appendChild(item);
    });
}

function getTransactionsByPeriod(dateObj, type) {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    return transactions.filter(tx => {
        const txDate = new Date(tx.date);
        const matchType = tx.type === type;
        if (analyzeViewMode === 'monthly') return matchType && txDate.getFullYear() === year && txDate.getMonth() === month;
        return matchType && txDate.getFullYear() === year;
    });
}

function updateAdviceSection(totalIncome, totalExpense) {
    const adviceWrapper = document.getElementById('advice-section');
    const gradeCard = document.getElementById('grade-card');
    const gradeTitle = document.getElementById('grade-title');
    const gradeDesc = document.getElementById('grade-desc');
    const adviceGrid = document.getElementById('advice-grid');

    if (!adviceWrapper) return;
    adviceWrapper.classList.remove('hidden');

    let savingsRate = 0;
    if (totalIncome > 0) savingsRate = (totalIncome - totalExpense) / totalIncome;
    else if (totalExpense > 0) savingsRate = -1; 

    gradeCard.className = 'grade-card';
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

    adviceGrid.innerHTML = '';
    const currentCats = getCategorySums(analyzeDate);
    
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
        if (type === 'expense' && percentChange > 10 && amount > 50000) isBadTrend = true;
        else if (type === 'income' && percentChange < -5) isBadTrend = true;

        if (isBadTrend) {
            adviceCount++;
            let msg = ADVICE_MESSAGES[catName] || ADVICE_MESSAGES['default_expense'];
            const indicatorColor = type === 'expense' ? '#e74c3c' : '#f1c40f';
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
    if (adviceCount === 0) {
        adviceGrid.innerHTML = `<div style="text-align:center; padding:20px; color:#fff;">No negative trends! Keep it up! 🎉</div>`;
    }
}

function getCategorySums(dateObj) {
    const sums = {};
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    transactions.forEach(tx => {
        const txDate = new Date(tx.date);
        let match = false;
        if (analyzeViewMode === 'monthly') match = (txDate.getFullYear() === year && txDate.getMonth() === month);
        else match = (txDate.getFullYear() === year);
        if (match) {
            const key = `${tx.type}_${tx.category}`;
            sums[key] = (sums[key] || 0) + tx.amount;
        }
    });
    return sums;
}

function generateDummyData() {
    console.log("Generating dummy data...");
    transactions = []; 
    const categories = { income: ['Salary', 'Bonus'], expense: ['Food', 'Transport', 'Shopping'] };
    for (let i = 1; i <= 15; i++) {
        const isExpense = Math.random() > 0.3;
        const type = isExpense ? 'expense' : 'income';
        const catList = categories[type];
        const category = catList[Math.floor(Math.random() * catList.length)];
        let amount = type === 'income' ? 2000000 : 50000;
        const date = new Date(); // Use current date
        date.setDate(i); 
        transactions.push({ id: `dummy_${i}`, type, amount, category, paymentMethod: 'Cash', date: date });
    }
    analyzeDate = new Date();
    if (typeof initChartPage === 'function') initChartPage();
    if (typeof renderHomeTable === 'function') renderHomeTable();
    if (typeof calculateBalance === 'function') calculateBalance();
}

// === HELPER FUNCTIONS ===
function formatCurrency(value) { return new Intl.NumberFormat("id-ID").format(value); }
function formatDate(date, options) { return date.toLocaleDateString("id-ID", options); }
function formatTime(date) { return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }); }
function openTxPage(mode, txId = null) {
  currentTxIdToEdit = mode === "edit" ? txId : null;
  if (mode === "edit") {
    txPageTitle.textContent = "Edit Transaction";
    btnDeleteTx.classList.add("show");
    const tx = transactions.find((t) => t.id === txId);
    if (tx) {
      currentTxDate = new Date(tx.date);
      updateTxType(tx.type);
      txAmount.value = tx.amount;
      txCategory.value = tx.category;
      txPayment.value = tx.paymentMethod || "";
    }
  } else {
    txPageTitle.textContent = "Add Transaction";
    btnDeleteTx.classList.remove("show");
    currentTxDate = new Date();
    updateTxType("expense");
    txAmount.value = "";
    txCategory.value = "";
    txPayment.value = "";
  }
  updateDateTimeDisplay();
  pageTx.classList.add("show");
}
function closeTxPage() { pageTx.classList.remove("show"); currentTxIdToEdit = null; }
function updateTxType(type) {
  currentTxType = type;
  if (type === "income") { btnTxTypeIncome.classList.add("income-active"); btnTxTypeExpense.classList.remove("expense-active"); } 
  else { btnTxTypeExpense.classList.add("expense-active"); btnTxTypeIncome.classList.remove("income-active"); }
  paymentMethodContainer.style.display = "block";
  txCategory.value = ""; txPayment.value = "";
}
function updateDateTimeDisplay() {
  txDateDisplay.textContent = formatDate(currentTxDate, { year: "numeric", month: "long", day: "numeric" });
  txTimeDisplay.textContent = formatTime(currentTxDate);
}
async function saveTransaction() {
  const amount = parseFloat(txAmount.value);
  const category = txCategory.value;
  const paymentMethod = txPayment.value;
  const jsDate = currentTxDate;
  if (!amount || amount <= 0 || !category || !paymentMethod) { showAlert("Input Salah", "Lengkapi data."); return; }
  
  const txData = { type: currentTxType, amount, category, paymentMethod, date: jsDate.getDate(), month: jsDate.toLocaleDateString("en-US", { month: "long" }), year: jsDate.getFullYear(), userID: currentUserId || "guest" };
  
  btnSaveTx.disabled = true;
  try {
      const user = auth.currentUser;
      if (!user) {
          const guestTx = { id: currentTxIdToEdit || "guest_" + Date.now(), ...txData, date: jsDate };
          if (currentTxIdToEdit) { const idx = transactions.findIndex(t => t.id === currentTxIdToEdit); if(idx !== -1) transactions[idx] = guestTx; }
          else transactions.unshift(guestTx);
          renderHomeTable(); renderHistoryTable(); calculateBalance(); closeTxPage();
          if (typeof updateChartData === "function") updateChartData();
          return;
      }
      // Server Logic
      const token = await user.getIdToken();
      const payload = { ...txData, date: jsDate.toISOString(), id: currentTxIdToEdit };
      await fetch(`${BASE_URL}/api/transactions`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      await fetchTransactions();
      closeTxPage();
  } catch (e) { showAlert("Error", e.message); } 
  finally { btnSaveTx.disabled = false; }
}
async function deleteTransaction() {
  if (!currentTxIdToEdit) return;
  if (!confirm("Hapus transaksi?")) return;
  try {
    const user = auth.currentUser;
    if (!user) {
        transactions = transactions.filter(t => t.id !== currentTxIdToEdit);
        renderHomeTable(); renderHistoryTable(); calculateBalance(); closeTxPage();
        if (typeof updateChartData === "function") updateChartData();
        return;
    }
    const token = await user.getIdToken();
    await fetch(`${BASE_URL}/api/transactions/?id=${currentTxIdToEdit}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    await fetchTransactions();
    closeTxPage();
  } catch (e) { showAlert("Error", e.message); }
}

// === EVENT LISTENERS ===
document.body.addEventListener("click", (e) => {
  if (e.target.closest(".fab-add") || e.target.closest("#fab-add-tx")) openTxPage("add");
  if (e.target.closest("#btn-back-to-home") || e.target.closest(".tx-page-back-btn")) closeTxPage();
  if (e.target.closest("#btn-save-tx")) saveTransaction();
  if (e.target.closest("#btn-delete-tx")) deleteTransaction();
  if (e.target.closest("#btn-tx-type-income")) updateTxType("income");
  if (e.target.closest("#btn-tx-type-expense")) updateTxType("expense");
  if (e.target.closest("#tx-category")) { categoryModalTitle.textContent = currentTxType; categoryGrid.innerHTML = ""; CATEGORIES[currentTxType].forEach(cat => { const b = document.createElement("button"); b.className="grid-item"; b.innerHTML=`${cat.icon}<span>${cat.name}</span>`; b.onclick=()=>{txCategory.value=cat.name; categoryModal.classList.add("hidden");}; categoryGrid.appendChild(b); }); categoryModal.classList.remove("hidden"); }
  if (e.target.closest("#tx-payment")) { paymentGrid.innerHTML=""; PAYMENT_METHODS.forEach(m => { const b=document.createElement("button"); b.className="grid-item"; b.innerHTML=`${m.icon}<span>${m.name}</span>`; b.onclick=()=>{txPayment.value=m.name; paymentModal.classList.add("hidden");}; paymentGrid.appendChild(b); }); paymentModal.classList.remove("hidden"); }
  
  if (e.target.closest("#btn-close-category-modal") || e.target.id === "category-modal") categoryModal.classList.add("hidden");
  if (e.target.closest("#btn-close-payment-modal") || e.target.id === "payment-modal") paymentModal.classList.add("hidden");
  if (e.target.closest("#btn-close-alert")) alertModal.classList.add("hidden");

  // Chart Navigation
  if (e.target.id === 'btn-view-monthly') { analyzeViewMode = 'monthly'; analyzeDate = new Date(); initChartPage(); }
  if (e.target.id === 'btn-view-yearly') { analyzeViewMode = 'yearly'; analyzeDate = new Date(); initChartPage(); }
  if (e.target.closest('#btn-chart-prev')) { analyzeViewMode === 'monthly' ? analyzeDate.setMonth(analyzeDate.getMonth() - 1) : analyzeDate.setFullYear(analyzeDate.getFullYear() - 1); initChartPage(); }
  if (e.target.closest('#btn-chart-next')) { analyzeViewMode === 'monthly' ? analyzeDate.setMonth(analyzeDate.getMonth() + 1) : analyzeDate.setFullYear(analyzeDate.getFullYear() + 1); initChartPage(); }
});

const navLinks = document.querySelectorAll(".nav-links a");
navLinks.forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    navLinks.forEach((btn) => btn.classList.remove("active"));
    this.classList.add("active");
    const targetId = this.getAttribute("data-target");
    document.querySelectorAll(".page-section").forEach(sec => {
        sec.classList.remove("active");
        if (sec.id === `page-${targetId}`) sec.classList.add("active");
    });
    if (targetId === "analyze") setTimeout(initChartPage, 100);
  });
});

const container = document.getElementById("profileContainer");
if (container) {
    container.addEventListener("click", (e) => { e.stopPropagation(); container.classList.toggle("active"); });
    document.addEventListener("click", (e) => { if (!container.contains(e.target)) container.classList.remove("active"); });
}

onAuthStateChanged(auth, (user) => {
  const isGuest = localStorage.getItem("isGuest") === "true";
  if (user) {
    localStorage.removeItem("isGuest");
    initApp(user);
  } else if (isGuest) {
    if (userNameDisplay) userNameDisplay.textContent = "Guest";
    generateDummyData(); // Generate dummy for guest
  } else {
    if (!window.location.pathname.endsWith("index.html") && !window.location.pathname.endsWith("signup.html")) window.location.href = "index.html";
  }
});
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await signOut(auth);
    localStorage.clear();
    window.location.href = "index.html";
  });
}