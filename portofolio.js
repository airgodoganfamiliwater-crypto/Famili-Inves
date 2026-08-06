/* ================= PORTOFOLIO: STATE ================= */
let pfInitialized = false;
let pfCurrentTabIndex = 0;

/* ================= PORTOFOLIO: UTIL ================= */
function formatPercentPortofolio(val){
  if(!isFinite(val)) return "0,00%";
  if(val > 1000) val = 1000;
  return val.toFixed(2).replace(".", ",") + "%";
}

function formatBulanPortofolio(tanggal){
  const d = new Date(tanggal);
  return d.toLocaleDateString("id-ID",{month:"long"});
}

function animateNumberPortofolio(el, end, duration = 800){
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

/* ================= PORTOFOLIO: ENTRY (dipanggil router) ================= */
async function loadPortofolioData(){
  const user = window.currentUser;
  if(!user) return;

  if(!pfInitialized){
    initPortofolioTab();
    pfInitialized = true;
  }

  const uid = user.uid;

  const doc = await db.collection("investor").doc(uid).get();
  if(!doc.exists) return;

  const d = doc.data();

  loadPortofolioROI(uid);
  loadPortofolioStatement();

  const nama = d.nama || "User";
  const foto = d.fotoProfil || "";
  const portofolio = Number(d.portofolio) || 0;

  document.getElementById("pfNamaUser").innerText = nama;

  const jumlahInvestasi = Number(d.jumlahInvestasi) || 0;
  document.getElementById("pfDealNamaInvestor").innerText = nama;
  document.getElementById("pfDealNamaInvestor2").innerText = nama;
  document.getElementById("pfDealNamaInvestorSign").innerText = nama;
  document.getElementById("pfDealJumlahInvestasi").innerText = jumlahInvestasi.toLocaleString("id-ID");

  let totalReturn = 0;
  try{
    const roiSnap = await db.collection("investor").doc(uid).collection("ROI").get();
    roiSnap.forEach(doc=>{
      totalReturn += Number(doc.data().return) || 0;
    });
  }catch(err){
    console.warn("Gagal ambil ROI:", err);
  }

  let percent = 0;
  if(portofolio > 0){
    percent = (totalReturn / portofolio) * 100;
  }

  animateNumberPortofolio(document.getElementById("pfTotalInvestasi"), portofolio);
  animateNumberPortofolio(document.getElementById("pfTotalReturn"), totalReturn);

  const percentEl = document.getElementById("pfPercentReturn");
  percentEl.innerText = formatPercentPortofolio(percent);
  percentEl.classList.toggle("red", percent < 0);

  const avatar = document.getElementById("pfAvatar");
  if(foto){
    const img = new Image();
    img.src = foto;
    img.onload = ()=>{
      avatar.innerHTML = "";
      avatar.appendChild(img);
    };
    img.onerror = ()=>{
      avatar.innerText = nama.charAt(0).toUpperCase();
    };
  }else{
    avatar.innerText = nama.charAt(0).toUpperCase();
  }
}

/* ================= PORTOFOLIO: TAB ================= */
function initPortofolioTab(){
  const panes = document.querySelectorAll("#view-portofolio .pf-tab-pane");
  panes.forEach(p=> p.classList.remove("active"));
  panes[0].classList.add("active");

  pfCurrentTabIndex = 0;
  updatePortofolioTabUI();

  document.querySelectorAll("#view-portofolio .pf-tab-item").forEach(item=>{
    item.addEventListener("click", ()=> switchPortofolioTab(item.dataset.tab));
  });
}

function switchPortofolioTab(tab){
  const indexMap = { roi:0, statement:1, deal:2 };
  pfCurrentTabIndex = indexMap[tab];

  const panes = document.querySelectorAll("#view-portofolio .pf-tab-pane");
  panes.forEach(p=> p.classList.remove("active"));
  panes[pfCurrentTabIndex].classList.add("active");

  updatePortofolioTabUI();
}

function updatePortofolioTabUI(){
  const tabs = document.querySelectorAll("#view-portofolio .pf-tab-item");
  tabs.forEach(el=> el.classList.remove("active"));
  tabs[pfCurrentTabIndex].classList.add("active");

  const indicator = document.getElementById("pfTabIndicator");
  indicator.style.transform = `translateX(${pfCurrentTabIndex * 100}%)`;
}

/* ================= PORTOFOLIO: LOAD ROI ================= */
async function loadPortofolioROI(uid){
  const el = document.getElementById("pfRoiList");

  const snap = await db.collection("investor").doc(uid).collection("ROI").get();

  if(snap.empty){
    el.innerHTML = `<div style="text-align:center;color:#64748b">Belum ada data</div>`;
    return;
  }

  const map = {};
  let totalReturnUtama = 0;

  snap.forEach(doc=>{
    const id = doc.id;
    const data = doc.data();

    const bulan = formatBulanPortofolio(id);
    const ret = Number(data.return) || 0;
    const asset = Number(data.asset) || 0;

    totalReturnUtama += ret;

    if(!map[bulan]){
      map[bulan] = { totalReturn:0, totalAsset:0 };
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
    if(asset > 0) percent = (val / asset) * 100;

    html += `
      <div class="pf-roi-row">
        <span>${bulan}</span>
        <span>
          ${rupiah(val)}
          <small class="pf-roi-percent">${formatPercentPortofolio(percent)}</small>
        </span>
      </div>
    `;
  });

  html += `
    <div class="pf-roi-total">
      <span>Jumlah ROI</span>
      <span>${rupiah(totalReturnUtama)}</span>
    </div>
  `;

  el.innerHTML = html;
}

/* ================= PORTOFOLIO: LOAD STATEMENT ================= */
async function loadPortofolioStatement(){
  const el = document.getElementById("pfStatementList");

  const snap = await db.collection("statement").get();

  if(snap.empty){
    el.innerHTML = `<div style="text-align:center;color:#64748b">Belum ada data</div>`;
    return;
  }

  let dataArr = [];

  const bulanMap = {
    Januari:1, Februari:2, Maret:3, April:4,
    Mei:5, Juni:6, Juli:7, Agustus:8,
    September:9, Oktober:10, November:11, Desember:12
  };

  snap.forEach(doc=>{
    const d = doc.data();
    const periode = d.periode || {};
    const bulan = periode.bulan || "-";
    const tahun = parseInt(periode.tahun) || 0;
    const bulanNum = bulanMap[bulan] || 0;

    dataArr.push({ ...d, bulan, tahun, bulanNum });
  });

  dataArr.sort((a,b)=>{
    if(b.tahun !== a.tahun) return b.tahun - a.tahun;
    return b.bulanNum - a.bulanNum;
  });

  let html = "";

  dataArr.forEach(d=>{
    const bulan = d.bulan;
    const tahun = d.tahun;

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

    const penjualan = d.penjualan || 0;
    const omset = penjualan * 3800;

    const profit = omset - totalExpenses;

    html += `
      <div class="pf-statement-card">

        <div class="pf-statement-title">
          ${(bulan + " " + tahun).toUpperCase()}
        </div>

        <div class="pf-statement-section">
          <div class="pf-statement-section-title">INCOME</div>

          <div class="pf-statement-row">
            <span>Sales / Penjualan</span>
            <span>${rupiah(penjualan)}</span>
          </div>

          <div class="pf-statement-row">
            <span>Omset</span>
            <span>${rupiah(omset)}</span>
          </div>
        </div>

        <div class="pf-statement-divider"></div>

        <div class="pf-statement-section">
          <div class="pf-statement-section-title">EXPENSES</div>

          ${gas ? `<div class="pf-statement-row"><span>Gas</span><span>${rupiah(gas)}</span></div>` : ""}
          ${tutup ? `<div class="pf-statement-row"><span>Tutup</span><span>${rupiah(tutup)}</span></div>` : ""}
          ${lainnya ? `<div class="pf-statement-row"><span>Lainnya</span><span>${rupiah(lainnya)}</span></div>` : ""}
          ${gaji ? `<div class="pf-statement-row"><span>Gaji Koki</span><span>${rupiah(gaji)}</span></div>` : ""}
          ${spend ? `<div class="pf-statement-row"><span>${lain.keterangan || "Lain-lain"}</span><span>${rupiah(spend)}</span></div>` : ""}
          ${kas ? `<div class="pf-statement-row"><span>Kas</span><span>${rupiah(kas)}</span></div>` : ""}
          ${reinvestasi ? `<div class="pf-statement-row"><span>Reinvestasi</span><span>${rupiah(reinvestasi)}</span></div>` : ""}

          <div class="pf-statement-divider"></div>

          <div class="pf-statement-total">
            <span>Total Expenses</span>
            <span>${rupiah(totalExpenses)}</span>
          </div>
        </div>

        <div class="pf-statement-divider"></div>

        <div class="pf-statement-profit">
          <span>Profit / Loss</span>
          <span class="${profit >= 0 ? 'pf-profit-green' : 'pf-profit-red'}">
            ${rupiah(profit)}
          </span>
        </div>

      </div>
    `;
  });

  el.innerHTML = html;
}
