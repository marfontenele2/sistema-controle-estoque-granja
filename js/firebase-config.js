// Importa as funções necessárias do SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// SUAS CREDENCIAIS DO FIREBASE AQUI
// SUBSTITUA PELAS SUAS CREDENCIAIS REAIS DO SEU PROJETO NO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCEwZ2s_201EP1aqbFfre5MMMZXmdZlP2o", // Seu apiKey
  authDomain: "sistema-estoque-granja.firebaseapp.com", // Seu authDomain
  projectId: "sistema-estoque-granja", // Seu projectId
  storageBucket: "sistema-estoque-granja.appspot.com", // Seu storageBucket
  // messagingSenderId: "SEU_MESSAGING_SENDER_ID", // Se tiver
  // appId: "SEU_APP_ID" // Se tiver
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços que usaremos no resto do projeto
export const db = getFirestore(app);
export const auth = getAuth(app);