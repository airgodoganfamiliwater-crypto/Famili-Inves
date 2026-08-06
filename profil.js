async function loadProfilData(){
  const user = window.currentUser;
  if(!user) return;

  try{
    const doc = await db.collection("investor").doc(user.uid).get();
    if(!doc.exists) return;

    const data = doc.data();

    document.getElementById("profil-nama").textContent = data.nama || "Investor";
    document.getElementById("profil-email").textContent = user.email || "-";
    document.getElementById("profil-telepon").textContent = data.telepon || "-";
    document.getElementById("profil-tanggal").textContent = data.bergabungSejak || "-";

  }catch(e){
    console.error("Gagal load data profil:", e);
  }
}

document.getElementById("btnLogout").addEventListener("click", async ()=>{
  await auth.signOut();
  window.location.href = "login.html";
});
