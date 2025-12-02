// scripts/navigation.js

document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".page-section");
  const balanceCardSlot = document.getElementById("balance-card-slot");

  /**
   * Set halaman aktif berdasarkan key:
   *   "home", "history", "analyze", "faq"
   */
  function setActivePage(targetKey) {
    const targetSectionId = `page-${targetKey}`;

    // 1. Toggle class .active pada nav-link
    navLinks.forEach((link) => {
      if (link.dataset.target === targetKey) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // 2. Toggle class .active pada section page
    sections.forEach((sec) => sec.classList.remove("active"));
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
      targetSection.classList.add("active");
    }

    // 3. Tampilkan card Available Balance HANYA di Home
    if (balanceCardSlot) {
      if (targetKey === "home") {
        balanceCardSlot.style.display = "";       // pakai display default (flex / block)
      } else {
        balanceCardSlot.style.display = "none";   // sembunyikan di History / Analyze / FAQ
      }
    }
  }

  // Event click untuk semua nav-link
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetKey = link.dataset.target; // "home", "history", "analyze", "faq"
      if (!targetKey) return;
      setActivePage(targetKey);
    });
  });

  // Inisialisasi awal: cari section mana yang sudah punya .active
  let initialKey = "home";
  sections.forEach((sec) => {
    if (sec.classList.contains("active")) {
      const id = sec.id; // contoh: "page-home"
      if (id && id.startsWith("page-")) {
        initialKey = id.replace("page-", "");
      }
    }
  });

  // Apply state awal (termasuk show/hide balance-card-slot)
  setActivePage(initialKey);
});
