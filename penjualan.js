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
    const margin = d.marginKlien || 0; // marginKlien di Firestore sudah margin bersih, jangan dikurangi pengeluaran lagi

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
    const snap = await db.collection("inputAdmin")
      .where("tanggal","==",tanggal)
      .limit(1)
      .get();

    if(snap.empty){
      el.innerHTML = `<div style="text-align:center;padding:20px">Data tidak ditemukan</div>`;
      return;
    }

    const d = snap.docs[0].data();
    const p = d.pengeluaran || {};

    const bensin = p.bensin ?? 0;
    const gas = p.gas ?? 0;
    const tutup = p.tutup ?? 0;
    const listrik = p.listrik ?? 0;
    const total = p.totalPengeluaran ?? 0;
    const lainnya = Array.isArray(p.lainnya) ? p.lainnya : [];

    let lainnyaHtml = "";
    lainnya.forEach(item=>{
      const ket = item?.keterangan || "Lainnya";
      const harga = item?.harga ?? 0;
      if(!harga) return;
      lainnyaHtml += `
        <div class="pj-detail-row">
          <span>${ket}</span>
          <span>${rupiah(harga)}</span>
        </div>
      `;
    });

    el.innerHTML = `
      <div class="pj-detail-date">${formatTanggalPenjualan(tanggal)}</div>

      ${gas ? `<div class="pj-detail-row"><span>Gas</span><span>${rupiah(gas)}</span></div>` : ""}
      ${tutup ? `<div class="pj-detail-row"><span>Tutup</span><span>${rupiah(tutup)}</span></div>` : ""}
      ${bensin ? `<div class="pj-detail-row"><span>Bensin</span><span>${rupiah(bensin)}</span></div>` : ""}
      ${listrik ? `<div class="pj-detail-row"><span>Listrik</span><span>${rupiah(listrik)}</span></div>` : ""}
      ${lainnyaHtml}

      <div class="pj-detail-row pj-total-row">
        <span>Total</span>
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

/* ================= PENJUALAN: FILTER POPUP (custom picker) ================= */
function openPenjualanFilter(){
  const popup = document.getElementById("pjPopupFilter");
  const sheet = document.getElementById("pjPopupFilterContent");

  // sinkronkan chip aktif sesuai bulan/tahun yang sedang dipakai
  document.querySelectorAll("#pjBulanList .pj-picker-item").forEach(item=>{
    item.classList.toggle("active", Number(item.dataset.value) === pjSelectedMonth);
  });
  document.querySelectorAll("#pjTahunList .pj-picker-item").forEach(item=>{
    item.classList.toggle("active", Number(item.dataset.value) === pjSelectedYear);
  });

  popup.classList.add("show");
  setTimeout(()=>{ sheet.style.transform = "translateY(0)"; }, 10);
}

function applyPenjualanFilter(){
  const bulanActive = document.querySelector("#pjBulanList .pj-picker-item.active");
  const tahunActive = document.querySelector("#pjTahunList .pj-picker-item.active");

  if(bulanActive) pjSelectedMonth = Number(bulanActive.dataset.value);
  if(tahunActive) pjSelectedYear = Number(tahunActive.dataset.value);

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
  const el = document.getElementById("pjTahunList");
  const now = new Date().getFullYear();

  for(let i=now; i>=2020; i--){
    const item = document.createElement("div");
    item.className = "pj-picker-item";
    item.dataset.value = i;
    item.textContent = i;
    el.appendChild(item);
  }

  // klik chip bulan
  document.querySelectorAll("#pjBulanList .pj-picker-item").forEach(item=>{
    item.addEventListener("click", ()=>{
      document.querySelectorAll("#pjBulanList .pj-picker-item").forEach(i=> i.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // klik chip tahun
  document.querySelectorAll("#pjTahunList .pj-picker-item").forEach(item=>{
    item.addEventListener("click", ()=>{
      document.querySelectorAll("#pjTahunList .pj-picker-item").forEach(i=> i.classList.remove("active"));
      item.classList.add("active");
    });
  });
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
