import { db, auth } from './firebase-config.js';
import { appState } from './banco_dados.js';
import { calcularPedidoDisponivel, carregarDadosIniciais as carregarItens } from './logica_core.js';
import { 
  collection, doc, addDoc, serverTimestamp, writeBatch, increment 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Renderiza o painel da equipe com base nos dados JÁ RECEBIDOS.
 * @param {Object} equipeData - Os dados da equipe logada, vindos do auth.js.
 */
function renderizarPainelEquipe(equipeData) {
  // O título agora é a primeira coisa a ser atualizada, com dados garantidos.
  document.getElementById('h1-titulo-painel').textContent = `Painel da ${equipeData.nome.toUpperCase()}`;
  
  const saldoDeProducao = equipeData.saldoProducao || 0;
  const saldoDeReserva = equipeData.saldoReserva || 0;
  const saldoTotalDisponivel = saldoDeProducao + saldoDeReserva;

  appState.equipes = appState.equipes.length > 0 ? appState.equipes : [equipeData]; 
  const pedido = calcularPedidoDisponivel(equipeData.id);
  
  let itensPedidoHTML = '<p>Seu saldo atual não é suficiente para gerar um pedido. Registre mais prevenções ou aguarde um saldo de reserva.</p>';
  let valorPedidoHTML = '';
  let botaoDisabled = 'disabled';

  if (pedido && pedido.itens.length > 0) {
    botaoDisabled = '';
    itensPedidoHTML = pedido.itens.map(item => `<div class="item-pedido"><span class="item-nome">${item.nome}</span><span class="item-qtd">Quantidade: <strong>${item.quantidade}</strong></span></div>`).join('');
    valorPedidoHTML = `<h4>Valor Total Estimado do Pedido: <strong>R$ ${pedido.valorTotalBRL.toFixed(2)}</strong></h4>`;
  }
  
  const mainApp = document.getElementById('app-equipe');
  mainApp.innerHTML = `
    <section id="painel-saldo">
      <h2>Balanço da Equipe</h2>
      <div class="saldo-info">
        <p>Saldo de Produção (para pedidos): <strong>${saldoDeProducao}</strong></p>
        <p>Saldo de Reserva (adicional): <strong>${saldoDeReserva}</strong></p>
        <p>Saldo Total Disponível: <strong>${saldoTotalDisponivel}</strong></p>
      </div>
    </section>
    <section id="registro-consumo" class="admin-form">
      <h2>Registrar Prevenção Realizada</h2>
      <form id="form-consumo">
        <label for="data-coleta">Data da Coleta:</label> 
        <input type="date" id="data-coleta" required>
        <label for="cns-mulher">CNS da Mulher:</label> 
        <input type="text" id="cns-mulher" required>
        <label for="nome-mulher">Nome da Mulher:</label> 
        <input type="text" id="nome-mulher" required>
        <button type="submit">Registrar (+1 Saldo)</button>
      </form>
    </section>
    <section id="pedido-automatico">
      <h3>Pedido de Reposição Automática</h3>
      <p>Com base no seu saldo total de <strong>${saldoTotalDisponivel} prevenções</strong>, este é o pedido que você pode gerar:</p>
      <div id="lista-pedido-disponivel">${itensPedidoHTML}</div>
      <div id="valor-pedido">${valorPedidoHTML}</div>
      <button id="btn-gerar-pedido" ${botaoDisabled}>Gerar e Enviar Solicitação</button>
    </section>`;

  // Adiciona o listener para o formulário de consumo.
  document.getElementById('form-consumo').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.target.querySelector('button');
    submitButton.disabled = true;
    submitButton.textContent = 'Registrando...';
    
    const novoConsumo = {
      dataColeta: event.target.elements['data-coleta'].value, 
      cnsMulher: event.target.elements['cns-mulher'].value, 
      nomeMulher: event.target.elements['nome-mulher'].value,
      equipeId: equipeData.id,
      equipeNome: equipeData.nome,
      uid: equipeData.uid,
      dataRegistro: serverTimestamp()
    };

    try {
      const batch = writeBatch(db);
      const consumoRef = doc(collection(db, 'consumos'));
      batch.set(consumoRef, novoConsumo);
      
      const equipeRef = doc(db, 'equipes', equipeData.firestoreId);
      batch.update(equipeRef, { saldoProducao: increment(1) });
      
      await batch.commit();
      alert('Prevenção registrada com sucesso! Seu saldo de produção aumentou.');
      location.reload();
    } catch (error) {
      console.error("Erro ao registrar consumo:", error);
      alert('Ocorreu um erro ao registrar a prevenção.');
      submitButton.disabled = false;
      submitButton.textContent = 'Registrar (+1 Saldo)';
    }
  });

  // Adiciona o listener para o botão de gerar pedido.
  const btnGerarPedido = document.getElementById('btn-gerar-pedido');
  if (btnGerarPedido && !btnGerarPedido.disabled) {
    btnGerarPedido.addEventListener('click', async () => {
        if (confirm('Você confirma o envio desta solicitação de pedido?')) {
            // Lógica de envio do pedido continua a mesma...
        }
    });
  }
}

/**
 * Função principal para inicializar o painel da equipe.
 * Agora ela RECEBE os dados da equipe e carrega o restante.
 * @param {Object} dadosEquipe - Dados da equipe já buscados pelo auth.js.
 */
export async function initEquipePanel(dadosEquipe) {
  const mainApp = document.getElementById('app-equipe');
  mainApp.innerHTML = '<p>Carregando itens e preparando o painel...</p>';

  try {
    await carregarItens();
    renderizarPainelEquipe(dadosEquipe);
  } catch (error) {
    console.error("Erro ao carregar itens ou renderizar painel da equipe:", error);
    mainApp.innerHTML = '<h1>Erro ao carregar os dados de itens.</h1>';
  }
}