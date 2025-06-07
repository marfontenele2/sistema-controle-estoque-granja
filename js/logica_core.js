// Importa o estado da aplicação para que as funções possam usá-lo
import { appState } from './banco_dados.js';

/**
 * Calcula os itens que uma equipe pode solicitar com base no seu saldo total.
 * @param {number} equipeId - O ID da equipe.
 * @returns {object|null} Um objeto com os itens do pedido e o valor total, ou null se a equipe não for encontrada.
 */
function calcularPedidoDisponivel(equipeId) {
  const equipe = appState.equipes.find(e => e.id === equipeId);
  if (!equipe) { return null; }

  const saldoDePrevencoes = equipe.saldoProducao + equipe.saldoReserva;
  const pedidoCalculado = { itens: [], valorTotalBRL: 0 };

  appState.itens.forEach(item => {
    const quantidadeNecessaria = Math.floor(saldoDePrevencoes / item.custoEmPrevencoes);
    if (quantidadeNecessaria > 0) {
      pedidoCalculado.itens.push({ itemId: item.id, nome: item.nome, quantidade: quantidadeNecessaria });
      pedidoCalculado.valorTotalBRL += quantidadeNecessaria * item.valorBRL;
    }
  });

  return pedidoCalculado;
}

/**
 * Debita um custo do saldo da equipe, priorizando o saldo de produção.
 * Esta função precisará ser adaptada quando a lógica for 100% Firestore.
 * @param {number} equipeId - O ID da equipe.
 * @param {number} custoTotal - O custo total a ser debitado.
 */
function debitarSaldoDaEquipe(equipeId, custoTotal) {
  const equipe = appState.equipes.find(e => e.id === equipeId);
  if (!equipe) { return; }

  let custoRestante = custoTotal;

  if (equipe.saldoProducao > 0) {
    const debitoProducao = Math.min(equipe.saldoProducao, custoRestante);
    equipe.saldoProducao -= debitoProducao;
    custoRestante -= debitoProducao;
  }

  if (custoRestante > 0 && equipe.saldoReserva > 0) {
    const debitoReserva = Math.min(equipe.saldoReserva, custoRestante);
    equipe.saldoReserva -= debitoReserva;
  }
}

// As funções salvarEstado e carregarEstado foram removidas pois são obsoletas.

// Exporta as funções para que outros scripts possam usá-las (se necessário)
export { calcularPedidoDisponivel, debitarSaldoDaEquipe };