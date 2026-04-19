
/* ================= INIT ================= */
firebase.initializeApp({
  apiKey:"AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
  authDomain:"klien-39696.firebaseapp.com",
  projectId:"klien-39696"
});

const auth = firebase.auth();
const db = firebase.firestore();

let selectedBase64 = "";
let currentFoto = "";
let currentNama = "";

/* ================= UTIL ================= */
function rupiah(n){
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function persen(val){
  return Number(val).toFixed(2).replace(".", ",") + "%";
}

/* ================= LOAD ================= */
auth.onAuthStateChanged(async user=>{
  if(!user) return location.href="login.html";

  const doc = await db.collection("investor").doc(user.uid).get();
  const d = doc.data() || {};

  // 🔥 SET DATA DULU (biar ga undefined)
  currentNama = d.nama || "User";
  currentFoto = d.fotoProfil || "";

  // ===== DETAIL PROFIL =====
  const email = d.email || "-";
  const investasi = d.portofolio || 0;

  // 🔥 FIX: asset 406 → 0.406 → 40.60%
  const assetRaw = d.asset || 0;
  const assetPercent = assetRaw / 10; // 406 → 40.6

  const noRek = d.noRek?.nomor || "-";
  const bank = d.noRek?.bank || "";

  // 🔥 INJECT UI
  document.getElementById("namaUser").innerText = currentNama;

  document.getElementById("dNama").innerText = currentNama;
  document.getElementById("dEmail").innerText = email;
  document.getElementById("dInvestasi").innerText = rupiah(investasi);
  document.getElementById("dAsset").innerText = persen(assetPercent);
  document.getElementById("dRek").innerText = bank 
    ? bank + " • " + noRek 
    : noRek;

  renderAvatar(currentNama, currentFoto);
});

/* ================= AVATAR ================= */
function renderAvatar(nama, foto){
  const el = document.getElementById("avatar");

  if(foto){
    el.innerHTML = `<img src="${foto}">`;
  }else{
    el.innerText = nama.charAt(0).toUpperCase();
  }
}

/* ================= PREVIEW ================= */
function renderPreview(nama, foto){
  const el = document.getElementById("preview");

  if(foto){
    el.innerHTML = `<img src="${foto}">`;
  }else{
    el.innerHTML = `
      <div style="
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:40px;
        font-weight:700;
        color:#475569;
      ">
        ${nama.charAt(0).toUpperCase()}
      </div>
    `;
  }
}

/* ================= POPUP ================= */
const popup = document.getElementById("popup");

document.getElementById("openPopup").onclick = ()=>{
  popup.classList.add("active");
  renderPreview(currentNama, currentFoto);
};

popup.onclick = (e)=>{
  if(e.target === popup){
    popup.classList.remove("active");
  }
};

/* ================= PICK IMAGE ================= */
document.getElementById("btnPick").onclick = ()=>{
  document.getElementById("fileInput").click();
};

document.getElementById("fileInput").onchange = e=>{
  const file = e.target.files[0];
  if(!file) return;

  compressImage(file, 0.7, base64=>{
    selectedBase64 = base64;
    renderPreview(currentNama, base64);
  });
};

/* ================= COMPRESS ================= */
function compressImage(file, quality, cb){
  const reader = new FileReader();

  reader.onload = e=>{
    const img = new Image();
    img.src = e.target.result;

    img.onload = ()=>{
      const canvas = document.createElement("canvas");
      const size = 400;

      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);

      const base64 = canvas.toDataURL("image/jpeg", quality);
      cb(base64);
    };
  };

  reader.readAsDataURL(file);
}

/* ================= SAVE ================= */
document.getElementById("btnSave").onclick = async function(){

  if(!selectedBase64) return;

  const btn = this;
  btn.classList.add("loading");
  btn.innerText = "Menyimpan...";

  try{
    const user = auth.currentUser;

    await db.collection("investor")
      .doc(user.uid)
      .update({
        fotoProfil: selectedBase64
      });

    // 🔥 UPDATE STATE
    currentFoto = selectedBase64;

    // 🔥 UPDATE UI
    renderAvatar(currentNama, currentFoto);
    renderPreview(currentNama, currentFoto);

    btn.classList.remove("loading");
    btn.classList.add("success");
    btn.innerText = "Berhasil";

    setTimeout(()=>{
      popup.classList.remove("active");

      btn.classList.remove("success");
      btn.innerText = "Simpan";
      selectedBase64 = "";
    },2000);

  }catch(err){
    btn.classList.remove("loading");
    btn.classList.add("error");
    btn.innerText = "Gagal";

    setTimeout(()=>{
      btn.classList.remove("error");
      btn.innerText = "Simpan";
    },2000);
  }
};
  /* ================= LOGOUT ================= */
  document.getElementById("btnLogout").onclick = async function(){
  
    const btn = this;
  
    btn.classList.add("loading");
    btn.innerText = "Keluar...";
  
    try{
  
      // 🔥 logout firebase
      await auth.signOut();
  
      // 🔥 delay biar smooth (feel UI)
      setTimeout(()=>{
        location.href = "login.html";
      },1200);
  
    }catch(err){
  
      btn.classList.remove("loading");
      btn.innerText = "Logout";
  
      alert("Gagal logout");
    }
  };
