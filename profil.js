async function loadProfilData(){
  const user = window.currentUser;
  if(!user) return;

  try{
    const doc = await db.collection("investor").doc(user.uid).get();
    if(!doc.exists) return;

    const data = doc.data();

    document.getElementById("profil-nama").textContent = data.nama || "Investor";
    document.getElementById("profil-email").textContent = data.email || user.email || "-";

    document.getElementById("profil-investasi").textContent = rupiah(data.jumlahInvestasi || 0);
    document.getElementById("profil-portofolio").textContent = rupiah(data.portofolio || 0);
    document.getElementById("profil-asset").textContent = ((data.asset || 0) / 10).toFixed(2).replace(".", ",") + "%";
    document.getElementById("profil-return").textContent = rupiah(data.return || 0);

    const rek = data.noRek || {};
    document.getElementById("profil-rekening").textContent =
      rek.bank ? `${rek.bank} - ${rek.nomor || "-"}` : "-";

    if(data.fotoProfil){
      document.getElementById("profil-avatar").src = data.fotoProfil;
    }

  }catch(e){
    console.error("Gagal load data profil:", e);
  }
}

document.getElementById("btnLogout").addEventListener("click", ()=>{
  document.getElementById("logoutConfirmModal").classList.add("show");
});

document.getElementById("logoutCancelBtn").addEventListener("click", ()=>{
  document.getElementById("logoutConfirmModal").classList.remove("show");
});

document.getElementById("logoutOkBtn").addEventListener("click", async ()=>{
  await auth.signOut();
  window.location.href = "login.html";
});
