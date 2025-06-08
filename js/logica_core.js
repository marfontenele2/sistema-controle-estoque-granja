import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { appState } from './banco_dados.js';

// Carrega os dados iniciais (equipes e itens) do Firestore para o appState
export async function carregarDadosIniciais() {
  try {
    const [equipesSnapshot, itensSnapshot] = await Promise.all([
      getDocs(collection(db, 'equipes')),
      getDocs(collection(db, 'itens'))
    ]);
    
    appState.equipes = equipesSnapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    appState.itens = itensSnapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    
    console.log('[DIAGNÓSTICO INICIAL] Dados de equipes e itens carregados com sucesso no appState.');

  } catch (error) {
    console.error("[ERRO FATAL] Não foi possível carregar os dados iniciais:", error);
    alert("ERRO FATAL: Não foi possível carregar os dados essenciais da aplicação. Verifique o console.");
    throw error;
  }
}

// Calcula o que uma equipe pode pedir com base no seu saldo (produção + reserva)
export function calcularPedidoDisponivel(equipeId) {
    const equipe = appState.equipes.find(e => e.id === equipeId);
    if (!equipe) return null;

    // AQUI: Somamos o saldo de produção e o saldo de reserva para calcular o pedido
    const saldoTotalDisponivel = (equipe.saldoProducao || 0) + (equipe.saldoReserva || 0); 
    const pedidoCalculado = { itens: [], valorTotalBRL: 0 };

    appState.itens.forEach(item => {
        if (item.custoEmPrevencoes > 0) {
            const quantidadePossivel = Math.floor(saldoTotalDisponivel / item.custoEmPrevencoes);
            if (quantidadePossivel > 0) {
                pedidoCalculado.itens.push({ 
                    itemId: item.id, 
                    nome: item.nome, 
                    quantidade: quantidadePossivel 
                });
                pedidoCalculado.valorTotalBRL += quantidadePossivel * item.valorBRL;
            }
        }
    });
    return pedidoCalculado;
}