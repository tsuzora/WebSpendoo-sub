import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Impor 'db' dan fungsi firestore
import { auth, db } from "./firebase.js";
import {
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  Timestamp, // Pastikan Timestamp diimpor
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// === VARIABEL GLOBAL & STATE ===
let currentUserId = null;
let transactions = [];
let currentTxIdToEdit = null; // null jika 'add', ID jika 'edit'
let currentTxType = "expense"; // 'income' or 'expense'
let currentTxDate = new Date();
let currentDatePickerDate = new Date(); // Untuk navigasi kalender
let unsubscribeFromFirestore = null; // Untuk menyimpan fungsi unsub

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
  setupFirestoreListener();

  // Setup event listener UI
  setupEventListeners();

  // Sembunyikan loader jika ada
  if (loader) loader.classList.add("hidden");
}

// === MODIFIKASI DIMULAI: Listener Realtime Firestore ===
function setupFirestoreListener() {
  if (!db || !currentUserId) return;

  if (unsubscribeFromFirestore) {
    unsubscribeFromFirestore();
  }

  const collectionPath = `users/${currentUserId}/transactions`;
  console.log("Listening to collection:", collectionPath);

  const q = query(collection(db, collectionPath));

  try {
    unsubscribeFromFirestore = onSnapshot(
      q,
      (snapshot) => {
        transactions = snapshot.docs.map((doc) => {
          const data = doc.data();
          let finalDate;

          // Cek jika format datanya adalah 'Timestamp' (dari web)
          if (data.date && typeof data.date.toDate === "function") {
            finalDate = data.date;
          }
          // Cek jika format datanya adalah 'mobile' (dari mobile)
          else if (data.year && data.month && data.date) {
            const monthIndex = monthNameToIndex(data.month);
            const jsDate = new Date(data.year, monthIndex, data.date);
            finalDate = Timestamp.fromDate(jsDate);
          }
          // Jika data tanggal rusak/tidak ada
          else {
            finalDate = Timestamp.fromDate(new Date()); // Default ke sekarang
          }

          return {
            id: doc.id,
            ...data,
            date: finalDate, // Pastikan 'date' adalah objek Timestamp
          };
        });

        // Urutkan berdasarkan Timestamp yang sudah kita normalisasi
        transactions.sort((a, b) => b.date.toDate() - a.date.toDate());

        renderTransactions();
        calculateBalance();
      },
      (error) => {
        console.error("Error listening to Firestore:", error);
        showAlert("Error", "Gagal mengambil data transaksi. " + error.message);
      }
    );
  } catch (e) {
    console.error("Error setup onSnapshot:", e);
    showAlert("Error", "Gagal setup listener data. " + e.message);
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

    if (currentTxIdToEdit) {
      // Mode Edit
      const docRef = doc(db, collectionPath, currentTxIdToEdit);
      await setDoc(docRef, txData, { merge: true });
      console.log("Transaksi diperbarui:", currentTxIdToEdit);
    } else {
      // Mode Add
      const docRef = await addDoc(collection(db, collectionPath), txData);
      console.log("Transaksi disimpan:", docRef.id);
    }

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
    await deleteDoc(docRef);
    console.log("Transaksi dihapus:", currentTxIdToEdit);
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
