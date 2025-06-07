// js/script_equipe.js (VERSÃO COMPLETA E FINAL)

// --- CONFIGURAÇÃO DA PÁGINA ---
// Esta linha SIMULA qual equipe está "logada".
// ID 101 = "Equipe - Sala de Coleta 1"
// Para testar a visão da outra equipe, mude o número abaixo para 102.
const EQUIPE_LOGADA_ID = 101; 

/**
 * Função principal que desenha todas as informações na tela da equipe.
 */
function renderizarPainelEquipe() {
  const mainApp = document.getElementById('app-equipe');
  // Busca os dados da equipe logada no nosso estado global da aplicação
  const equipeLogada = appState.equipes.find(e => e.id === EQUIPE_LOGADA_ID);

  // Se, por algum motivo, a equipe não for encontrada, exibe um erro.
  if (!equipeLogada) {
    mainApp.innerHTML = '<h1>Erro: Equipe não encontrada. Verifique o ID em EQUIPE_LOGADA_ID.</h1>';
    return;
  }

  // Calcula os valores a serem exibidos na tela
  const saldoTotal = equipeLogada.saldoProducao + equipeLogada.saldoReserva;
  const pedido = calcularPedidoDisponivel(EQUIPE_LOGADA_ID);

  // Prepara as variáveis para o HTML que será gerado
  let itensPedidoHTML = '<p>Seu saldo atual não é suficiente para gerar um pedido.</p>';
  let valorPedidoHTML = '';
  let botaoDisabled = 'disabled'; // O botão começa desabilitado por padrão

  // Se o cálculo do pedido retornar itens válidos, prepara o HTML para exibi-los
  if (pedido && pedido.itens.length > 0) {
    botaoDisabled = ''; // Habilita o botão
    itensPedidoHTML = ''; // Limpa a mensagem padrão
    pedido.itens.forEach(item => {
      itensPedidoHTML += `
        <div class="item-pedido">
          <span class="item-nome">${item.nome}</span>
          <span class="item-qtd">Quantidade: <strong>${item.quantidade}</strong></span>
        </div>
      `;
    });
    valorPedidoHTML = `<h4>Valor Total Estimado do Pedido: <strong>R$ ${pedido.valorTotalBRL.toFixed(2)}</strong></h4>`;
  }
  
  // Monta todo o HTML da página em uma única variável
  const painelHTML = `
    <section id="painel-saldo">
      <h2>Painel da ${equipeLogada.nome}</h2>
      <div class="saldo-info">
        <p>Seu Saldo Total Disponível:</p>
        <h3 id="saldo-total">${saldoTotal}</h3>
        <span>Prevenções</span>
      </div>
    </section>

    <section id="pedido-automatico">
      <h3>Pedido de Reposição Automática</h3>
      <p>Com base no seu saldo, este é o pedido que será gerado:</p>
      <div id="lista-pedido-disponivel">${itensPedidoHTML}</div>
      <div id="valor-pedido">${valorPedidoHTML}</div>
      <button id="btn-gerar-pedido" ${botaoDisabled}>Gerar e Enviar Solicitação</button>
    </section>
  `;

  // Insere o HTML gerado de uma só vez na página
  mainApp.innerHTML = painelHTML;

  // --- LÓGICA DO BOTÃO (adicionada após o painel ser desenhado) ---
  const btnGerarPedido = document.getElementById('btn-gerar-pedido');
  if (btnGerarPedido && !btnGerarPedido.disabled) {
    btnGerarPedido.addEventListener('click', function() {
      if (confirm('Você confirma o envio desta solicitação de pedido?')) {
        const custoTotalPedido = pedido.itens.reduce((total, item) => {
          const itemInfo = appState.itens.find(i => i.id === item.itemId);
          return total + (item.quantidade * itemInfo.custoEmPrevencoes);
        }, 0);

        const novoPedido = {
          id: Date.now(),
          equipeId: EQUIPE_LOGADA_ID,
          equipeNome: equipeLogada.nome,
          data: new Date().toLocaleDateString('pt-BR'),
          itens: pedido.itens,
          valorTotalBRL: pedido.valorTotalBRL,
          status: 'Pendente'
        };
        appState.pedidos.push(novoPedido);

        debitarSaldoDaEquipe(EQUIPE_LOGADA_ID, custoTotalPedido);
        
        salvarEstado(); // Salva o novo estado (com o pedido e o saldo atualizado)

        alert('Pedido enviado com sucesso!');
        renderizarPainelEquipe(); // Re-renderiza a tela para mostrar o saldo zerado
      }
    });
  }
}

// --- INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener('DOMContentLoaded', function() {
  carregarEstado(); // Carrega os dados da memória do navegador
  renderizarPainelEquipe(); // Desenha a tela
});