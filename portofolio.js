// ================= INIT =================
firebase.initializeApp({
  apiKey:"AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
  authDomain:"klien-39696.firebaseapp.com",
  projectId:"klien-39696"
});

const auth = firebase.auth();
const db = firebase.firestore();

// ================= UTIL =================
function rupiah(n){
  return "Rp " + (Number(n)||0).toLocaleString("id-ID");
}

// 🔥 FORMAT PERSEN AMAN
function formatPercent(val){
  if(!isFinite(val)) return "0,00%";

  // 🔥 limit biar ga absurd (opsional tapi recommended)
  if(val > 1000) val = 1000;

  return val.toFixed(2).replace(".", ",") + "%";
}

// ================= ANIMATE NUMBER =================
function animateNumber(el, end, duration = 800){
  let start = 0;
  let startTime = null;

  function animate(currentTime){
    if(!startTime) startTime = currentTime;
    const progress = currentTime - startTime;

    const ease = 1 - Math.pow(1 - (progress / duration), 3);
    const value = Math.floor(ease * end);

    el.innerText = rupiah(value);

    if(progress < duration){
      requestAnimationFrame(animate);
    }else{
      el.innerText = rupiah(end);
    }
  }

  requestAnimationFrame(animate);
}
// default tab aktif
function initTab(){
  const panes = document.querySelectorAll(".tab-pane");

  panes.forEach(p => p.classList.remove("active"));
  panes[0].classList.add("active"); // ROI default

  currentIndex = 0;
  updateTabUI();
}
// ================= LOAD =================
auth.onAuthStateChanged(async user=>{
  if(!user) return location.href="login.html";

  const uid = user.uid;

  const doc = await db.collection("investor").doc(uid).get();
  if(!doc.exists) return;

  const d = doc.data();

  loadROI(uid);
  loadStatement();
  setTimeout(initTab, 50);

  // ================= USER DATA =================
  const nama = d.nama || "User";
  const foto = d.fotoProfil || "";
  const portofolio = Number(d.portofolio) || 0;

  // 🔥 SET NAMA USER (INI YANG KAMU LUPA)
  document.getElementById("namaUser").innerText = nama;

  // ================= TOTAL ROI =================
  let totalReturn = 0;

  try {
    const roiSnap = await db.collection("investor")
      .doc(uid)
      .collection("ROI")
      .get();

    roiSnap.forEach(doc => {
      const data = doc.data();
      totalReturn += Number(data.return) || 0;
    });

  } catch (err) {
    console.warn("⚠️ Gagal ambil ROI:", err);
  }

  // ================= PERSEN =================
  let percent = 0;

  if (portofolio > 0) {
    percent = (totalReturn / portofolio) * 100;
  }

  // ================= ANIMASI =================
  setTimeout(() => {
    animateNumber(
      document.getElementById("totalInvestasi"),
      portofolio
    );
  }, 100);

  setTimeout(() => {
    animateNumber(
      document.getElementById("totalReturn"),
      totalReturn
    );
  }, 250);

  // ================= PERCENT UI =================
  const percentEl = document.getElementById("percentReturn");
  percentEl.innerText = formatPercent(percent);

  if (percent < 0) {
    percentEl.classList.add("red");
  }

  // ================= AVATAR =================
  const avatar = document.getElementById("avatar");

  if (foto) {
    const img = new Image();
    img.src = foto;

    img.onload = () => {
      avatar.innerHTML = "";
      avatar.appendChild(img);
    };

    img.onerror = () => {
      avatar.innerText = nama.charAt(0).charAt(0).toUpperCase();
    };

  } else {
    avatar.innerText = nama.charAt(0).charAt(0).toUpperCase();
  }

});

let currentIndex = 0;

function switchTab(tab){

  const indexMap = {
    roi:0,
    statement:1,
    valuasi:2
  };

  currentIndex = indexMap[tab];

  // 🔥 tampilkan hanya tab aktif
  const panes = document.querySelectorAll(".tab-pane");
  panes.forEach(p => p.classList.remove("active"));
  panes[currentIndex].classList.add("active");

  // 🔥 update menu & indicator
  updateTabUI();

  // 🔥 reset scroll halaman
  window.scrollTo(0,0);
}

// ================= SYNC UI =================
function updateTabUI(){

  const tabs = document.querySelectorAll(".tab-item");

  tabs.forEach(el=> el.classList.remove("active"));
  tabs[currentIndex].classList.add("active");

  const indicator = document.getElementById("tabIndicator");
  indicator.style.transform = `translateX(${currentIndex * 100}%)`;
}

// ================= FORMAT BULAN =================
function formatBulan(tanggal){
  const d = new Date(tanggal);
  return d.toLocaleDateString("id-ID",{month:"long"});
}

// 🔥 FORMAT PERSEN
function formatPercent(val){
  if(!isFinite(val)) return "0,00%";
  return val.toFixed(2).replace(".", ",") + "%";
}

