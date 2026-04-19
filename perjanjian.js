// ================= AUTH FIREBASE =================
firebase.initializeApp({
  apiKey:"AIzaSyCl13_a4x-BQnWNUjf9JOQX1DKc-HxLBys",
  authDomain:"klien-39696.firebaseapp.com",
  projectId:"klien-39696"
});

const auth = firebase.auth();
const db = firebase.firestore();

// ================= THEME =================
if(localStorage.getItem("theme")==="dark"){
  document.body.classList.add("dark");
}

// ================= LOAD USER =================
auth.onAuthStateChanged(async user=>{
  
  if(!user){
    location.href = "login.html";
    return;
  }

  const uid = user.uid;

  // 🔥 ambil data investor dari firestore
  const doc = await db.collection("investor").doc(uid).get();

  if(!doc.exists) return;

  const d = doc.data();

  // ================= INVESTOR 1 (FIXED) =================
  document.getElementById("namaInvestor").innerText = "Abdul Faqih";

  // ================= INVESTOR 2 (DARI FIRESTORE) =================
  const namaUser = d.nama || "User";

  document.getElementById("namaInvestor2").innerText = namaUser;
  document.getElementById("namaInvestorSign").innerText = namaUser;

  // ================= JUMLAH INVESTASI =================
  const investasi = d.jumlahInvestasi || 0;

  document.getElementById("jumlahInvestasi").innerText =
    Number(investasi).toLocaleString("id-ID");

});