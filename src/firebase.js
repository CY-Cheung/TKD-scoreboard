// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAWmDDr3A7r0Jg1bxh-XjHjAkM_RCdlHQk",
  authDomain: "tkd-react-app.firebaseapp.com",
  databaseURL: "https://tkd-react-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tkd-react-app",
  storageBucket: "tkd-react-app.firebasestorage.app",
  messagingSenderId: "131767355176",
  appId: "1:131767355176:web:4955187fe336e69f7bf21d",
  measurementId: "G-TNYHYGHZ8C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

export { database };