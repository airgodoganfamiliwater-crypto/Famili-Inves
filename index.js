/* ================= INIT ================= */
firebase.initializeApp({
  apiKey:"AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
  authDomain:"klien-39696.firebaseapp.com",
  projectId:"klien-39696"
});

const auth = firebase.auth();
const db = firebase.firestore();

/* ================= UTIL ================= */
function rupiah(n){
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function persen(val){
  return Number(val).toFixed(2).replace(".", ",") + "%";
}

/* ================= GREETING ================= */
function getGreeting(){
  const h = new Date().getHours();

  if(h >= 4 && h < 11) return "Pagi";
  if(h >= 11 && h < 15) return "Siang";
  if(h >= 15 && h < 18) return "Sore";
  return "Malam";
}

/* ================= DATE ================= */
function getTanggal(){
  const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const bulan = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ];

  const now = new Date();

  return `${hari[now.getDay()]}, ${now.getDate()} ${bulan[now.getMonth()]} ${now.getFullYear()}`;
}

/* ================= LOAD ================= */
auth.onAuthStateChanged(async user=>{
  if(!user) return location.href = "login.html";

  const doc = await db.collection("investor").doc(user.uid).get();
  const d = doc.data() || {};

  const nama = d.nama || "User";

  // ===== GREETING =====
  document.getElementById("greeting").innerText =
    `Selamat ${getGreeting()}, ${nama}`;

  document.getElementById("todayDate").innerText =
    getTanggal();

  // ===== SUMMARY (🔥 sesuai request kamu) =====
  const investasi = d.portofolio || 0;
  // ===== 🔥 AMBIL RETURN DARI SUBCOLLECTION ROI =====
  let totalReturn = 0;
  
  try {
    const roiSnap = await db
      .collection("investor")
      .doc(user.uid)
      .collection("ROI")
      .get();
  
    roiSnap.forEach(doc => {
      const data = doc.data();
  
      // 🔥 pastikan uid sesuai (kalau field uid ada)
      if (!data.uid || data.uid === user.uid) {
        totalReturn += Number(data.return || 0);
      }
    });
  
  } catch (err) {
    console.error("❌ Gagal ambil ROI:", err);
  }

  // 🔥 FIX: 406 → 40.60%
  const asset = (d.asset || 0) / 10;

  animateValue(
    document.getElementById("sumInvestasi"),
    0,
    investasi,
    1200,
    true
  );
  
  animateValue(
    document.getElementById("sumReturn"),
    0,
    totalReturn,
    1200,
    true
  );
  
  animateValue(
    document.getElementById("sumAsset"),
    0,
    asset,
    1200,
    false,
    true
  );

  // ===== LOAD =====
  loadChart();
  loadLastReport();
  loadMonthlySummary();
  loadNoted();
});
function animateValue(el, start, end, duration, isRupiah=false, isPercent=false){
  let startTime = null;

  function format(val){
    if(isRupiah){
      return "Rp " + Math.floor(val).toLocaleString("id-ID");
    }
    if(isPercent){
      return val.toFixed(2).replace(".", ",") + "%";
    }
    return Math.floor(val);
  }

  function animation(currentTime){
    if(!startTime) startTime = currentTime;

    const progress = Math.min((currentTime - startTime) / duration, 1);
    const value = start + (end - start) * progress;

    el.innerText = format(value);

    if(progress < 1){
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}
/* ================= LOAD CHART ================= */
async function loadChart(){

  const now = new Date();

  const tahun = now.getFullYear();
  const bulan = String(now.getMonth() + 1).padStart(2, "0");

  const start = `${tahun}-${bulan}-01`;
  const end   = `${tahun}-${bulan}-31`;

  const snap = await db.collection("inputAdmin")
    .where("tanggal", ">=", start)
    .where("tanggal", "<=", end)
    .get();

  let dataMap = {};

  snap.forEach(doc=>{
    const d = doc.data();

    const tgl = d.tanggal;
    const val = d.klien || 0;

    if(!tgl) return;

    if(!dataMap[tgl]){
      dataMap[tgl] = 0;
    }

    dataMap[tgl] += val;
  });

  const sortedKeys = Object.keys(dataMap).sort();

  const labels = sortedKeys.map(t => t.split("-")[2]);
  const values = sortedKeys.map(t => dataMap[t]);

  renderChart(labels, values);

  /* ===== INSIGHT ===== */
  let total = 0;
  let maxVal = 0;
  let maxDay = "-";

  sortedKeys.forEach(t=>{
    const val = dataMap[t];
    total += val;

    if(val > maxVal){
      maxVal = val;
      maxDay = t.split("-")[2];
    }
  });

  document.getElementById("totalKlien").innerText = total;
  document.getElementById("bestDay").innerText = "Tgl " + maxDay;
}

/* ================= RENDER CHART ================= */
function renderChart(labels, data){

  const canvas = document.getElementById("myChart");
  const ctx = canvas.getContext("2d");

  if(window.myChartInstance){
    window.myChartInstance.destroy();
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, "rgba(255, 99, 132, 0.4)");
  gradient.addColorStop(0.5, "rgba(255, 206, 86, 0.3)");
  gradient.addColorStop(1, "rgba(54, 162, 235, 0.2)");

  window.myChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        borderColor: "#ff6b6b",
        borderWidth: 3,
        tension: 0.6,
        fill: true,
        backgroundColor: gradient,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#ff6b6b",
        pointBorderWidth: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation:{
        duration:1400,
        easing:"easeOutElastic"
      },
      plugins:{
        legend:{ display:false },
        tooltip:{
          backgroundColor:"#fff",
          titleColor:"#0f172a",
          bodyColor:"#334155",
          borderColor:"#e2e8f0",
          borderWidth:1,
          padding:10,
          displayColors:false,
          callbacks:{
            label:(ctx)=> `✨ ${ctx.raw} klien`
          }
        }
      },
      scales:{
        x:{
          grid:{ display:false },
          ticks:{ color:"#64748b" }
        },
        y:{
          beginAtZero:true,
          grid:{ color:"rgba(0,0,0,0.05)" },
          ticks:{ color:"#64748b" }
        }
      }
    }
  });
}
/* ================= LAST REPORT ================= */
async function loadLastReport(){

  const snap = await db.collection("inputAdmin")
    .orderBy("tanggal", "desc")
    .limit(1)
    .get();

  if(snap.empty) return;

  const d = snap.docs[0].data();

  // format tanggal Indonesia
  function formatTanggal(tgl){
    const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    const bulan = [
      "Januari","Februari","Maret","April","Mei","Juni",
      "Juli","Agustus","September","Oktober","November","Desember"
    ];

    const date = new Date(tgl);
    return `${hari[date.getDay()]}, ${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
  }

  document.getElementById("reportDate").innerText =
    formatTanggal(d.tanggal);

  // isi data
  document.getElementById("rClosing").innerText =
    d.klien || 0;

  document.getElementById("rOmset").innerText =
    "Rp " + Number(d.pembayaranKlien || 0).toLocaleString("id-ID");

  document.getElementById("rPengeluaran").innerText =
    "Rp " + Number(d.totalPengeluaran || 0).toLocaleString("id-ID");

  document.getElementById("rMargin").innerText =
    "Rp " + Number(d.marginKlien || 0).toLocaleString("id-ID");
}

/* ================= MONTHLY SUMMARY ================= */
async function loadMonthlySummary(){

  const now = new Date();

  const tahun = now.getFullYear();
  const bulan = String(now.getMonth() + 1).padStart(2, "0");

  const start = `${tahun}-${bulan}-01`;
  const end   = `${tahun}-${bulan}-31`;

  const snap = await db.collection("inputAdmin")
    .where("tanggal", ">=", start)
    .where("tanggal", "<=", end)
    .get();

  let totalKlien = 0;
  let totalMargin = 0;

  snap.forEach(doc=>{
    const d = doc.data();

    totalKlien += d.klien || 0;
    totalMargin += d.marginKlien || 0;
  });

  // 🔥 tampilkan (boleh pake animasi juga kalau mau)
  document.getElementById("mKlien").innerText =
    totalKlien;

  document.getElementById("mMargin").innerText =
    "Rp " + totalMargin.toLocaleString("id-ID");
}
/* ================= LOAD NOTED ================= */
async function loadNoted(){

  const snap = await db.collection("notifikasi")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if(snap.empty) return;

  const d = snap.docs[0].data();

  // ===== FORMAT TANGGAL =====
  function formatTanggal(dateVal){
    const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    const bulan = [
      "Januari","Februari","Maret","April","Mei","Juni",
      "Juli","Agustus","September","Oktober","November","Desember"
    ];

    let date;

    // 🔥 handle kalau timestamp firebase
    if(dateVal?.toDate){
      date = dateVal.toDate();
    }else{
      date = new Date(dateVal);
    }

    return `${hari[date.getDay()]}, ${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
  }

  document.getElementById("notedDate").innerText =
    formatTanggal(d.createdAt);

  // ===== FOTO =====
  const imgEl = document.getElementById("notedImage");

  if(d.foto){
    imgEl.innerHTML = `<img src="${d.foto}">`;
  }else{
    imgEl.style.display = "none";
  }

  // ===== ISI (AUTO ENTER) =====
  document.getElementById("notedContent").innerText =
    d.isi || "-";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(() => console.log("SW registered"))
      .catch(err => console.log("SW error", err));
  });
}