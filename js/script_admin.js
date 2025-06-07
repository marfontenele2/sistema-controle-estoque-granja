import { db } from './firebase-config.js';
import { appState } from './banco_dados.js';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  increment,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// A função renderizarPainelAdmin continua a mesma
function renderizarPainelAdmin() {
  const divListaEquipes = document.getElementById('lista-equipes');
  const selectEquipesForm = document.getElementById('equipe-select');
  divListaEquipes.innerHTML = '';
  selectEquipesForm.innerHTML = '';
  if (appState.equipes.length === 0) {
    divListaEquipes.innerHTML = '<p>Nenhuma equipe encontrada no Firestore.</p>';
    return;
  }
  const optionDefault = document.createElement('option');
  optionDefault.disabled = true;
  optionDefault.selected = true;
  optionDefault.textContent = 'Selecione uma equipe';
  selectEquipesForm.appendChild(optionDefault);
  appState.equipes.forEach(equipe => {
    const equipeCard = document.createElement('div');
    equipeCard.className = 'equipe-card';
    equipeCard.innerHTML = `<h4>${equipe.nome}</h4><p>Saldo de Produção: <strong>${equipe.saldoProducao}</strong></p><p>Saldo de Reserva: <strong>${equipe.saldoReserva}</strong></p>`;
    divListaEquipes.appendChild(equipeCard);
    const option = document.createElement('option');
    option.value = equipe.firestoreId;
    option.textContent = equipe.nome;
    selectEquipesForm.appendChild(option);
  });
}

// A função renderizarListaPedidos continua a mesma
function renderizarListaPedidos(pedidos) {
  const divListaPedidos = document.getElementById('lista-pedidos');
  divListaPedidos.innerHTML = '';
  if (pedidos.length === 0) {
    divListaPedidos.innerHTML = '<p>Nenhum pedido encontrado no histórico.</p>';
    return;
  }
  pedidos.forEach(pedido => {
    const pedidoCard = document.createElement('div');
    const status = (pedido.status || 'desconhecido').toLowerCase();
    const valorTotal = (pedido.valorTotalBRL || 0).toFixed(2);
    pedidoCard.className = 'pedido-card';
    pedidoCard.classList.add(`status-${status}`);
    const dataPedido = pedido.dataCriacao ? new Date(pedido.dataCriacao.seconds * 1000).toLocaleDateString('pt-BR') : 'Data indisponível';
    let itensHTML = pedido.itens && Array.isArray(pedido.itens) ? pedido.itens.map(item => `<li>${item.quantidade}x - ${item.nome}</li>`).join('') : '<li>Itens não especificados</li>';
    let actionsHTML = '';
    if (pedido.status === 'Pendente') {
      actionsHTML = `<div class="pedido-actions"><button class="btn-aprovar" data-id="${pedido.firestoreId}">Aprovar</button><button class="btn-rejeitar" data-id="${pedido.firestoreId}">Rejeitar</button></div>`;
    }
    pedidoCard.innerHTML = `
      <div class="pedido-header">
        <h4>Pedido para ${pedido.equipeNome || 'Equipe desconhecida'}</h4>
        <span class="pedido-status">${pedido.status || 'Desconhecido'}</span>
      </div>
      <div class="pedido-body"><p><strong>Data:</strong> ${dataPedido}</p><p><strong>Itens Solicitados:</strong></p><ul>${itensHTML}</ul><p class="pedido-valor"><strong>Valor Total:</strong> R$ ${valorTotal}</p></div>
      ${actionsHTML}`;
    divListaPedidos.appendChild(pedidoCard);
  });
}

// A função carregarErenderizarPedidos continua a mesma
async function carregarErenderizarPedidos() {
  const divListaPedidos = document.getElementById('lista-pedidos');
  divListaPedidos.innerHTML = '<p>Carregando histórico de pedidos...</p>';
  try {
    const pedidosRef = collection(db, "pedidos");
    const q = query(pedidosRef, orderBy("dataCriacao", "desc"));
    const querySnapshot = await getDocs(q);
    const pedidos = [];
    querySnapshot.forEach((doc) => {
      pedidos.push({ firestoreId: doc.id, ...doc.data() });
    });
    renderizarListaPedidos(pedidos);
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    divListaPedidos.innerHTML = '<p style="color: red;">Erro ao carregar o histórico de pedidos.</p>';
    const errorElement = document.createElement('pre');
    errorElement.style.color = 'red';
    errorElement.textContent = error.stack;
    divListaPedidos.appendChild(errorElement);
  }
}

// --- Lógica Principal da Página do Admin ---
document.addEventListener('DOMContentLoaded', async () => {
  // Carrega as equipes
  try {
    const querySnapshot = await getDocs(collection(db, "equipes"));
    appState.equipes = [];
    querySnapshot.forEach((doc) => {
      appState.equipes.push({ firestoreId: doc.id, ...doc.data() });
    });
    renderizarPainelAdmin();
  } catch (error) {
    console.error("Erro ao buscar equipes do Firestore: ", error);
  }

  // Carrega e exibe os pedidos
  await carregarErenderizarPedidos();
  
  // --- INÍCIO DA NOVA LÓGICA DE AÇÕES ---
  const divListaPedidos = document.getElementById('lista-pedidos');

  divListaPedidos.addEventListener('click', async (event) => {
    const target = event.target; // O elemento exato que foi clicado
    const pedidoId = target.dataset.id; // Pega o 'data-id' do elemento clicado

    // Se o elemento clicado não tiver um data-id, não faz nada
    if (!pedidoId) {
      return;
    }

    // Verifica se o botão de aprovar foi clicado
    if (target.classList.contains('btn-aprovar')) {
      if (confirm(`Tem certeza que deseja APROVAR este pedido?`)) {
        target.textContent = 'Aprovando...';
        target.disabled = true;
        
        const pedidoRef = doc(db, 'pedidos', pedidoId);
        try {
          await updateDoc(pedidoRef, { status: 'Aprovado' });
          console.log(`Pedido ${pedidoId} aprovado com sucesso.`);
          await carregarErenderizarPedidos(); // Recarrega a lista para mostrar a mudança
        } catch (error) {
          console.error("Erro ao aprovar pedido:", error);
          alert("Ocorreu um erro ao aprovar o pedido.");
          target.textContent = 'Aprovar';
          target.disabled = false;
        }
      }
    }

    // Verifica se o botão de rejeitar foi clicado
    if (target.classList.contains('btn-rejeitar')) {
      if (confirm(`Tem certeza que deseja REJEITAR este pedido?`)) {
        target.textContent = 'Rejeitando...';
        target.disabled = true;

        const pedidoRef = doc(db, 'pedidos', pedidoId);
        try {
          await updateDoc(pedidoRef, { status: 'Rejeitado' });
          console.log(`Pedido ${pedidoId} rejeitado com sucesso.`);
          await carregarErenderizarPedidos(); // Recarrega a lista para mostrar a mudança
        } catch (error) {
          console.error("Erro ao rejeitar pedido:", error);
          alert("Ocorreu um erro ao rejeitar o pedido.");
          target.textContent = 'Rejeitar';
          target.disabled = false;
        }
      }
    }
  });
  // --- FIM DA NOVA LÓGICA DE AÇÕES ---
});