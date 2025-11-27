import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"; // <- VERSI DIPERBAIKI

import { auth } from "./firebase.js";

// ✅ Password Validation
const isValidPassword = (pw) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);

// ================= SIGN UP =================
const signupBtn = document.getElementById("signupBtn");
if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();

    if (!isValidPassword(password)) {
      alert("Password minimal 8 karakter, harus ada huruf besar, kecil, dan angka.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Set foto profil default user.png
      await updateProfile(user, {
        photoURL: "assets/img/user.png",
        displayName: email.split("@")[0]
      });

      alert("Akun berhasil dibuat! Silakan login menggunakan akun Anda.");
      await signOut(auth); // Logout otomatis agar user login manual
      window.location.href = "index.html";
    } catch (e) {
      alert(e.message);
    }
  });
}

// ================= LOGIN =================
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Jika belum punya foto profil, beri default user.png
      if (!user.photoURL) {
        await updateProfile(user, {
          photoURL: "assets/img/user.png",
        });
      }

      // Simpan ke localStorage untuk main.html
      localStorage.setItem("userPhoto", user.photoURL || "assets/img/user.png");
      localStorage.setItem("userName", user.displayName || user.email.split("@")[0]);

      window.location.href = "main.html";
    } catch (e) {
      alert(e.message);
    }
  });
}

// ================= OAUTH LOGIN (Google, Facebook, GitHub, Apple) =================
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const githubProvider = new GithubAuthProvider();
const appleProvider = new OAuthProvider("apple.com");

function addOAuthListener(id, provider) {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener("click", async () => {
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Simpan info profil ke localStorage
        localStorage.setItem("userPhoto", user.photoURL || "assets/img/user.png");
        localStorage.setItem("userName", user.displayName || user.email.split("@")[0]);

        window.location.href = "main.html";
      } catch (e) {
        alert(e.message);
      }
    });
  }
}

// ================= GUEST MODE =================
const guestBtn = document.getElementById("asGuest");

if (guestBtn) {
  guestBtn.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent default anchor behavior

    // 1. Set a flag and fake user data in localStorage
    // This allows main.html to display "Guest" and a default image
    localStorage.setItem("isGuest", "true");
    localStorage.setItem("userName", "Guest");
    localStorage.setItem("userPhoto", "assets/img/user.png");

    // 2. Manually redirect to main.html
    window.location.href = "main.html";
  });
}
// Listener untuk semua provider
["googleBtn", "facebookBtn", "githubBtn", "appleBtn", "googleBtnSignup", "facebookBtnSignup", "githubBtnSignup", "appleBtnSignup"]
  .forEach((id) => {
    if (id.includes("google")) addOAuthListener(id, googleProvider);
    else if (id.includes("facebook")) addOAuthListener(id, facebookProvider);
    else if (id.includes("github")) addOAuthListener(id, githubProvider);
    else if (id.includes("apple")) addOAuthListener(id, appleProvider);
  });

// ================= FORGOT PASSWORD =================
let generatedCode = null;
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");

const sendCodeBtn = document.getElementById("sendCodeBtn");
const resetPasswordBtn = document.getElementById("resetPasswordBtn");
const emailInput = document.getElementById("recoveryEmail");
const newPasswordInput = document.getElementById("newPassword");

if (sendCodeBtn) {
  sendCodeBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email) return alert("Masukkan email terlebih dahulu.");

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Kode verifikasi dikirim ke email Anda! (cek folder spam juga)");

      generatedCode = "123456"; // Simulasi OTP
      step1.style.display = "none";
      step2.style.display = "block";

      const codeInputs = document.querySelectorAll(".code-box");
      codeInputs[0].focus();

      codeInputs.forEach((box, index) => {
        box.addEventListener("input", () => {
          if (box.value.length === 1 && index < 5) codeInputs[index + 1].focus();
          checkCodeFilled();
        });

        box.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" && index > 0 && box.value === "") {
            codeInputs[index - 1].focus();
          }
        });
      });
    } catch (error) {
      alert(error.message);
    }
  });
}

