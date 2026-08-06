/* ================= FIREBASE ================= */
firebase.initializeApp({
  apiKey:"AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
  authDomain:"klien-39696.firebaseapp.com",
  projectId:"klien-39696"
});

const auth = firebase.auth();
const db = firebase.firestore();

/* ================= ROUTER ================= */
const views = ["home","penjualan","portofolio","profil"];
window.currentView = "home";

function goToView(name, trigger="push"){
  if(!views.includes(name)) name = "home";

  const prevViewEl = document.querySelector(".view.active");

  views.forEach(v=>{
    document.getElementById("view-"+v).classList.remove("active","view-anim-push","view-anim-pop");
  });

  const nextViewEl = document.getElementById("view-"+name);
  nextViewEl.classList.add("active");

  if(prevViewEl){
    const animClass = trigger==="pop" ? "view-anim-pop" : "view-anim-push";
    nextViewEl.classList.add(animClass);
    nextViewEl.addEventListener("animationend", ()=>{
      nextViewEl.classList.remove(animClass);
    }, { once:true });
  }

  document.querySelectorAll(".nav-btn").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.view===name);
  });

  window.currentView = name;

  if(location.hash !== "#"+name){
    history.replaceState(null, "", "#"+name);
  }

  // kasih waktu 1 frame biar animasi zoom render duluan sebelum kerja berat (query + chart)
  requestAnimationFrame(()=>{
    if(name==="home" && typeof loadHomeData==="function") loadHomeData();
    if(name==="penjualan" && typeof loadPenjualanData==="function") loadPenjualanData();
    if(name==="portofolio" && typeof loadPortofolioData==="function") loadPortofolioData();
    if(name==="profil" && typeof loadProfilData==="function") loadProfilData();
  });
}

document.querySelectorAll(".nav-btn").forEach(btn=>{
  btn.addEventListener("click", ()=> goToView(btn.dataset.view, "push"));
});

/* ===== BACK ANDROID → selalu ke home, abaikan histori ===== */
history.pushState({ app:true }, "");
history.pushState({ app:true }, "");
history.pushState({ app:true }, "");
location.hash = "home";

let _backLocked = false;

function _handleBack(){
  if(_backLocked) return;
  _backLocked = true;

  if(window.currentView !== "home"){
    goToView("home", "pop");
  }

  // isi ulang history entry biar tombol back ngga pernah kehabisan "tabungan"
  history.pushState({ app:true }, "", "#"+window.currentView);

  setTimeout(()=>{ _backLocked = false; }, 300);
}

window.addEventListener("hashchange", ()=>{
  if(location.hash !== "#"+window.currentView){
    _handleBack();
  }
});

/* ================= CEK LOGIN ================= */
auth.onAuthStateChanged(user=>{
  if(!user){
    // belum login -> lempar balik ke halaman login
    window.location.href = "login.html";
    return;
  }
  // simpan referensi user biar bisa dipakai file view lain
  window.currentUser = user;

  if(typeof applyFotoProfilKeUI === "function") applyFotoProfilKeUI();

  goToView("home");
});