// ================= LOAD ROI =================
async function loadROI(uid){

  const el = document.getElementById("roiList");

  const snap = await db.collection("investor")
    .doc(uid)
    .collection("ROI")
    .get();

  if(snap.empty){
    el.innerHTML = `<div style="text-align:center;color:#64748b">Belum ada data</div>`;
    return;
  }

  const map = {};
  let totalReturnUtama = 0; // 🔥 TOTAL GLOBAL

  snap.forEach(doc=>{
    const id = doc.id;
    const data = doc.data();

    const bulan = formatBulan(id);

    const ret = Number(data.return) || 0;
    const asset = Number(data.asset) || 0;

    totalReturnUtama += ret; // 🔥 JUMLAH TOTAL ROI

    if(!map[bulan]){
      map[bulan] = {
        totalReturn:0,
        totalAsset:0
      };
    }

    map[bulan].totalReturn += ret;
    map[bulan].totalAsset += asset;
  });

  const bulanArr = Object.keys(map).reverse();

  let html = "";

  bulanArr.forEach(bulan=>{
    const data = map[bulan];

    const val = data.totalReturn;
    const asset = data.totalAsset;

    let percent = 0;
    if(asset > 0){
      percent = (val / asset) * 100;
    }

    html += `
      <div class="roi-row">
        <span>${bulan}</span>
        <span>
          ${rupiah(val)}
          <small class="roi-percent">
            ${formatPercent(percent)}
          </small>
        </span>
      </div>
    `;
  });

  // 🔥 TOTAL ROI FINAL
  html += `
    <div class="roi-total">
      <span>Jumlah ROI</span>
      <span>${rupiah(totalReturnUtama)}</span>
    </div>
  `;

  el.innerHTML = html;
}
async function loadStatement(){

  const el = document.getElementById("statementList");

  const snap = await db.collection("statement").get();

  if(snap.empty){
    el.innerHTML = `<div style="text-align:center;color:#64748b">Belum ada data</div>`;
    return;
  }

  let dataArr = [];

  snap.forEach(doc=>{
    const d = doc.data();

    const periode = d.periode || {};
    const bulan = periode.bulan || "-";
    const tahun = parseInt(periode.tahun) || 0;

    // 🔥 mapping bulan ke angka
    const bulanMap = {
      Januari:1, Februari:2, Maret:3, April:4,
      Mei:5, Juni:6, Juli:7, Agustus:8,
      September:9, Oktober:10, November:11, Desember:12
    };

    const bulanNum = bulanMap[bulan] || 0;

    dataArr.push({
      ...d,
      bulan,
      tahun,
      bulanNum
    });
  });

  // 🔥 SORT: tahun desc → bulan desc
  dataArr.sort((a,b)=>{
    if(b.tahun !== a.tahun) return b.tahun - a.tahun;
    return b.bulanNum - a.bulanNum;
  });

  let html = "";

  dataArr.forEach(d=>{

    const bulan = d.bulan;
    const tahun = d.tahun;

    // 🔥 STRUCTURE SESUAI FIRESTORE
    const exp = d.Expenditure || {};
    const lain = d.lain || {};

    const gas = exp.gas || 0;
    const tutup = exp.tutup || 0;
    const lainnya = exp.lainnya || 0;
    const spend = lain.spend || 0;

    const gaji = d.upahKoki || 0;
    const kas = d.kas || 0;
    const reinvestasi = d.reinvestasi || 0;

    const totalExpenses = gas + tutup + lainnya + spend + gaji + kas + reinvestasi;

    // 🔥 OMSET BARU (sesuai contoh kamu)
    const penjualan = d.penjualan || 0;
    const omset = penjualan * 3800;

    const profit = omset - totalExpenses;

    html += `
      <div class="statement-card">

        <div class="statement-title">
          ${(bulan + " " + tahun).toUpperCase()}
        </div>

        <!-- INCOME -->
        <div class="statement-section">
          <div class="statement-section-title">INCOME</div>

          <div class="statement-row">
            <span>Sales / Penjualan</span>
            <span>${rupiah(penjualan)}</span>
          </div>

          <div class="statement-row">
            <span>Omset</span>
            <span>${rupiah(omset)}</span>
          </div>
        </div>

        <div class="statement-divider"></div>

        <!-- EXPENSE -->
        <div class="statement-section">
          <div class="statement-section-title">EXPENSES</div>

          ${gas ? `<div class="statement-row"><span>Gas</span><span>${rupiah(gas)}</span></div>` : ""}
          ${tutup ? `<div class="statement-row"><span>Tutup</span><span>${rupiah(tutup)}</span></div>` : ""}
          ${lainnya ? `<div class="statement-row"><span>Lainnya</span><span>${rupiah(lainnya)}</span></div>` : ""}
          ${gaji ? `<div class="statement-row"><span>Gaji Koki</span><span>${rupiah(gaji)}</span></div>` : ""}
          ${spend ? `<div class="statement-row"><span>${lain.keterangan || "Lain-lain"}</span><span>${rupiah(spend)}</span></div>` : ""}
          ${kas ? `<div class="statement-row"><span>Kas</span><span>${rupiah(kas)}</span></div>` : ""}
          ${reinvestasi ? `<div class="statement-row"><span>Reinvestasi</span><span>${rupiah(reinvestasi)}</span></div>` : ""}

          <div class="statement-divider"></div>

          <div class="statement-total">
            <span>Total Expenses</span>
            <span>${rupiah(totalExpenses)}</span>
          </div>
        </div>

        <div class="statement-divider"></div>

        <!-- PROFIT -->
        <div class="statement-profit">
          <span>Profit / Loss</span>
          <span class="${profit >= 0 ? 'profit-green' : 'profit-red'}">
            ${rupiah(profit)}
          </span>
        </div>

      </div>
    `;
  });

  el.innerHTML = html;
}