function checkCodeFilled() {
  const codeInputs = document.querySelectorAll(".code-box");
  let enteredCode = "";
  codeInputs.forEach((box) => (enteredCode += box.value));
  if (enteredCode.length === 6) {
    if (enteredCode === generatedCode) {
      alert("Kode verifikasi benar!");
      step2.style.display = "none";
      step3.style.display = "block";
    } else {
      alert("Kode salah. Periksa kembali email Anda.");
    }
  }
}

if (resetPasswordBtn) {
  resetPasswordBtn.addEventListener("click", () => {
    const newPass = newPasswordInput.value.trim();
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!regex.test(newPass)) {
      return alert("Password tidak memenuhi syarat keamanan!");
    }

    alert("Password berhasil diganti! Silakan login kembali.");
    window.location.href = "index.html";
  });
}

// ================= AUTO REDIRECT SAAT SUDAH LOGIN =================
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Periksa apakah kita *tidak* di main.html
    if (!window.location.pathname.endsWith('main.html')) {
        localStorage.setItem("userPhoto", user.photoURL || "assets/img/user.png");
        localStorage.setItem("userName", user.displayName || user.email.split("@")[0]);
        window.location.href = "main.html";
    }
  }
});

// import {
//   createUserWithEmailAndPassword,
//   signInWithEmailAndPassword,
//   signInWithPopup,
//   GoogleAuthProvider,
//   FacebookAuthProvider,
//   GithubAuthProvider,
//   OAuthProvider,
//   sendPasswordResetEmail,
//   updateProfile,
//   onAuthStateChanged,
//   signOut
// } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// import { auth } from "./firebase.js";

// // ✅ Password Validation
// const isValidPassword = (pw) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);

// // ================= SIGN UP =================
// const signupBtn = document.getElementById("signupBtn");
// if (signupBtn) {
//   signupBtn.addEventListener("click", async () => {
//     const email = document.getElementById("signupEmail").value.trim();
//     const password = document.getElementById("signupPassword").value.trim();

//     if (!isValidPassword(password)) {
//       alert("Password minimal 8 karakter, harus ada huruf besar, kecil, dan angka.");
//       return;
//     }

//     try {
//       const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//       const user = userCredential.user;

//       // ✅ Set foto profil default user.png
//       await updateProfile(user, {
//         photoURL: "assets/img/user.png",
//         displayName: email.split("@")[0]
//       });

//       alert("Akun berhasil dibuat! Silakan login menggunakan akun Anda.");
//       await signOut(auth); // Logout otomatis agar user login manual
//       window.location.href = "index.html";
//     } catch (e) {
//       alert(e.message);
//     }
//   });
// }

// // ================= LOGIN =================
// const loginBtn = document.getElementById("loginBtn");
// if (loginBtn) {
//   loginBtn.addEventListener("click", async () => {
//     const email = document.getElementById("loginEmail").value.trim();
//     const password = document.getElementById("loginPassword").value.trim();

//     try {
//       const userCredential = await signInWithEmailAndPassword(auth, email, password);
//       const user = userCredential.user;

//       // Jika belum punya foto profil, beri default user.png
//       if (!user.photoURL) {
//         await updateProfile(user, {
//           photoURL: "assets/img/user.png",
//         });
//       }

//       // Simpan ke localStorage untuk main.html
//       localStorage.setItem("userPhoto", user.photoURL || "assets/img/user.png");
//       localStorage.setItem("userName", user.displayName || user.email.split("@")[0]);

//       window.location.href = "main.html";
//     } catch (e) {
//       alert(e.message);
//     }
//   });
// }

// // ================= OAUTH LOGIN (Google, Facebook, GitHub, Apple) =================
// const googleProvider = new GoogleAuthProvider();
// const facebookProvider = new FacebookAuthProvider();
// const githubProvider = new GithubAuthProvider();
// const appleProvider = new OAuthProvider("apple.com");

