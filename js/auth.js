import { auth, db } from './firebase-config.js'; // Importa o 'db' também
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // Importa funções do firestore
import { initAdminPanel } from './script_admin.js';
import { initEquipePanel } from './script_equipe.js';

const path = window.location.pathname;
const page = path.split("/").pop();

// --- LÓGICA DE LOGIN (para a página login.html) ---
if (page === 'login.html' || page === '' || page === '/') {
    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email-input').value;
            const password = document.getElementById('password-input').value;
            signInWithEmailAndPassword(auth, email, password)
                .catch((error) => {
                    alert("Falha no login. Verifique seu e-mail e senha.");
                    console.error("Erro de login:", error.message);
                });
        });
    }
}

// --- VERIFICAÇÃO DE ESTADO, REDIRECIONAMENTO E INICIALIZAÇÃO --- 
onAuthStateChanged(auth, async (user) => { // A função agora é 'async' para esperar a busca
  if (user) {
    console.log('Usuário detectado:', user.email);
    const isAdmin = user.email === 'admin@granja.com';

    // Se estiver na página correta, inicializa o painel
    if (isAdmin && page === 'admin.html') {
        initAdminPanel();
    } else if (!isAdmin && (page === 'index.html' || page === '')) {
        // --- MUDANÇA PRINCIPAL AQUI ---
        // Agora, o auth.js busca os dados da equipe ANTES de iniciar o painel
        try {
            const q = query(collection(db, "equipes"), where("uid", "==", user.uid));
            const equipeSnapshot = await getDocs(q);

            if (!equipeSnapshot.empty) {
                const equipeDoc = equipeSnapshot.docs[0];
                const dadosEquipe = { firestoreId: equipeDoc.id, ...equipeDoc.data() };
                // Passa os dados da equipe diretamente para a função de inicialização
                initEquipePanel(dadosEquipe); 
            } else {
                document.getElementById('app-equipe').innerHTML = `<h1>Erro de Associação</h1><p>Seu usuário não está associado a nenhuma equipe. Por favor, contate o administrador.</p>`;
            }
        } catch (error) {
            console.error("Erro ao buscar dados da equipe no auth.js:", error);
            document.getElementById('app-equipe').innerHTML = `<h1>Erro ao carregar dados.</h1>`;
        }
    }
    // Redireciona para o painel correto, se não estiver na página certa
    else if (isAdmin && page !== 'admin.html') {
      window.location.replace('admin.html');
    } else if (!isAdmin && page !== 'index.html' && page !== '') { 
      window.location.replace('index.html');
    }

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        signOut(auth);
      });
    }

  } else {
    if (page !== 'login.html' && page !== '' && page !== '/') {
      window.location.replace('login.html');
    }
  }
});