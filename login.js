
firebase.initializeApp({
  apiKey:"AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
  authDomain:"klien-39696.firebaseapp.com",
  projectId:"klien-39696"
});

const auth = firebase.auth();
const db = firebase.firestore();

/* ================= LOGIN ================= */

async function login(){
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btnLogin");

  if(!email || !password){
    msg.textContent = "Isi email & password";
    return;
  }

  btn.disabled = true;
  btn.classList.add("btn-loading");
  btn.innerHTML = `<div class="spinner"></div> Loading`;
  btn.disabled = true;
  msg.textContent = "";

  try{

    const res = await auth.signInWithEmailAndPassword(email,password);
    const uid = res.user.uid;

    const doc = await db.collection("investor").doc(uid).get();

    if(!doc.exists){
      msg.textContent = "Akun bukan investor";
      await auth.signOut();

      btn.classList.remove("btn-loading");
      btn.innerText = "Masuk";
      btn.disabled = false;
      btn.disabled = false;
      return;
    }

    // 🔥 DELAY BIAR ANIMASI KELIATAN
    btn.classList.remove("btn-loading");
    btn.innerText = "Berhasil ✅";

    setTimeout(()=>{
      window.location.href = "index.html";
    }, 1200);

  }catch(e){
    msg.textContent = "Email atau password salah";

    btn.innerText = "Masuk";
    btn.disabled = false;
  }
}
