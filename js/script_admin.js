// js/script_admin.js (VERSÃO FINAL E CORRIGIDA)

/**
 * Função principal para "desenhar" ou "renderizar"
 * todas as informações dinâmicas na tela do administrador.
 */
function renderizarPainelAdmin() {
  console.log("Renderizando o painel do administrador...");

  const divListaEquipes = document.getElementById('lista-equipes');
  const selectEquipesForm = document.getElementById('equipe-select');

  divListaEquipes.innerHTML = '';
  selectEquipesForm.innerHTML = '';

  if (appState.equipes.length === 0) {
    divListaEquipes.innerHTML = '<p>Nenhuma equipe cadastrada.</p>';
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
    
    equipeCard.innerHTML = `
      <h4>${equipe.nome}</h4>
      <p>Saldo de Produção: <strong>${equipe.saldoProducao}</strong></p>
      <p>Saldo de Reserva: <strong>${equipe.saldoReserva}</strong></p>
    `;
    divListaEquipes.appendChild(equipeCard);

    const option = document.createElement('option');
    option.value = equipe.id;
    option.textContent = equipe.nome;
    selectEquipesForm.appendChild(option);
  });
}

/**
 * Renderiza a lista de pedidos feitos pelas equipes.
 */
function renderizarListaPedidos() {
  const divListaPedidos = document.getElementById('lista-pedidos');
  divListaPedidos.innerHTML = '';

  if (appState.pedidos.length === 0) {
    divListaPedidos.innerHTML = '<p>Nenhum pedido pendente ou histórico encontrado.</p>';
    return;
  }

  const pedidosRecentesPrimeiro = [...appState.pedidos].reverse();

  pedidosRecentesPrimeiro.forEach(pedido => {
    const pedidoCard = document.createElement('div');
    pedidoCard.className = 'pedido-card';
    pedidoCard.classList.add(`status-${pedido.status.toLowerCase()}`);

    let itensHTML = pedido.itens.map(item => 
      `<li>${item.quantidade}x - ${item.nome}</li>`
    ).join('');

    let actionsHTML = '';
    if (pedido.status === 'Pendente') {
      actionsHTML = `
        <div class="pedido-actions">
          <button class="btn-aprovar" data-id="${pedido.id}">Aprovar</button>
          <button class="btn-rejeitar" data-id="${pedido.id}">Rejeitar</button>
        </div>
      `;
    }

    pedidoCard.innerHTML = `
      <div class="pedido-header">
        <h4>Pedido #${pedido.id}</h4>
        <span class="pedido-status">${pedido.status}</span>
      </div>
      <div class="pedido-body">
        <p><strong>Equipe:</strong> ${pedido.equipeNome}</p>
        <p><strong>Data:</strong> ${pedido.data}</p>
        <p><strong>Itens Solicitados:</strong></p>
        <ul>${itensHTML}</ul>
        <p class="pedido-valor"><strong>Valor Total:</strong> R$ ${pedido.valorTotalBRL.toFixed(2)}</p>
      </div>
      ${actionsHTML} 
    `;

    divListaPedidos.appendChild(pedidoCard);
  });
}

// --- INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener('DOMContentLoaded', function() {
  carregarEstado();
  renderizarPainelAdmin();
  renderizarListaPedidos();

  // Lógica para o formulário de adicionar saldo de reserva
  const formReserva = document.getElementById('form-reserva');
  formReserva.addEventListener('submit', function(event) {
    event.preventDefault();

    const equipeId = parseInt(formReserva.elements['equipe-select'].value);
    const valorReserva = parseInt(formReserva.elements['valor-reserva'].value);
    
    if (isNaN(equipeId) || isNaN(valorReserva) || valorReserva <= 0) {
      alert('Por favor, selecione uma equipe e insira um valor de saldo válido.');
      return;
    }

    const equipe = appState.equipes.find(e => e.id === equipeId);
    if (equipe) {
      equipe.saldoReserva += valorReserva;
      salvarEstado();
      renderizarPainelAdmin();
      formReserva.reset();
      alert(`Saldo de ${valorReserva} adicionado com sucesso para a equipe ${equipe.nome}!`);
    } else {
      alert('Erro: Equipe selecionada não foi encontrada.');
    }
  });

  // Lógica para os botões de Aprovar/Rejeitar na lista de pedidos
  const divListaPedidos = document.getElementById('lista-pedidos');
  divListaPedidos.addEventListener('click', function(event) {
    const target = event.target;
    const pedidoId = parseInt(target.dataset.id);

    if (!pedidoId) return;

    const pedido = appState.pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;

    if (target.classList.contains('btn-aprovar')) {
      if (confirm(`Tem certeza que deseja APROVAR o pedido #${pedido.id}?`)) {
        pedido.status = 'Aprovado';
      }
    }

    if (target.classList.contains('btn-rejeitar')) {
      if (confirm(`Tem certeza que deseja REJEITAR o pedido #${pedido.id}?`)) {
        pedido.status = 'Rejeitado';
      }
    }
    
    salvarEstado();
    renderizarListaPedidos();
  });
});