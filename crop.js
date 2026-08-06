/* ================= FOTO PROFIL: INDEXEDDB ================= */
const FOTO_DB_NAME = "fwAppDB";
const FOTO_STORE = "profileFoto";
const FOTO_KEY = "userFoto";

function openFotoDB(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(FOTO_DB_NAME, 1);
    req.onupgradeneeded = ()=>{
      req.result.createObjectStore(FOTO_STORE);
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

function saveFotoProfil(blob){
  return openFotoDB().then(db=> new Promise((resolve, reject)=>{
    const tx = db.transaction(FOTO_STORE, "readwrite");
    tx.objectStore(FOTO_STORE).put(blob, FOTO_KEY);
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  }));
}

function loadFotoProfil(){
  return openFotoDB().then(db=> new Promise((resolve, reject)=>{
    const tx = db.transaction(FOTO_STORE, "readonly");
    const req = tx.objectStore(FOTO_STORE).get(FOTO_KEY);
    req.onsuccess = ()=> resolve(req.result || null);
    req.onerror = ()=> reject(req.error);
  }));
}

// kalau IDB kosong -> biarin src default (logofw.png) yang udah ada di HTML
async function applyFotoProfilKeUI(){
  try{
    const blob = await loadFotoProfil();
    if(blob){
      const url = URL.createObjectURL(blob);
      document.querySelectorAll(".js-foto-profil").forEach(img=>{ img.src = url; });
    }
  }catch(e){
    console.warn("Gagal load foto profil dari IndexedDB:", e);
  }
}

/* ================= CROP: STATE ================= */
const CROP_SIZE = 320;

let cropImg = null;
let cropScale = 1;
let cropOffsetX = 0;
let cropOffsetY = 0;
let cropDragging = false;
let cropStartX = 0;
let cropStartY = 0;

const cropCanvas = document.getElementById("cropCanvas");
const cropCtx = cropCanvas.getContext("2d");

function drawCrop(){
  cropCtx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
  if(!cropImg) return;

  const baseScale = Math.max(CROP_SIZE / cropImg.width, CROP_SIZE / cropImg.height);
  const scale = baseScale * cropScale;

  const w = cropImg.width * scale;
  const h = cropImg.height * scale;

  const x = (CROP_SIZE - w) / 2 + cropOffsetX;
  const y = (CROP_SIZE - h) / 2 + cropOffsetY;

  cropCtx.drawImage(cropImg, x, y, w, h);
}

function loadImageToCrop(file){
  const img = new Image();
  const url = URL.createObjectURL(file);

  img.onload = ()=>{
    cropImg = img;
    cropScale = 1;
    cropOffsetX = 0;
    cropOffsetY = 0;
    document.getElementById("cropZoom").value = 1;
    drawCrop();
    document.getElementById("cropModal").classList.add("show");
  };

  img.src = url;
}

function closeCropModal(){
  document.getElementById("cropModal").classList.remove("show");
  cropImg = null;
}

/* ================= CROP: EVENTS ================= */
document.getElementById("btnEditFoto")?.addEventListener("click", ()=>{
  document.getElementById("fotoInput").click();
});

document.getElementById("fotoInput").addEventListener("change", e=>{
  const file = e.target.files[0];
  if(file) loadImageToCrop(file);
  e.target.value = "";
});

document.getElementById("cropZoom").addEventListener("input", e=>{
  cropScale = Number(e.target.value);
  drawCrop();
});

// drag geser posisi (mouse & touch, pakai pointer event)
cropCanvas.addEventListener("pointerdown", e=>{
  cropDragging = true;
  cropStartX = e.clientX - cropOffsetX;
  cropStartY = e.clientY - cropOffsetY;
});

window.addEventListener("pointermove", e=>{
  if(!cropDragging) return;
  cropOffsetX = e.clientX - cropStartX;
  cropOffsetY = e.clientY - cropStartY;
  drawCrop();
});

window.addEventListener("pointerup", ()=>{ cropDragging = false; });

document.getElementById("cropCancelBtn").addEventListener("click", closeCropModal);

document.getElementById("cropSaveBtn").addEventListener("click", ()=>{
  if(!cropImg) return;

  const outCanvas = document.createElement("canvas");
  outCanvas.width = 400;
  outCanvas.height = 400;
  outCanvas.getContext("2d").drawImage(cropCanvas, 0, 0, CROP_SIZE, CROP_SIZE, 0, 0, 400, 400);

  outCanvas.toBlob(async blob=>{
    if(!blob) return;
    await saveFotoProfil(blob);
    await applyFotoProfilKeUI();
    closeCropModal();
  }, "image/jpeg", 0.9);
});
