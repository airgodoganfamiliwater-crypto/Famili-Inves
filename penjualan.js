// ================= INIT =================
firebase.initializeApp({
  apiKey:"AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
  authDomain:"klien-39696.firebaseapp.com",
  projectId:"klien-39696"
});

const auth = firebase.auth();
const db = firebase.firestore();

let selectedMonth;
let selectedYear;

// ================= INIT =================
auth.onAuthStateChanged(user=>{
  if(!user) return location.href="login.html";

  const now = new Date();
  selectedMonth = now.getMonth();
  selectedYear = now.getFullYear();

  initTahun();
  loadData();
});

// ================= UTIL =================
function rupiah(n){
  return (Number(n)||0).toLocaleString("id-ID");
}

function formatTanggal(t){
  const d = new Date(t);
  return d.toLocaleDateString("id-ID",{day:"2-digit",month:"short"});
}

// 🔥 FORMAT UNTUK MATCH FIRESTORE (YYYY-MM-DD)
function formatTanggalKey(t){
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

// ================= LOAD DATA =================
async function loadData(){

  const snap = await db.collection("inputAdmin").get();

  let arr=[];

  snap.forEach(doc=>{
    const d = doc.data();

    if(!d.tanggal) return;

    const t = new Date(d.tanggal);

    if(t.getMonth() === selectedMonth && t.getFullYear() === selectedYear){
      arr.push(d);
    }
  });

  arr.sort((a,b)=> new Date(a.tanggal) - new Date(b.tanggal));

  const tbody = document.getElementById("tableBody");
  const totalBox = document.getElementById("totalBox");

  tbody.innerHTML="";

  let totalPenjualan=0;
  let totalPengeluaran=0;
  let totalMargin=0;

  arr.forEach((d,i)=>{

    const pengeluaran = d.pengeluaran?.totalPengeluaran || 0;
    const margin = (d.marginKlien || 0) - pengeluaran;

    totalPenjualan += d.klien || 0;
    totalPengeluaran += pengeluaran;
    totalMargin += margin;

    const id = "row_"+i;

    tbody.innerHTML += `
      <tr id="${id}">
        <td>${formatTanggal(d.tanggal)}</td>
        <td>${d.klien || 0}</td>
        <td>${rupiah(pengeluaran)}</td>
        <td>${margin < 0 ? '- ' : ''}${rupiah(Math.abs(margin))}</td>
      </tr>
    `;

    // 🔥 CLICK ROW
    setTimeout(()=>{
      const el = document.getElementById(id);
      if(el){
        el.onclick = ()=> openDetail(d.tanggal);
      }
    },0);
  });

  totalBox.innerHTML = `
    <div><span>Total Penjualan</span><b>${totalPenjualan}</b></div>
    <div><span>Total Pengeluaran</span><b>${rupiah(totalPengeluaran)}</b></div>
    <div><span>Total Margin</span><b>${totalMargin < 0 ? '- ' : ''}${rupiah(Math.abs(totalMargin))}</b></div>
  `;

  const bulanText = new Date(selectedYear,selectedMonth)
    .toLocaleString("id-ID",{month:"long",year:"numeric"});

  document.getElementById("textBulan").innerText = bulanText;
}

// ================= DETAIL =================
async function openDetail(tanggal){

  const popup = document.getElementById("popupDetail");
  const sheet = document.getElementById("popupDetailContent");
  const el = document.getElementById("detailContent");

  el.innerHTML = `<div style="text-align:center;padding:20px">Loading...</div>`;

  popup.classList.add("show");

  setTimeout(()=>{
    sheet.style.transform = "translateY(0)";
  },10);

  try{
    const key = formatTanggalKey(tanggal);

    const snap = await db.collection("pengeluaran")
      .where("tanggal","==",key)
      .limit(1)
      .get();

    if(snap.empty){
      el.innerHTML = `<div style="text-align:center;padding:20px">Data tidak ditemukan</div>`;
      return;
    }

    const p = snap.docs[0].data();

    // 🔥 AMAN SEMUA FIELD
    const gasQty = p.gas?.qty ?? 0;
    const gasCost = p.gas?.cost ?? 0;

    const tutupQty = p.tutup?.qty ?? 0;
    const tutupCost = p.tutup?.cost ?? 0;

    const lainKet = p.lainnya?.keterangan || "-";
    const lainCost = p.lainnya?.cost ?? 0;

    const listrik = p.listrik ?? 0;
    const total = p.totalPengeluaran ?? 0;

    el.innerHTML = `
      <div class="detail-date">${formatTanggal(tanggal)}</div>

      <div class="detail-row">
        <span>Gas</span>
        <span>${gasQty}</span>
        <span>${rupiah(gasCost)}</span>
      </div>

      <div class="detail-row">
        <span>Tutup</span>
        <span>${tutupQty}</span>
        <span>${rupiah(tutupCost)}</span>
      </div>

      <div class="detail-row">
        <span>Lainnya</span>
        <span>${lainKet}</span>
        <span>${rupiah(lainCost)}</span>
      </div>

      <div class="detail-row">
        <span>Listrik</span>
        <span></span>
        <span>${rupiah(listrik)}</span>
      </div>

      <div class="detail-row total">
        <span>Total</span>
        <span></span>
        <span>${rupiah(total)}</span>
      </div>
    `;

  }catch(err){
    console.error(err);
    el.innerHTML = `<div style="text-align:center;padding:20px">Error load data</div>`;
  }
}

function closeDetail(){
  const popup = document.getElementById("popupDetail");
  const sheet = document.getElementById("popupDetailContent");

  sheet.style.transform = "translateY(100%)";

  setTimeout(()=>{
    popup.classList.remove("show");
  },300);
}

// klik luar
document.getElementById("popupDetail").addEventListener("click", e=>{
  if(e.target.id === "popupDetail"){
    closeDetail();
  }
});

// ================= SWIPE DETAIL =================
const sheetDetail = document.getElementById("popupDetailContent");

let startY2 = 0;
let currentY2 = 0;
let isDragging2 = false;

sheetDetail.addEventListener("touchstart", e=>{
  startY2 = e.touches[0].clientY;
  isDragging2 = true;
  sheetDetail.style.transition = "none";
});

sheetDetail.addEventListener("touchmove", e=>{
  if(!isDragging2) return;

  currentY2 = e.touches[0].clientY;
  let diff = currentY2 - startY2;

  if(diff > 0){
    sheetDetail.style.transform = `translateY(${diff}px)`;
  }
});

sheetDetail.addEventListener("touchend", ()=>{
  isDragging2 = false;

  let diff = currentY2 - startY2;
  sheetDetail.style.transition = "transform .3s ease";

  if(diff > 120){
    closeDetail();
  }else{
    sheetDetail.style.transform = "translateY(0)";
  }
});

// ================= FILTER =================
function openFilter(){
  const popup = document.getElementById("popup");
  const sheet = document.getElementById("popupContent");

  popup.classList.add("show");

  setTimeout(()=>{
    sheet.style.transform = "translateY(0)";
  },10);
}

function applyFilter(){
  selectedMonth = Number(document.getElementById("bulanSelect").value);
  selectedYear = Number(document.getElementById("tahunSelect").value);

  closePopup();
  loadData();
}

function closePopup(){
  const popup = document.getElementById("popup");
  const sheet = document.getElementById("popupContent");

  sheet.style.transform = "translateY(100%)";

  setTimeout(()=>{
    popup.classList.remove("show");
  },300);
}

function initTahun(){
  const el = document.getElementById("tahunSelect");
  const now = new Date().getFullYear();

  for(let i=now;i>=2020;i--){
    const opt = document.createElement("option");
    opt.value=i;
    opt.textContent=i;
    el.appendChild(opt);
  }
}

// klik luar filter
document.getElementById("popup").addEventListener("click", e=>{
  if(e.target.id === "popup"){
    closePopup();
  }
});

// ================= SWIPE FILTER =================
const sheet = document.getElementById("popupContent");

let startY = 0;
let currentY = 0;
let isDragging = false;

sheet.addEventListener("touchstart", e=>{
  // 🔥 FIX FLICKER: jangan ganggu SELECT
  if(e.target.tagName === "SELECT") return;

  startY = e.touches[0].clientY;
  isDragging = true;
  sheet.style.transition = "none";
});

sheet.addEventListener("touchmove", e=>{
  if(!isDragging) return;

  currentY = e.touches[0].clientY;
  let diff = currentY - startY;

  if(diff > 0){
    sheet.style.transform = `translateY(${diff}px)`;
  }
});

sheet.addEventListener("touchend", ()=>{
  if(!isDragging) return;

  isDragging = false;

  let diff = currentY - startY;
  sheet.style.transition = "transform .3s ease";

  if(diff > 120){
    closePopup();
  }else{
    sheet.style.transform = "translateY(0)";
  }
});