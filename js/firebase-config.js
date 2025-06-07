import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCEwZ2s_201EP1aqbFfre5MMMZXmdZlP2o",
  authDomain: "sistema-estoque-granja.firebaseapp.com",
  projectId: "sistema-estoque-granja",
  storageBucket: "sistema-estoque-granja.appspot.com", // Corrigido para o domínio correto
  messagingSenderId: "969131011140",
  appId: "1:969131011140:web:c07b36791ebeaa221ce011"
};

// AQUI ESTÁ A CORREÇÃO: Adicionamos 'export' para que outros arquivos possam importar 'app'
export const app = initializeApp(firebaseConfig);

// A exportação de 'db' continua como estava
export const db = getFirestore(app);