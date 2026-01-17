import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

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


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