// function addOAuthListener(id, provider) {
//   const btn = document.getElementById(id);
//   if (btn) {
//     btn.addEventListener("click", async () => {
//       try {
//         const result = await signInWithPopup(auth, provider);
//         const user = result.user;

//         // Simpan info profil ke localStorage
//         localStorage.setItem("userPhoto", user.photoURL || "assets/img/user.png");
//         localStorage.setItem("userName", user.displayName || user.email.split("@")[0]);

//         window.location.href = "main.html";
//       } catch (e) {
//         alert(e.message);
//       }
//     });
//   }
// }

// // Listener untuk semua provider
// ["googleBtn", "facebookBtn", "githubBtn", "appleBtn", "googleBtnSignup", "facebookBtnSignup", "githubBtnSignup", "appleBtnSignup"]
//   .forEach((id) => {
//     if (id.includes("google")) addOAuthListener(id, googleProvider);
//     else if (id.includes("facebook")) addOAuthListener(id, facebookProvider);
//     else if (id.includes("github")) addOAuthListener(id, githubProvider);
//     else if (id.includes("apple")) addOAuthListener(id, appleProvider);
//   });

// // ================= FORGOT PASSWORD =================
// let generatedCode = null;
// const step1 = document.getElementById("step1");
// const step2 = document.getElementById("step2");
// const step3 = document.getElementById("step3");

// const sendCodeBtn = document.getElementById("sendCodeBtn");
// const resetPasswordBtn = document.getElementById("resetPasswordBtn");
// const emailInput = document.getElementById("recoveryEmail");
// const newPasswordInput = document.getElementById("newPassword");

// if (sendCodeBtn) {
//   sendCodeBtn.addEventListener("click", async () => {
//     const email = emailInput.value.trim();
//     if (!email) return alert("Masukkan email terlebih dahulu.");

//     try {
//       await sendPasswordResetEmail(auth, email);
//       alert("Kode verifikasi dikirim ke email Anda! (cek folder spam juga)");

//       generatedCode = "123456"; // Simulasi OTP
//       step1.style.display = "none";
//       step2.style.display = "block";

//       const codeInputs = document.querySelectorAll(".code-box");
//       codeInputs[0].focus();

//       codeInputs.forEach((box, index) => {
//         box.addEventListener("input", () => {
//           if (box.value.length === 1 && index < 5) codeInputs[index + 1].focus();
//           checkCodeFilled();
//         });

//         box.addEventListener("keydown", (e) => {
//           if (e.key === "Backspace" && index > 0 && box.value === "") {
//             codeInputs[index - 1].focus();
//           }
//         });
//       });
//     } catch (error) {
//       alert(error.message);
//     }
//   });
// }

// function checkCodeFilled() {
//   const codeInputs = document.querySelectorAll(".code-box");
//   let enteredCode = "";
//   codeInputs.forEach((box) => (enteredCode += box.value));
//   if (enteredCode.length === 6) {
//     if (enteredCode === generatedCode) {
//       alert("Kode verifikasi benar!");
//       step2.style.display = "none";
//       step3.style.display = "block";
//     } else {
//       alert("Kode salah. Periksa kembali email Anda.");
//     }
//   }
// }

// if (resetPasswordBtn) {
//   resetPasswordBtn.addEventListener("click", () => {
//     const newPass = newPasswordInput.value.trim();
//     const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

//     if (!regex.test(newPass)) {
//       return alert("Password tidak memenuhi syarat keamanan!");
//     }

//     alert("Password berhasil diganti! Silakan login kembali.");
//     window.location.href = "index.html";
//   });
// }

// // ================= AUTO REDIRECT SAAT SUDAH LOGIN =================
// onAuthStateChanged(auth, (user) => {
//   if (user) {
//     localStorage.setItem("userPhoto", user.photoURL || "assets/img/user.png");
//     localStorage.setItem("userName", user.displayName || user.email.split("@")[0]);
//     window.location.href = "main.html";
//   }
// });
