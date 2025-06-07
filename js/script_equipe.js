import { db, app } from './firebase-config.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { appState } from './banco_dados.js';
import { calcularPedidoDisponivel } from './logica_core.js';
// Importa as funções necessárias: addDoc para criar, serverTimestamp para a data.
import { 
  collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const auth = getAuth(app);
const mainApp = document.getElementById('app-equipe');

function renderizarPainelEquipe(equipeData) {
  mainApp.innerHTML = '';
  const saldoTotal = equipeData.saldoProducao + equipeData.saldoReserva;
  appState.equipes = [equipeData];
  const pedido = calcularPedidoDisponivel(equipeData.id);

  let itensPedidoHTML = '<p>Seu saldo atual não é suficiente para gerar um pedido.</p>';
  let valorPedidoHTML = '';
  let botaoDisabled = 'disabled';

  if (pedido && pedido.itens.length > 0) {
    botaoDisabled = '';
    itensPedidoHTML = '';
    pedido.itens.forEach(item => {
      itensPedidoHTML += `<div class="item-pedido"><span class="item-nome">${item.nome}</span><span class="item-qtd">Quantidade: <strong>${item.quantidade}</strong></span></div>`;
    });
    valorPedidoHTML = `<h4>Valor Total Estimado do Pedido: <strong>R$ ${pedido.valorTotalBRL.toFixed(2)}</strong></h4>`;
  }

  const painelHTML = `
    <section id="painel-saldo"><h2>Painel da ${equipeData.nome}</h2><div class="saldo-info"><p>Seu Saldo Total Disponível:</p><h3 id="saldo-total">${saldoTotal}</h3><span>Prevenções</span></div></section>
    <section id="pedido-automatico"><h3>Pedido de Reposição Automática</h3><p>Com base no seu saldo, este é o pedido que será gerado:</p><div id="lista-pedido-disponivel">${itensPedidoHTML}</div><div id="valor-pedido">${valorPedidoHTML}</div><button id="btn-gerar-pedido" ${botaoDisabled}>Gerar e Enviar Solicitação</button></section>
  `;
  mainApp.innerHTML = painelHTML;

  const btnGerarPedido = document.getElementById('btn-gerar-pedido');
  if (btnGerarPedido && !btnGerarPedido.disabled) {
    btnGerarPedido.addEventListener('click', async () => {
      if (confirm('Você confirma o envio desta solicitação de pedido?')) {
        
        // --- INÍCIO DA NOVA LÓGICA ---
        btnGerarPedido.disabled = true;
        btnGerarPedido.textContent = 'Enviando...';

        // 1. Monta o objeto do pedido com base na estrutura que definimos.
        const novoPedido = {
          equipeId: equipeData.id,
          equipeFirestoreId: equipeData.firestoreId,
          equipeNome: equipeData.nome,
          uid: equipeData.uid, // UID do usuário para a regra de segurança
          dataCriacao: serverTimestamp(), // Pega a hora do servidor
          itens: pedido.itens,
          valorTotalBRL: pedido.valorTotalBRL,
          status: 'Pendente'
        };

        try {
          // 2. Adiciona o novo pedido à coleção 'pedidos'. O Firestore gera um ID automático.
          const pedidoRef = await addDoc(collection(db, "pedidos"), novoPedido);
          console.log("Pedido criado com sucesso com o ID: ", pedidoRef.id);

          // 3. SOMENTE APÓS o pedido ser criado, zera os saldos da equipe.
          const equipeDocRef = doc(db, "equipes", equipeData.firestoreId);
          await updateDoc(equipeDocRef, { saldoProducao: 0, saldoReserva: 0 });

          alert('Pedido enviado com sucesso!');
          location.reload();
          
        } catch (error) {
          console.error("Erro ao criar pedido: ", error);
          alert("Ocorreu um erro ao enviar o pedido. Tente novamente.");
          btnGerarPedido.disabled = false;
          btnGerarPedido.textContent = 'Gerar e Enviar Solicitação';
        }
        // --- FIM DA NOVA LÓGICA ---
      }
    });
  }
}

// Lógica Principal para buscar dados da equipe logada (sem alterações)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    mainApp.innerHTML = '<p>Buscando dados da sua equipe...</p>';
    const q = query(collection(db, "equipes"), where("uid", "==", user.uid));
    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        mainApp.innerHTML = '<h1>Erro</h1><p>Nenhuma equipe está associada a este usuário. Contate o administrador.</p>';
      } else {
        const equipeDoc = querySnapshot.docs[0];
        const dadosEquipe = { firestoreId: equipeDoc.id, ...equipeDoc.data() };
        renderizarPainelEquipe(dadosEquipe);
      }
    } catch (error) {
      console.error("Erro ao buscar dados da equipe:", error);
      mainApp.innerHTML = '<h1>Erro</h1><p>Não foi possível carregar os dados. Tente recarregar a página.</p>';
    }
  }
});