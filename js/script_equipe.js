import { db, auth } from './firebase-config.js';
import { appState } from './banco_dados.js';
import { calcularPedidoDisponivel, carregarDadosIniciais as carregarItens } from './logica_core.js';
import { 
  collection, query, where, getDocs, doc, addDoc, serverTimestamp, writeBatch, increment, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function renderizarMeusRegistros(equipeId) {
  const divListaRegistros = document.getElementById('lista-meus-registros');
  divListaRegistros.innerHTML = '<p>Buscando seus registros...</p>';
  try {
    const consumosRef = collection(db, 'consumos');
    const q = query(consumosRef, where("equipeId", "==", equipeId), orderBy("dataRegistro", "desc"));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      divListaRegistros.innerHTML = '<p>Você ainda não registrou nenhum atendimento.</p>';
      return;
    }
    let listaHTML = '<ul style="list-style-type: disc; padding-left: 20px;">';
    querySnapshot.forEach(doc => {
      const registro = doc.data();
      const dataFormatada = new Date(registro.dataColeta).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
      listaHTML += `<li style="margin-bottom: 5px;"><strong>${dataFormatada}:</strong> ${registro.nomeMulher} (CNS: ${registro.cnsMulher})</li>`;
    });
    listaHTML += '</ul>';
    divListaRegistros.innerHTML = listaHTML;
  } catch (error) {
    console.error("Erro ao buscar 'Meus Registros':", error);
    divListaRegistros.innerHTML = '<p style="color: red;">Erro ao carregar seus registros.</p>';
  }
}

function renderizarPainelEquipe(equipeData) {
  document.getElementById('h1-titulo-painel').textContent = `Painel da ${equipeData.nome.toUpperCase()}`;
  
  const saldoDeProducao = equipeData.saldoProducao || 0;
  const saldoDeReserva = equipeData.saldoReserva || 0;
  const saldoTotalDisponivel = saldoDeProducao + saldoDeReserva;

  appState.equipes = [equipeData]; 
  const pedido = calcularPedidoDisponivel(equipeData.id);
  
  let itensPedidoHTML = `<p>Com base no seu saldo total de <strong>${saldoTotalDisponivel} prevenções</strong>:</p><p>Seu saldo atual não é suficiente para gerar um pedido.</p>`;
  let valorPedidoHTML = '';
  let botaoDisabled = 'disabled';

  if (pedido && pedido.itens.length > 0) {
    botaoDisabled = '';
    itensPedidoHTML = `<p>Com base no seu saldo total de <strong>${saldoTotalDisponivel} prevenções</strong>:</p>` +
    pedido.itens.map(item => `<div class="item-pedido"><span>${item.nome}</span><span>Qtd: <strong>${item.quantidade}</strong></span></div>`).join('');
    valorPedidoHTML = `<h4>Valor Estimado: <strong>R$ ${pedido.valorTotalBRL.toFixed(2)}</strong></h4>`;
  }
  
  const mainApp = document.getElementById('app-equipe');
  mainApp.innerHTML = `
    <section id="painel-saldo">
      <h2>Balanço da Equipe</h2>
      <div class="saldo-info">
        <p>Saldo de Produção: <strong>${saldoDeProducao}</strong></p>
        <p>Saldo de Reserva: <strong>${saldoDeReserva}</strong></p>
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
      <div id="lista-pedido-disponivel">${itensPedidoHTML}</div>
      <div id="valor-pedido">${valorPedidoHTML}</div>
      <button id="btn-gerar-pedido" ${botaoDisabled}>Gerar e Enviar Solicitação</button>
    </section>
    <hr style="margin: 40px 0;">
    <section id="meus-registros">
      <h2>Meus Atendimentos Registrados</h2>
      <div id="lista-meus-registros">
        <p>Carregando seus registros...</p>
      </div>
    </section>
  `;

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

  const btnGerarPedido = document.getElementById('btn-gerar-pedido');
  if (btnGerarPedido && !btnGerarPedido.disabled) {
    btnGerarPedido.addEventListener('click', async () => {
        if (confirm('Você confirma o envio desta solicitação de pedido? O valor será descontado do seu saldo.')) {
            btnGerarPedido.disabled = true;
            btnGerarPedido.textContent = 'Enviando...';
            let custoTotalEmPrevencoes = 0;
            pedido.itens.forEach(itemPedido => {
                const itemInfo = appState.itens.find(i => i.id === itemPedido.itemId);
                if(itemInfo) {
                    custoTotalEmPrevencoes += itemPedido.quantidade * itemInfo.custoEmPrevencoes;
                }
            });

            const novoPedido = {
                uid: equipeData.uid,
                equipeId: equipeData.id,
                equipeNome: equipeData.nome,
                itens: pedido.itens,
                valorTotalBRL: pedido.valorTotalBRL,
                custoTotalEmPrevencoes: custoTotalEmPrevencoes,
                dataCriacao: serverTimestamp(),
                status: "Pendente"
            };

            try {
                const batch = writeBatch(db);
                const pedidoRef = doc(collection(db, 'pedidos'));
                batch.set(pedidoRef, novoPedido);
                const equipeRef = doc(db, 'equipes', equipeData.firestoreId);
                
                // Lógica para abater do saldo corretamente
                const saldoProducaoAtual = equipeData.saldoProducao || 0;
                const saldoReservaAtual = equipeData.saldoReserva || 0;
                let debitoProducao = 0;
                let debitoReserva = 0;

                if (saldoProducaoAtual >= custoTotalEmPrevencoes) {
                    debitoProducao = -custoTotalEmPrevencoes;
                } else {
                    debitoProducao = -saldoProducaoAtual;
                    debitoReserva = -(custoTotalEmPrevencoes - saldoProducaoAtual);
                }

                batch.update(equipeRef, { 
                    saldoProducao: increment(debitoProducao),
                    saldoReserva: increment(debitoReserva)
                });

                await batch.commit();
                alert('Pedido enviado com sucesso!');
                location.reload();
            } catch (error) {
                console.error("Erro ao gerar pedido:", error);
                alert("Ocorreu um erro ao enviar o pedido.");
                btnGerarPedido.disabled = false;
                btnGerarPedido.textContent = 'Gerar e Enviar Solicitação';
            }
        }
    });
  }
}

export async function initEquipePanel(dadosEquipe) {
  const mainApp = document.getElementById('app-equipe');
  mainApp.innerHTML = '<p>Carregando itens e preparando o painel...</p>';
  try {
    await carregarItens();
    renderizarPainelEquipe(dadosEquipe);
    await renderizarMeusRegistros(dadosEquipe.id);
  } catch (error) {
    console.error("Erro ao inicializar painel da equipe:", error);
    mainApp.innerHTML = '<h1>Erro ao carregar os dados.</h1>';
  }
}