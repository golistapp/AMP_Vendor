// api/firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyC5sOeB50QpurQaKYXe_rjaKE9Uy2J-w9E",
  authDomain: "amp-vendor.firebaseapp.com",
  // YAHAN URL UPDATE KIYA GAYA HAI 👇
  databaseURL: "https://amp-vendor-default-rtdb.asia-southeast1.firebasedatabase.app", 
  projectId: "amp-vendor",
  storageBucket: "amp-vendor.firebasestorage.app",
  messagingSenderId: "928890157783",
  appId: "1:928890157783:web:b282c14e8c8cf9ca120e92"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase App Initialized Successfully!");
} else {
    firebase.app(); 
}

const db = firebase.database(); 
const storage = firebase.storage();

console.log("🗄️ Realtime Database & Storage Ready!");
