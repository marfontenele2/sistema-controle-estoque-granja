// js/logica_core.js (VERSÃO COMPLETA E CORRIGIDA)

/**
 * NOVA VERSÃO - Calcula o pedido com base na DEMANDA gerada pelas prevenções.
 * Cada item é calculado de forma independente.
 * @param {number} equipeId O ID da equipe para a qual o pedido será calculado.
 * @returns {object} Um objeto com os itens do pedido e o valor total.
 */
function calcularPedidoDisponivel(equipeId) {
  const equipe = appState.equipes.find(e => e.id === equipeId);
  if (!equipe) {
    console.error("Erro: Equipe com ID " + equipeId + " não encontrada.");
    return null;
  }

  const saldoDePrevencoes = equipe.saldoProducao + equipe.saldoReserva;
  
  const pedidoCalculado = {
    itens: [],
    valorTotalBRL: 0
  };

  appState.itens.forEach(item => {
    const quantidadeNecessaria = Math.floor(saldoDePrevencoes / item.custoEmPrevencoes);

    if (quantidadeNecessaria > 0) {
      pedidoCalculado.itens.push({
        itemId: item.id,
        nome: item.nome,
        quantidade: quantidadeNecessaria
      });
      pedidoCalculado.valorTotalBRL += quantidadeNecessaria * item.valorBRL;
    }
  });

  return pedidoCalculado;
}

/**
 * Debita um valor de custo dos saldos de uma equipe,
 * priorizando o saldo de produção antes do saldo de reserva.
 * @param {number} equipeId O ID da equipe a ser debitada.
 * @param {number} custoTotal O custo total em "prevenções" a ser debitado.
 */
function debitarSaldoDaEquipe(equipeId, custoTotal) {
  const equipe = appState.equipes.find(e => e.id === equipeId);
  if (!equipe) {
    console.error(`Erro ao debitar: equipe ${equipeId} não encontrada.`);
    return;
  }

  let custoRestante = custoTotal;

  if (equipe.saldoProducao > 0) {
    const debitoProducao = Math.min(equipe.saldoProducao, custoRestante);
    equipe.saldoProducao -= debitoProducao;
    custoRestante -= debitoProducao;
  }

  if (custoRestante > 0 && equipe.saldoReserva > 0) {
    const debitoReserva = Math.min(equipe.saldoReserva, custoRestante);
    equipe.saldoReserva -= debitoReserva;
    custoRestante -= debitoReserva;
  }
  
  console.log(`Débito realizado para ${equipe.nome}. Novo Saldo Produção: ${equipe.saldoProducao}, Novo Saldo Reserva: ${equipe.saldoReserva}`);
}

/**
 * Salva o estado atual da aplicação na memória do navegador.
 */
function salvarEstado() {
  localStorage.setItem('appState', JSON.stringify(appState));
}

/**
 * Carrega o estado da aplicação da memória do navegador, se existir.
 */
function carregarEstado() {
  const estadoSalvo = localStorage.getItem('appState');
  if (estadoSalvo) {
    appState = JSON.parse(estadoSalvo);
    console.log("Estado carregado da memória!", appState);
  } else {
    console.log("Nenhum estado salvo encontrado, usando estado inicial.");
  }
}