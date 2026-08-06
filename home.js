/* ================= UTIL ================= */
function rupiah(n){
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function getGreeting(){
  const h = new Date().getHours();
  if(h >= 4 && h < 11) return "Pagi";
  if(h >= 11 && h < 15) return "Siang";
  if(h >= 15 && h < 18) return "Sore";
  return "Malam";
}

function getTanggal(){
  const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const bulan = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ];
  const now = new Date();
  return `${hari[now.getDay()]}, ${now.getDate()} ${bulan[now.getMonth()]} ${now.getFullYear()}`;
}

function formatStatValue(val, isRupiah=false, isPercent=false){
  if(isRupiah) return "Rp " + Math.floor(val).toLocaleString("id-ID");
  if(isPercent) return val.toFixed(2).replace(".", ",") + "%";
  return Math.floor(val);
}

function animateValue(el, start, end, duration, isRupiah=false, isPercent=false){
  let startTime = null;

  function animation(currentTime){
    if(!startTime) startTime = currentTime;
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const value = start + (end - start) * progress;
    el.innerText = formatStatValue(value, isRupiah, isPercent);
    if(progress < 1) requestAnimationFrame(animation);
  }

  requestAnimationFrame(animation);
}

// hanya animasi 1x per sesi (cache di RAM), setelah itu langsung set angka final
function setStatValue(el, end, isRupiah=false, isPercent=false){
  if(window._homeStatsAnimated){
    el.innerText = formatStatValue(end, isRupiah, isPercent);
  }else{
    animateValue(el, 0, end, 1200, isRupiah, isPercent);
  }
}

/* ================= LOAD HOME ================= */
async function loadHomeData(){
  const user = window.currentUser;
  if(!user) return;

  const doc = await db.collection("investor").doc(user.uid).get();
  const d = doc.data() || {};

  const nama = d.nama || "User";

  document.getElementById("greeting").innerText =
    `Selamat ${getGreeting()}, ${nama}`;

  document.getElementById("todayDate").innerText = getTanggal();

  const investasi = d.portofolio || 0;

  let totalReturn = 0;
  try{
    const roiSnap = await db.collection("investor").doc(user.uid).collection("ROI").get();
    roiSnap.forEach(doc=>{
      const data = doc.data();
      if(!data.uid || data.uid === user.uid){
        totalReturn += Number(data.return || 0);
      }
    });
  }catch(err){
    console.error("Gagal ambil ROI:", err);
  }

  const asset = (d.asset || 0) / 10;

  setStatValue(document.getElementById("sumInvestasi"), investasi, true);
  setStatValue(document.getElementById("sumReturn"), totalReturn, true);
  setStatValue(document.getElementById("sumAsset"), asset, false, true);

  window._homeStatsAnimated = true;

  loadHomeChart();
  loadHomeLastReport();
  loadHomeMonthlySummary();
  loadHomeNoted();
}

/* ================= CHART ================= */
async function loadHomeChart(){
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
    if(!dataMap[tgl]) dataMap[tgl] = 0;
    dataMap[tgl] += val;
  });

  const sortedKeys = Object.keys(dataMap).sort();
  const labels = sortedKeys.map(t => t.split("-")[2]);
  const values = sortedKeys.map(t => dataMap[t]);

  renderHomeChart(labels, values);
}

function renderHomeChart(labels, data){
  const canvas = document.getElementById("myChart");
  if(!canvas) return;
  const ctx = canvas.getContext("2d");

  if(window.homeChartInstance) window.homeChartInstance.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, "rgba(37,99,235,0.4)");
  gradient.addColorStop(1, "rgba(37,99,235,0.05)");

  window.homeChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        borderColor: "#2563eb",
        borderWidth: 3,
        tension: 0.5,
        fill: true,
        backgroundColor: gradient,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#2563eb",
        pointBorderWidth: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#fff",
          titleColor: "#0f172a",
          bodyColor: "#334155",
          borderColor: "#e2e8f0",
          borderWidth: 1,
          padding: 10,
          displayColors: false
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#64748b" } },
        y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { color: "#64748b" } }
      }
    }
  });
}

/* ================= LAST REPORT ================= */
async function loadHomeLastReport(){
  const snap = await db.collection("inputAdmin")
    .orderBy("tanggal", "desc")
    .limit(1)
    .get();

  if(snap.empty) return;
  const d = snap.docs[0].data();

  function formatTanggal(tgl){
    const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    const bulan = [
      "Januari","Februari","Maret","April","Mei","Juni",
      "Juli","Agustus","September","Oktober","November","Desember"
    ];
    const date = new Date(tgl);
    return `${hari[date.getDay()]}, ${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
  }

  document.getElementById("reportDate").innerText = formatTanggal(d.tanggal);
  document.getElementById("rClosing").innerText = d.klien || 0;
  document.getElementById("rOmset").innerText = rupiah(d.pembayaranKlien || 0);
  document.getElementById("rPengeluaran").innerText = rupiah(d.totalPengeluaran || 0);
  document.getElementById("rMargin").innerText = rupiah(d.marginKlien || 0);
}

/* ================= MONTHLY SUMMARY ================= */
async function loadHomeMonthlySummary(){
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

  document.getElementById("mKlien").innerText = totalKlien;
  document.getElementById("mMargin").innerText = rupiah(totalMargin);
}

/* ================= NOTED ================= */
async function loadHomeNoted(){
  const snap = await db.collection("notifikasi")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if(snap.empty) return;
  const d = snap.docs[0].data();

  function formatTanggal(dateVal){
    const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    const bulan = [
      "Januari","Februari","Maret","April","Mei","Juni",
      "Juli","Agustus","September","Oktober","November","Desember"
    ];
    let date = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
    return `${hari[date.getDay()]}, ${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
  }

  document.getElementById("notedDate").innerText = formatTanggal(d.createdAt);

  const imgEl = document.getElementById("notedImage");
  if(d.foto){
    imgEl.innerHTML = `<img src="${d.foto}">`;
  }else{
    imgEl.style.display = "none";
  }

  document.getElementById("notedContent").innerText = d.isi || "-";
}
