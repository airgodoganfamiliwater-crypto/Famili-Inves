/* ================= PENJUALAN: STATE ================= */
let pjSelectedMonth;
let pjSelectedYear;
let pjInitialized = false;

/* ================= PENJUALAN: UTIL ================= */
function formatTanggalPenjualan(t){
  const d = new Date(t);
  return d.toLocaleDateString("id-ID",{day:"2-digit",month:"short"});
}

function formatTanggalKeyPenjualan(t){
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

/* ================= PENJUALAN: ENTRY (dipanggil router) ================= */
function loadPenjualanData(){
  if(!pjInitialized){
    const now = new Date();
    pjSelectedMonth = now.getMonth();
    pjSelectedYear = now.getFullYear();
    initPenjualanTahun();
    pjInitialized = true;
  }
  loadPenjualanRows();
}

/* ================= PENJUALAN: LOAD ROWS ================= */
async function loadPenjualanRows(){
  const snap = await db.collection("inputAdmin").get();

  let arr = [];

  snap.forEach(doc=>{
    const d = doc.data();
    if(!d.tanggal) return;

    const t = new Date(d.tanggal);
    if(t.getMonth() === pjSelectedMonth && t.getFullYear() === pjSelectedYear){
      arr.push(d);
    }
  });

  arr.sort((a,b)=> new Date(a.tanggal) - new Date(b.tanggal));

  const tbody = document.getElementById("pjTableBody");
  const totalBox = document.getElementById("pjTotalBox");

  tbody.innerHTML = "";

  if(arr.length === 0){
    tbody.innerHTML = `<tr><td colspan="4" class="muted-text">Belum ada data.</td></tr>`;
  }

  let totalPenjualan = 0;
  let totalPengeluaran = 0;
  let totalMargin = 0;

  arr.forEach(d=>{
    const pengeluaran = d.pengeluaran?.totalPengeluaran || 0;
    const margin = (d.marginKlien || 0) - pengeluaran;

    totalPenjualan += d.klien || 0;
    totalPengeluaran += pengeluaran;
    totalMargin += margin;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatTanggalPenjualan(d.tanggal)}</td>
      <td>${d.klien || 0}</td>
      <td>${rupiah(pengeluaran)}</td>
      <td>${margin < 0 ? "- " : ""}${rupiah(Math.abs(margin))}</td>
    `;
    tr.onclick = ()=> openPenjualanDetail(d.tanggal);
    tbody.appendChild(tr);
  });

  totalBox.innerHTML = `
    <div><span>Total Penjualan</span><b>${totalPenjualan}</b></div>
    <div><span>Total Pengeluaran</span><b>${rupiah(totalPengeluaran)}</b></div>
    <div><span>Total Margin</span><b>${totalMargin < 0 ? "- " : ""}${rupiah(Math.abs(totalMargin))}</b></div>
  `;

  const bulanText = new Date(pjSelectedYear, pjSelectedMonth)
    .toLocaleString("id-ID",{month:"long",year:"numeric"});

  document.getElementById("pjTextBulan").innerText = bulanText;
}

/* ================= PENJUALAN: DETAIL POPUP ================= */
async function openPenjualanDetail(tanggal){
  const popup = document.getElementById("pjPopupDetail");
  const sheet = document.getElementById("pjPopupDetailContent");
  const el = document.getElementById("pjDetailContent");

  el.innerHTML = `<div style="text-align:center;padding:20px">Loading...</div>`;

  popup.classList.add("show");

  setTimeout(()=>{ sheet.style.transform = "translateY(0)"; }, 10);

  try{
    const key = formatTanggalKeyPenjualan(tanggal);

    const snap = await db.collection("pengeluaran")
      .where("tanggal","==",key)
      .limit(1)
      .get();

    if(snap.empty){
      el.innerHTML = `<div style="text-align:center;padding:20px">Data tidak ditemukan</div>`;
      return;
    }

    const p = snap.docs[0].data();

    const gasQty = p.gas?.qty ?? 0;
    const gasCost = p.gas?.cost ?? 0;

    const tutupQty = p.tutup?.qty ?? 0;
    const tutupCost = p.tutup?.cost ?? 0;

    const lainKet = p.lainnya?.keterangan || "-";
    const lainCost = p.lainnya?.cost ?? 0;

    const listrik = p.listrik ?? 0;
    const total = p.totalPengeluaran ?? 0;

    el.innerHTML = `
      <div class="pj-detail-date">${formatTanggalPenjualan(tanggal)}</div>

      <div class="pj-detail-row">
        <span>Gas</span>
        <span>${gasQty}</span>
        <span>${rupiah(gasCost)}</span>
      </div>

      <div class="pj-detail-row">
        <span>Tutup</span>
        <span>${tutupQty}</span>
        <span>${rupiah(tutupCost)}</span>
      </div>

      <div class="pj-detail-row">
        <span>Lainnya</span>
        <span>${lainKet}</span>
        <span>${rupiah(lainCost)}</span>
      </div>

      <div class="pj-detail-row">
        <span>Listrik</span>
        <span></span>
        <span>${rupiah(listrik)}</span>
      </div>

      <div class="pj-detail-row pj-total-row">
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

function closePenjualanDetail(){
  const popup = document.getElementById("pjPopupDetail");
  const sheet = document.getElementById("pjPopupDetailContent");

  sheet.style.transform = "translateY(100%)";

  setTimeout(()=>{ popup.classList.remove("show"); }, 300);
}

document.getElementById("pjPopupDetail").addEventListener("click", e=>{
  if(e.target.id === "pjPopupDetail") closePenjualanDetail();
});

/* ===== SWIPE DETAIL ===== */
const pjSheetDetail = document.getElementById("pjPopupDetailContent");

let pjStartY2 = 0;
let pjCurrentY2 = 0;
let pjDragging2 = false;

pjSheetDetail.addEventListener("touchstart", e=>{
  pjStartY2 = e.touches[0].clientY;
  pjDragging2 = true;
  pjSheetDetail.style.transition = "none";
});

pjSheetDetail.addEventListener("touchmove", e=>{
  if(!pjDragging2) return;
  pjCurrentY2 = e.touches[0].clientY;
  let diff = pjCurrentY2 - pjStartY2;
  if(diff > 0) pjSheetDetail.style.transform = `translateY(${diff}px)`;
});

pjSheetDetail.addEventListener("touchend", ()=>{
  pjDragging2 = false;
  let diff = pjCurrentY2 - pjStartY2;
  pjSheetDetail.style.transition = "transform .3s ease";

  if(diff > 120){
    closePenjualanDetail();
  }else{
    pjSheetDetail.style.transform = "translateY(0)";
  }
});

/* ================= PENJUALAN: FILTER POPUP ================= */
function openPenjualanFilter(){
  const popup = document.getElementById("pjPopupFilter");
  const sheet = document.getElementById("pjPopupFilterContent");

  popup.classList.add("show");
  setTimeout(()=>{ sheet.style.transform = "translateY(0)"; }, 10);
}

function applyPenjualanFilter(){
  pjSelectedMonth = Number(document.getElementById("pjBulanSelect").value);
  pjSelectedYear = Number(document.getElementById("pjTahunSelect").value);

  closePenjualanFilter();
  loadPenjualanRows();
}

function closePenjualanFilter(){
  const popup = document.getElementById("pjPopupFilter");
  const sheet = document.getElementById("pjPopupFilterContent");

  sheet.style.transform = "translateY(100%)";
  setTimeout(()=>{ popup.classList.remove("show"); }, 300);
}

function initPenjualanTahun(){
  const el = document.getElementById("pjTahunSelect");
  const now = new Date().getFullYear();

  for(let i=now; i>=2020; i--){
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    el.appendChild(opt);
  }
}

document.getElementById("pjBulanBtn").addEventListener("click", openPenjualanFilter);
document.getElementById("pjApplyFilterBtn").addEventListener("click", applyPenjualanFilter);

document.getElementById("pjPopupFilter").addEventListener("click", e=>{
  if(e.target.id === "pjPopupFilter") closePenjualanFilter();
});

/* ===== SWIPE FILTER ===== */
const pjSheetFilter = document.getElementById("pjPopupFilterContent");

let pjStartY = 0;
let pjCurrentY = 0;
let pjDragging = false;

pjSheetFilter.addEventListener("touchstart", e=>{
  if(e.target.tagName === "SELECT") return;
  pjStartY = e.touches[0].clientY;
  pjDragging = true;
  pjSheetFilter.style.transition = "none";
});

pjSheetFilter.addEventListener("touchmove", e=>{
  if(!pjDragging) return;
  pjCurrentY = e.touches[0].clientY;
  let diff = pjCurrentY - pjStartY;
  if(diff > 0) pjSheetFilter.style.transform = `translateY(${diff}px)`;
});

pjSheetFilter.addEventListener("touchend", ()=>{
  if(!pjDragging) return;
  pjDragging = false;
  let diff = pjCurrentY - pjStartY;
  pjSheetFilter.style.transition = "transform .3s ease";

  if(diff > 120){
    closePenjualanFilter();
  }else{
    pjSheetFilter.style.transform = "translateY(0)";
  }
});
