import { app } from './firebase-config.js';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const auth = getAuth(app);
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button'); // Pega o botão de logout

// --- Lógica de Login ---
if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log('Login realizado com sucesso:', userCredential.user);
      })
      .catch((error) => {
        console.error('Erro no login:', error);
        alert('E-mail ou senha incorretos. Tente novamente.');
      });
  });
}

// --- Lógica de Logout ---
// Só executa se o botão de logout existir na página atual
if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
      console.log('Usuário deslogado com sucesso.');
      // O onAuthStateChanged vai cuidar do redirecionamento para a página de login.
    }).catch((error) => {
      console.error('Erro ao fazer logout:', error);
    });
  });
}


// --- "Guardião" do Sistema de Autenticação ---
onAuthStateChanged(auth, (user) => {
  const currentPage = window.location.pathname.split('/').pop();

  if (user) {
    // USUÁRIO ESTÁ LOGADO
    if (currentPage === 'login.html') {
      if (user.email === 'admin@granja.com') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'index.html';
      }
    }
  } else {
    // USUÁRIO NÃO ESTÁ LOGADO
    if (currentPage !== 'login.html') {
      window.location.href = 'login.html';
    }
  }
});