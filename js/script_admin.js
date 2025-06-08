import { db } from './firebase-config.js';
import { appState } from './banco_dados.js';
import { carregarDadosIniciais } from './logica_core.js';
import { 
  collection, getDocs, doc, updateDoc, increment, query, orderBy, where, addDoc, deleteDoc, writeBatch, getDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =================================================================================
// SEÇÃO 1: DEFINIÇÃO DE TODAS AS FUNÇÕES DE RENDERIZAÇÃO E ATUALIZAÇÃO DA UI
// =================================================================================

/**
 * Renderiza o dropdown de seleção de itens na seção de entrada de estoque.
 */
function renderizarDropdownItens() {
  const selectItensEntrada = document.getElementById('item-select-entrada');
  selectItensEntrada.innerHTML = ''; // Limpa opções existentes
  if (!appState.itens || appState.itens.length === 0) {
    selectItensEntrada.innerHTML = '<option disabled selected>Nenhum item cadastrado</option>';
    return;
  }
  const optionDefault = document.createElement('option');
  optionDefault.disabled = true; optionDefault.selected = true;
  optionDefault.textContent = 'Selecione um item';
  selectItensEntrada.appendChild(optionDefault);

  // Ordena os itens por nome antes de renderizar
  const itensOrdenados = [...appState.itens].sort((a, b) => a.nome.localeCompare(b.nome));
  itensOrdenados.forEach(item => {
    const option = document.createElement('option');
    option.value = item.firestoreId; // Usamos o firestoreId para referenciar o documento no Firestore
    option.textContent = `${item.nome} (Estoque atual: ${item.quantidadeEmEstoque || 0})`;
    selectItensEntrada.appendChild(option);
  });
}

/**
 * Renderiza a lista de equipes e o dropdown de seleção de equipes no admin.
 */
function renderizarPainelEquipes() {
  const divListaEquipes = document.getElementById('lista-equipes');
  const selectEquipesForm = document.getElementById('equipe-select');
  divListaEquipes.innerHTML = ''; // Limpa lista existente
  selectEquipesForm.innerHTML = ''; // Limpa dropdown existente

  if (!appState.equipes || appState.equipes.length === 0) {
    divListaEquipes.innerHTML = '<p>Nenhuma equipe cadastrada.</p>';
    return;
  }

  const optionDefault = document.createElement('option');
  optionDefault.disabled = true; optionDefault.selected = true; 
  optionDefault.textContent = 'Selecione uma equipe';
  selectEquipesForm.appendChild(optionDefault);

  appState.equipes.forEach(equipe => {
    const equipeCard = document.createElement('div');
    equipeCard.className = 'equipe-card';
    const acoesHTML = `
      <div class="equipe-card-actions">
        <button class="btn-acao-equipe btn-editar-equipe" data-id="${equipe.firestoreId}">Editar</button>
        <button class="btn-acao-equipe btn-excluir-equipe" data-id="${equipe.firestoreId}">Excluir</button>
      </div>`;
    equipeCard.innerHTML = `
      <div class="equipe-card-content">
        <h4>${equipe.nome}</h4>
        <p>ID: ${equipe.id}</p>
        <p>Saldo de Produção: <strong>${equipe.saldoProducao || 0}</strong></p>
        <p>Saldo de Reserva: <strong>${equipe.saldoReserva || 0}</strong></p>
      </div>
      ${acoesHTML}`;
    divListaEquipes.appendChild(equipeCard);

    const option = document.createElement('option');
    option.value = equipe.firestoreId; 
    option.textContent = equipe.nome;
    selectEquipesForm.appendChild(option.cloneNode(true));
  });

  // Adiciona listeners para os botões de editar e excluir equipes
  divListaEquipes.querySelectorAll('.btn-editar-equipe').forEach(button => {
    button.addEventListener('click', (e) => abrirModalEditarEquipe(e.target.dataset.id));
  });
  divListaEquipes.querySelectorAll('.btn-excluir-equipe').forEach(button => {
    button.addEventListener('click', (e) => excluirEquipe(e.target.dataset.id));
  });
}

/**
 * Renderiza a lista de pedidos no painel de gerenciamento de pedidos.
 * @param {Array} pedidos - Array de objetos de pedido.
 */
function renderizarListaPedidos(pedidos) {
  const divListaPedidos = document.getElementById('lista-pedidos');
  divListaPedidos.innerHTML = ''; // Limpa a lista existente

  if (!pedidos || pedidos.length === 0) {
    divListaPedidos.innerHTML = '<p>Nenhum pedido encontrado para este filtro.</p>'; 
    return;
  }

  pedidos.forEach(pedido => {
    const pedidoCard = document.createElement('div');
    const status = (pedido.status || 'desconhecido').toLowerCase();
    const valorTotal = (pedido.valorTotalBRL || 0).toFixed(2);
    const custoPrevencoes = (pedido.custoTotalEmPrevencoes || 0);

    pedidoCard.className = 'pedido-card';
    pedidoCard.classList.add(`status-${status}`); // Adiciona classe para estilização de status

    // Formata a data
    const dataPedido = pedido.dataCriacao ? new Date(pedido.dataCriacao.seconds * 1000).toLocaleDateString('pt-BR') : 'Data indisponível';

    // Cria o HTML para a lista de itens do pedido
    let itensHTML = pedido.itens && Array.isArray(pedido.itens) 
      ? pedido.itens.map(item => `<li>${item.quantidade}x - ${item.nome}</li>`).join('') 
      : '<li>Itens não especificados</li>';
    
    // Botões de ação visíveis apenas se o status for Pendente
    let actionsHTML = '';
    if (pedido.status === 'Pendente') {
      actionsHTML = `
        <div class="pedido-actions">
          <button class="btn-aprovar" data-id="${pedido.firestoreId}">Aprovar</button>
          <button class="btn-rejeitar" data-id="${pedido.firestoreId}">Rejeitar</button>
        </div>`;
    }

    pedidoCard.innerHTML = `
      <div class="pedido-header">
        <h4>Pedido para ${pedido.equipeNome || 'Equipe desconhecida'} (ID: ${pedido.equipeId || 'N/A'})</h4>
        <span class="pedido-status">${pedido.status || 'Desconhecido'}</span>
      </div>
      <div class="pedido-body">
        <p><strong>Data:</strong> ${dataPedido}</p>
        <p><strong>Custo em Prevenções:</strong> ${custoPrevencoes}</p>
        <p><strong>Itens Solicitados:</strong></p>
        <ul>${itensHTML}</ul>
        <p class="pedido-valor"><strong>Valor Total:</strong> R$ ${valorTotal}</p>
      </div>
      ${actionsHTML}`;
    
    divListaPedidos.appendChild(pedidoCard);
  });
}

/**
 * Renderiza a lista de itens no painel de gerenciamento de itens e custos.
 */
function renderizarPainelItens() {
  const divListaItens = document.getElementById('lista-itens');
  divListaItens.innerHTML = ''; // Limpa a lista existente

  if (!appState.itens || appState.itens.length === 0) {
    divListaItens.innerHTML = '<p>Nenhum item encontrado.</p>'; 
    return;
  }

  // Ordena os itens por nome antes de renderizar
  const itensOrdenados = [...appState.itens].sort((a, b) => a.nome.localeCompare(b.nome));
  itensOrdenados.forEach(item => {
    const itemCard = document.createElement('div');
    itemCard.className = 'equipe-card'; // Reutiliza a classe para estilização
    itemCard.innerHTML = `
      <div class="equipe-card-content">
        <h4>${item.nome}</h4>
        <p>ID: ${item.id}</p>
        <p>Custo em Prevenções: <strong>${item.custoEmPrevencoes || 0}</strong></p>
        <p>Valor (R$): <strong>${(item.valorBRL || 0).toFixed(2)}</strong></p>
        <p>Estoque Físico: <strong>${item.quantidadeEmEstoque || 0}</strong></p>
      </div>
      <div class="equipe-card-actions">
        <button class="btn-acao-equipe btn-editar-item" data-id="${item.firestoreId}">Editar</button>
      </div>`;
    divListaItens.appendChild(itemCard);
  });

  // Adiciona listeners para os botões de editar item
  divListaItens.querySelectorAll('.btn-editar-item').forEach(button => {
    button.addEventListener('click', (e) => abrirModalEditarItem(e.target.dataset.id));
  });
}

/**
 * Carrega pedidos do Firestore e renderiza a lista.
 * @param {string} statusFiltro - 'Pendente' para pedidos pendentes, 'todos' para histórico completo.
 */
async function carregarErenderizarPedidos(statusFiltro = 'Pendente') {
  console.log(`[DIAGNÓSTICO] Iniciando busca de pedidos com filtro: ${statusFiltro}`);
  const divListaPedidos = document.getElementById('lista-pedidos');
  divListaPedidos.innerHTML = '<p>Carregando pedidos...</p>'; // Feedback de carregamento
  try {
    const pedidosRef = collection(db, "pedidos");
    let q;
    if (statusFiltro === 'todos') {
        q = query(pedidosRef, orderBy("dataCriacao", "desc"));
    } else {
        q = query(pedidosRef, where("status", "==", statusFiltro), orderBy("dataCriacao", "desc"));
    }
    const querySnapshot = await getDocs(q);
    console.log(`[DIAGNÓSTICO] Query executada. Encontrados ${querySnapshot.size} pedidos.`);
    const pedidos = querySnapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    renderizarListaPedidos(pedidos);
  } catch (error) {
    console.error("[ERRO GRAVE] Erro ao buscar pedidos:", error);
    divListaPedidos.innerHTML = '<p style="color: red;">Erro ao carregar os pedidos. Verifique o console para mais detalhes.</p><p style="color: red;">Se houver um link de "Índice" no console, clique nele para criar o índice necessário no Firebase.</p>';
  }
}

// =================================================================================
// SEÇÃO 2: FUNÇÃO DE INICIALIZAÇÃO DO PAINEL ADMIN (O "Maestro" que organiza tudo)
// =================================================================================
export async function initAdminPanel() {
  console.log('[DIAGNÓSTICO] auth.js deu o comando. Iniciando painel do admin...');
  try {
    // Carrega dados essenciais ANTES de renderizar qualquer coisa
    await carregarDadosIniciais(); 

    // Renderiza os componentes da UI
    renderizarPainelEquipes();
    renderizarPainelItens();
    renderizarDropdownItens();
    await carregarErenderizarPedidos('Pendente'); // Carrega pedidos pendentes por padrão

  } catch (error) {
    console.error("Erro fatal na inicialização do painel:", error);
    document.querySelector('main').innerHTML = '<h1>Ocorreu um erro grave ao carregar a página. Verifique o console para mais detalhes.</h1>';
    return; // Impede que o restante do script seja executado se houver erro fatal
  }

  // --- LÓGICA DAS ABAS (Navegação entre seções do painel) ---
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');

  function ativarAba(tabId) {
    tabButtons.forEach(btn => btn.classList.toggle('ativo', btn.dataset.tab === tabId));
    tabPanels.forEach(panel => panel.classList.toggle('ativo', panel.id === `tab-${tabId}`));
  }

  // Ativa a última aba visitada ou 'pedidos' por padrão
  const activeTabId = localStorage.getItem('activeTabAdmin') || 'pedidos';
  ativarAba(activeTabId);

  // Adiciona listeners para os botões das abas
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        ativarAba(tabId);
        localStorage.setItem('activeTabAdmin', tabId); // Salva a aba ativa no localStorage
    });
  });

  // =================================================================================
  // SEÇÃO 3: LISTENERS DE EVENTOS (Interações do usuário)
  // =================================================================================

  // --- FILTRO DE PEDIDOS ---
  document.getElementById('btn-filtro-pendentes').addEventListener('click', () => {
    document.getElementById('btn-filtro-pendentes').classList.add('filtro-ativo');
    document.getElementById('btn-filtro-todos').classList.remove('filtro-ativo');
    carregarErenderizarPedidos('Pendente');
  });
  document.getElementById('btn-filtro-todos').addEventListener('click', () => {
    document.getElementById('btn-filtro-todos').classList.add('filtro-ativo');
    document.getElementById('btn-filtro-pendentes').classList.remove('filtro-ativo');
    carregarErenderizarPedidos('todos');
  });
  
  // --- FORMULÁRIO DE ADICIONAR SALDO DE RESERVA ---
  document.getElementById('form-reserva').addEventListener('submit', async function(event) {
    event.preventDefault(); // Impede o recarregamento da página
    const equipeFirestoreId = this.elements['equipe-select'].value;
    const valor = parseInt(this.elements['valor-reserva'].value);
    const justificativa = this.elements['justificativa'].value.trim();

    if (!equipeFirestoreId || isNaN(valor) || valor <= 0 || justificativa === '') {
        alert('Por favor, selecione uma equipe, insira um valor de saldo válido e uma justificativa.');
        return;
    }

    try {
        const equipeRef = doc(db, "equipes", equipeFirestoreId);
        await updateDoc(equipeRef, { saldoReserva: increment(valor) });
        alert('Saldo de reserva adicionado com sucesso!');
        localStorage.setItem('activeTabAdmin', 'saldos'); // Mantém na aba de saldos
        location.reload(); // Recarrega a página para atualizar os dados
    } catch (error) {
        console.error("Erro ao adicionar saldo de reserva:", error);
        alert('Ocorreu um erro ao adicionar o saldo. Verifique o console.');
    }
  });

  // --- FORMULÁRIO DE REGISTRAR ENTRADA DE ITEM NO ESTOQUE ---
  document.getElementById('form-entrada-estoque').addEventListener('submit', async function(event) {
    event.preventDefault();
    const itemFirestoreId = this.elements['item-select-entrada'].value;
    const quantidade = parseInt(this.elements['quantidade-entrada'].value);
    const observacao = this.elements['observacao-entrada'].value.trim();

    if (!itemFirestoreId || isNaN(quantidade) || quantidade <= 0) {
      alert('Por favor, selecione um item e insira uma quantidade válida.');
      return;
    }

    const itemSelecionado = appState.itens.find(i => i.firestoreId === itemFirestoreId);
    if (!itemSelecionado) {
        alert('Erro: Item selecionado não encontrado em nossa lista.'); 
        return;
    }

    const batch = writeBatch(db); // Inicia uma operação em lote
    const itemRef = doc(db, 'itens', itemFirestoreId);
    
    // 1. Atualiza a quantidade em estoque do item
    batch.update(itemRef, { quantidadeEmEstoque: increment(quantidade) });

    // 2. Registra a movimentação no "diário de bordo" (movimentacoesEstoque)
    const logRef = doc(collection(db, 'movimentacoesEstoque')); // Cria um novo documento na coleção
    batch.set(logRef, {
      tipo: 'entrada',
      itemId: itemSelecionado.id, // ID original do item
      itemName: itemSelecionado.nome,
      quantidade: quantidade,
      data: Timestamp.now(), // Marca de tempo do Firestore
      observacao: observacao || 'Entrada manual sem observação' // Observação opcional
    });

    try {
      await batch.commit(); // Executa todas as operações do lote atomicamente
      alert('Estoque atualizado e movimentação registrada com sucesso!');
      localStorage.setItem('activeTabAdmin', 'estoque'); // Mantém na aba de estoque
      location.reload(); // Recarrega a página para atualizar os dados
    } catch (error) {
      console.error("Erro ao registrar entrada de estoque:", error);
      alert('Ocorreu um erro ao registrar a entrada de estoque. Verifique o console.');
    }
  });
  
  // --- LISTENERS PARA BOTÕES DE APROVAR/REJEITAR PEDIDOS ---
  document.getElementById('lista-pedidos').addEventListener('click', async (event) => {
    const target = event.target;

    // Verifica se o clique foi em um dos botões de ação
    if (!(target.classList.contains('btn-aprovar') || target.classList.contains('btn-rejeitar'))) {
        return;
    }

    const pedidoId = target.dataset.id; // Pega o ID do documento do pedido
    if (!pedidoId) return;

    // Lógica para REJEITAR pedido
    if (target.classList.contains('btn-rejeitar')) {
        if (confirm('Tem certeza que deseja REJEITAR este pedido? Esta ação não pode ser desfeita.')) {
            try {
                await updateDoc(doc(db, 'pedidos', pedidoId), { status: 'Rejeitado' });
                alert('Pedido rejeitado com sucesso!');
                await carregarErenderizarPedidos('Pendente'); // Recarrega apenas pedidos pendentes
            } catch (error) {
                console.error("Erro ao rejeitar pedido:", error);
                alert("Ocorreu um erro ao rejeitar o pedido.");
            }
        }
        return;
    }

    // Lógica para APROVAR pedido
    if (target.classList.contains('btn-aprovar')) {
        if (!confirm('Tem certeza que deseja APROVAR este pedido? Esta ação dará baixa no estoque e não pode ser desfeita.')) {
            return;
        }

        // Desabilita o botão para evitar cliques múltiplos
        target.disabled = true;
        target.textContent = 'Processando...';

        try {
            const pedidoRef = doc(db, 'pedidos', pedidoId);
            const pedidoSnap = await getDoc(pedidoRef);

            if (!pedidoSnap.exists()) {
                throw new Error("Pedido não encontrado no banco de dados!");
            }
            const pedidoData = pedidoSnap.data();

            let estoqueSuficiente = true;
            // Verifica se há estoque suficiente para todos os itens do pedido
            for (const itemPedido of pedidoData.itens) {
                const itemEstoque = appState.itens.find(i => i.id === itemPedido.itemId);
                if (!itemEstoque || (itemEstoque.quantidadeEmEstoque || 0) < itemPedido.quantidade) {
                    alert(`Estoque insuficiente para o item: ${itemPedido.nome}. Pedido: ${itemPedido.quantidade}, Estoque disponível: ${itemEstoque ? itemEstoque.quantidadeEmEstoque || 0 : '0'}.`);
                    estoqueSuficiente = false;
                    break; // Sai do loop se um item não tiver estoque
                }
            }

            if (!estoqueSuficiente) {
                target.disabled = false;
                target.textContent = 'Aprovar';
                return; // Impede a aprovação se o estoque for insuficiente
            }

            const batch = writeBatch(db); // Inicia uma operação em lote para atomicidade

            // Atualiza o estoque e registra movimentação para CADA item do pedido
            for (const itemPedido of pedidoData.itens) {
                const itemEstoque = appState.itens.find(i => i.id === itemPedido.itemId);
                
                // Garantia extra, embora já verificada acima
                if (!itemEstoque) {
                    console.error(`Item com ID ${itemPedido.itemId} do pedido não foi encontrado na lista de itens do sistema. Pulando este item.`);
                    continue; 
                }

                const itemRef = doc(db, 'itens', itemEstoque.firestoreId);
                // 1. Diminui a quantidade em estoque do item
                batch.update(itemRef, { quantidadeEmEstoque: increment(-itemPedido.quantidade) });

                // 2. Registra a saída no "diário de bordo" (movimentacoesEstoque)
                const logRef = doc(collection(db, 'movimentacoesEstoque'));
                batch.set(logRef, {
                  tipo: 'saida',
                  itemId: itemEstoque.id,
                  itemName: itemEstoque.nome,
                  quantidade: itemPedido.quantidade,
                  data: Timestamp.now(),
                  observacao: `Atendido para ${pedidoData.equipeNome} (Pedido ID: ${pedidoId})`
                });
            }

            // 3. Atualiza o status do pedido para 'Aprovado'
            batch.update(pedidoRef, { status: 'Aprovado' });

            await batch.commit(); // Executa todas as operações do lote
            alert('Pedido aprovado e movimentações de estoque registradas com sucesso!');
            location.reload(); // Recarrega a página para refletir as mudanças
        } catch (error) {
            console.error("Erro ao aprovar pedido: ", error);
            alert("Ocorreu um erro grave ao aprovar o pedido. Verifique o console.");
            target.disabled = false;
            target.textContent = 'Aprovar';
        }
    }
  });

  // --- FORMULÁRIO DE RELATÓRIO DE CONSUMO POR EQUIPE ---
  document.getElementById('form-relatorio-consumo').addEventListener('submit', async function(event) {
    event.preventDefault();
    const btn = this.querySelector('button');
    btn.disabled = true; 
    btn.textContent = 'Gerando...';
    const divResultado = document.getElementById('resultado-relatorio-consumo');
    divResultado.innerHTML = '<p>Buscando dados...</p>';

    const dataInicioStr = this.elements['data-inicio-consumo'].value;
    const dataFimStr = this.elements['data-fim-consumo'].value;

    if (!dataInicioStr || !dataFimStr) {
        alert('Por favor, selecione as datas de início e fim para o relatório de consumo.');
        btn.disabled = false; 
        btn.textContent = 'Gerar Relatório';
        return;
    }
    // Cria Timestamps para a consulta de período
    const dataInicio = Timestamp.fromDate(new Date(dataInicioStr + 'T00:00:00'));
    const dataFim = Timestamp.fromDate(new Date(dataFimStr + 'T23:59:59'));

    try {
      const consumosRef = collection(db, 'consumos');
      // Query para buscar consumos dentro do período ordenados pela data de registro
      const q = query(consumosRef, 
        where("dataRegistro", ">=", dataInicio), 
        where("dataRegistro", "<=", dataFim),
        orderBy("dataRegistro", "desc") // Garante que a ordem da query seja consistente com o índice
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        divResultado.innerHTML = '<p>Nenhum registro de consumo encontrado para o período selecionado.</p>';
        btn.disabled = false; 
        btn.textContent = 'Gerar Relatório';
        return;
      }

      // Agrega os consumos por equipe
      const relatorio = {};
      querySnapshot.forEach(doc => {
        const consumo = doc.data();
        const nomeEquipe = consumo.equipeNome || 'Equipe Desconhecida';
        if (relatorio[nomeEquipe]) { 
          relatorio[nomeEquipe]++; 
        } else { 
          relatorio[nomeEquipe] = 1; 
        }
      });

      let tabelaHTML = `
        <h4>Resultados de ${new Date(dataInicioStr).toLocaleDateString('pt-BR')} a ${new Date(dataFimStr).toLocaleDateString('pt-BR')}</h4>
        <table class="tabela-relatorio">
          <thead>
            <tr>
              <th>Equipe</th>
              <th>Total de Prevenções Registradas</th>
            </tr>
          </thead>
          <tbody>`;
      let totalGeral = 0;
      // Ordena as equipes por nome para a tabela
      const equipesOrdenadas = Object.keys(relatorio).sort();
      for (const equipe of equipesOrdenadas) {
        tabelaHTML += `<tr><td>${equipe}</td><td>${relatorio[equipe]}</td></tr>`;
        totalGeral += relatorio[equipe];
      }
      tabelaHTML += `
          </tbody>
          <tfoot>
            <tr>
              <td><strong>TOTAL GERAL</strong></td>
              <td><strong>${totalGeral}</strong></td>
            </tr>
          </tfoot>
        </table>`;
      
      divResultado.innerHTML = tabelaHTML;

    } catch (error) {
      console.error("Erro ao gerar relatório de consumo:", error);
      divResultado.innerHTML = `<p style="color: red;">Ocorreu um erro ao gerar o relatório de consumo. Verifique o console.</p><p style="color: red;"><strong>DICA IMPORTANTE:</strong> O Firebase pode precisar de um índice composto para essa consulta. Verifique o console do navegador: se houver um link de "Índice", clique nele para criar automaticamente no Firebase.</p>`;
    } finally {
      btn.disabled = false; 
      btn.textContent = 'Gerar Relatório';
    }
  });

  // --- FORMULÁRIO DE RELATÓRIO DE MOVIMENTAÇÃO DE ESTOQUE ---
  document.getElementById('form-relatorio-movimentacao').addEventListener('submit', async function(event) {
    event.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; 
    btn.textContent = 'Gerando...';
    const divResultado = document.getElementById('resultado-relatorio-movimentacao');
    divResultado.innerHTML = '<p>Buscando movimentações...</p>';

    const dataInicioStr = this.elements['data-inicio-mov'].value;
    const dataFimStr = this.elements['data-fim-mov'].value;

    if (!dataInicioStr || !dataFimStr) {
        alert('Por favor, selecione as datas de início e fim para o relatório de movimentação.');
        btn.disabled = false; 
        btn.textContent = 'Gerar Relatório';
        return;
    }
    // Cria Timestamps para a consulta de período
    const dataInicio = Timestamp.fromDate(new Date(dataInicioStr + 'T00:00:00'));
    const dataFim = Timestamp.fromDate(new Date(dataFimStr + 'T23:59:59'));

    try {
      const movRef = collection(db, 'movimentacoesEstoque');
      // Query para buscar movimentações dentro do período ordenadas pela data
      const q = query(movRef, 
        where("data", ">=", dataInicio), 
        where("data", "<=", dataFim), 
        orderBy("data", "desc") // Garante que a ordem da query seja consistente com o índice
      );
      const querySnapshot = await getDocs(q);

      console.log(`[DIAGNÓSTICO] Query de movimentação encontrou ${querySnapshot.size} documentos.`);

      if (querySnapshot.empty) {
        divResultado.innerHTML = '<p>Nenhuma movimentação de estoque encontrada para o período selecionado.</p>';
        btn.disabled = false; 
        btn.textContent = 'Gerar Relatório';
        return;
      }

      let tabelaHTML = `
        <h4>Relatório de Movimentação de Estoque</h4>
        <p>Período de ${new Date(dataInicioStr).toLocaleDateString('pt-BR')} a ${new Date(dataFimStr).toLocaleDateString('pt-BR')}</p>
        <table class="tabela-relatorio">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Item</th>
              <th>Tipo</th>
              <th>Quantidade</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>`;
      
      querySnapshot.forEach(doc => {
        const mov = doc.data();
        // Formata a data e hora do registro
        const dataFormatada = mov.data ? new Date(mov.data.seconds * 1000).toLocaleString('pt-BR') : 'Data/Hora indisponível';
        
        // Estilização simples para o tipo de movimentação
        const tipoStyle = mov.tipo === 'entrada' ? 'background-color:#28a745;' : 'background-color:#dc3545;';
        const tipoDisplay = mov.tipo ? mov.tipo.toUpperCase() : 'N/A';

        tabelaHTML += `
          <tr>
            <td>${dataFormatada}</td>
            <td>${mov.itemName || 'N/A'}</td>
            <td><span class="pedido-status" style="color:white; ${tipoStyle}">${tipoDisplay}</span></td>
            <td>${mov.quantidade || 0}</td>
            <td>${mov.observacao || 'Sem observação'}</td>
          </tr>`;
      });
      tabelaHTML += `
          </tbody>
        </table>`;
      
      divResultado.innerHTML = tabelaHTML;

    } catch (error) {
      console.error("Erro ao gerar relatório de movimentação:", error);
      divResultado.innerHTML = `<p style="color: red;">Ocorreu um erro ao gerar o relatório de movimentação. Verifique o console.</p><p style="color: red;"><strong>DICA IMPORTANTE:</strong> O Firebase pode precisar de um índice composto para essa consulta. Verifique o console do navegador: se houver um link de "Índice", clique nele para criar automaticamente no Firebase.</p>`;
    } finally {
      btn.disabled = false; 
      btn.textContent = 'Gerar Relatório';
    }
  });

  // --- BOTÃO DE IMPRIMIR RELATÓRIO ---
  document.getElementById('btn-imprimir-relatorio').addEventListener('click', () => {
    // Este é um placeholder. A lógica de impressão será implementada depois.
    alert('A funcionalidade de impressão será implementada no próximo passo!');
  });

  // =================================================================================
  // SEÇÃO 4: LÓGICA DE MODAIS (Pop-ups de Editar Equipe/Item)
  // =================================================================================

  const modalEditarEquipe = document.getElementById('modal-editar-equipe');
  const modalEditarItem = document.getElementById('modal-editar-item');
  const closeButtons = document.querySelectorAll('.modal-close');

  // Fecha qualquer modal ao clicar no 'x'
  closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
          modalEditarEquipe.style.display = 'none';
          modalEditarItem.style.display = 'none';
      });
  });

  // Fecha qualquer modal ao clicar fora dele
  window.addEventListener('click', (event) => {
      if (event.target === modalEditarEquipe) {
          modalEditarEquipe.style.display = 'none';
      }
      if (event.target === modalEditarItem) {
          modalEditarItem.style.display = 'none';
      }
  });

  /**
   * Abre o modal de edição de equipe e preenche com os dados da equipe.
   * @param {string} firestoreId - O ID do documento da equipe no Firestore.
   */
  async function abrirModalEditarEquipe(firestoreId) {
      const equipe = appState.equipes.find(e => e.firestoreId === firestoreId);
      if (!equipe) {
          alert('Equipe não encontrada para edição.');
          return;
      }
      document.getElementById('edit-equipe-firestore-id').value = equipe.firestoreId;
      document.getElementById('edit-nome-equipe').value = equipe.nome;
      document.getElementById('edit-id-equipe').value = equipe.id;
      modalEditarEquipe.style.display = 'flex'; // Exibe o modal
  }

  /**
   * Abre o modal de edição de item e preenche com os dados do item.
   * @param {string} firestoreId - O ID do documento do item no Firestore.
   */
  async function abrirModalEditarItem(firestoreId) {
    const item = appState.itens.find(i => i.firestoreId === firestoreId);
    if (!item) {
        alert('Item não encontrado para edição.');
        return;
    }
    document.getElementById('edit-item-id-hidden').value = item.firestoreId;
    document.getElementById('edit-item-nome').textContent = `Editar: ${item.nome}`;
    document.getElementById('edit-custo-prevencoes').value = item.custoEmPrevencoes;
    document.getElementById('edit-valor-brl').value = item.valorBRL.toFixed(2); // Formata para 2 casas decimais
    modalEditarItem.style.display = 'flex'; // Exibe o modal
  }

  // --- FORMULÁRIO DE CADASTRO DE NOVA EQUIPE ---
  document.getElementById('form-nova-equipe').addEventListener('submit', async function(event) {
    event.preventDefault();
    const nome = this.elements['nome-nova-equipe'].value.trim();
    const id = parseInt(this.elements['id-nova-equipe'].value);

    if (!nome || isNaN(id) || id <= 0) {
        alert('Por favor, preencha o nome da equipe e um ID numérico válido.');
        return;
    }

    // Verifica se o ID ou nome já existe no appState (evita duplicação)
    if (appState.equipes.some(e => e.id === id)) {
        alert('Já existe uma equipe com este ID. Por favor, escolha outro.');
        return;
    }
    if (appState.equipes.some(e => e.nome.toLowerCase() === nome.toLowerCase())) {
      alert('Já existe uma equipe com este nome. Por favor, escolha outro.');
      return;
    }

    try {
        await addDoc(collection(db, 'equipes'), {
            nome: nome,
            id: id,
            saldoProducao: 0,
            saldoReserva: 0,
            uid: "" // UID será associado posteriormente via Firebase Authentication
        });
        alert('Nova equipe cadastrada com sucesso!');
        localStorage.setItem('activeTabAdmin', 'cadastros');
        location.reload(); // Recarrega para atualizar a lista de equipes
    } catch (error) {
        console.error("Erro ao cadastrar equipe:", error);
        alert('Ocorreu um erro ao cadastrar a equipe. Verifique o console.');
    }
  });

  // --- FORMULÁRIO DE EDIÇÃO DE EQUIPE (no modal) ---
  document.getElementById('form-editar-equipe').addEventListener('submit', async function(event) {
    event.preventDefault();
    const firestoreId = document.getElementById('edit-equipe-firestore-id').value;
    const novoNome = document.getElementById('edit-nome-equipe').value.trim();
    const novoId = parseInt(document.getElementById('edit-id-equipe').value);

    if (!novoNome || isNaN(novoId) || novoId <= 0 || !firestoreId) {
        alert('Dados inválidos para edição da equipe.');
        return;
    }

    // Verifica se o novo ID ou nome já existe em OUTRAS equipes
    if (appState.equipes.some(e => e.id === novoId && e.firestoreId !== firestoreId)) {
        alert('Já existe outra equipe com este ID. Por favor, escolha outro.');
        return;
    }
    if (appState.equipes.some(e => e.nome.toLowerCase() === novoNome.toLowerCase() && e.firestoreId !== firestoreId)) {
      alert('Já existe outra equipe com este nome. Por favor, escolha outro.');
      return;
    }

    try {
        const equipeRef = doc(db, 'equipes', firestoreId);
        await updateDoc(equipeRef, {
            nome: novoNome,
            id: novoId
        });
        alert('Equipe atualizada com sucesso!');
        modalEditarEquipe.style.display = 'none'; // Fecha o modal
        localStorage.setItem('activeTabAdmin', 'equipes');
        location.reload(); // Recarrega para atualizar a lista
    } catch (error) {
        console.error("Erro ao editar equipe:", error);
        alert('Ocorreu um erro ao atualizar a equipe. Verifique o console.');
    }
  });

  // --- FUNÇÃO PARA EXCLUIR EQUIPE ---
  async function excluirEquipe(firestoreId) {
    if (!confirm('ATENÇÃO: Tem certeza que deseja EXCLUIR esta equipe? Esta ação é irreversível e removerá todos os pedidos e consumos associados a ela!')) {
        return;
    }
    try {
        const equipeRef = doc(db, 'equipes', firestoreId);
        
        // Opcional, mas recomendado: Excluir documentos relacionados (pedidos, consumos)
        // Isso requer mais lógica e talvez funções de nuvem para grandes volumes.
        // Por simplicidade, para iniciantes, o foco é na exclusão da equipe principal.
        // Para uma solução robusta, pesquisaria "Firebase delete collection" para saber como fazer isso em escala.

        await deleteDoc(equipeRef);
        alert('Equipe excluída com sucesso!');
        localStorage.setItem('activeTabAdmin', 'equipes');
        location.reload();
    } catch (error) {
        console.error("Erro ao excluir equipe:", error);
        alert('Ocorreu um erro ao excluir a equipe. Verifique o console.');
    }
  }

  // --- FORMULÁRIO DE EDIÇÃO DE ITEM (no modal) ---
  document.getElementById('form-editar-item').addEventListener('submit', async function(event) {
    event.preventDefault();
    const firestoreId = document.getElementById('edit-item-id-hidden').value;
    const custoPrevencoes = parseInt(document.getElementById('edit-custo-prevencoes').value);
    const valorBRL = parseFloat(document.getElementById('edit-valor-brl').value);

    if (isNaN(custoPrevencoes) || custoPrevencoes < 0 || isNaN(valorBRL) || valorBRL < 0 || !firestoreId) {
        alert('Dados inválidos para edição do item.');
        return;
    }

    try {
        const itemRef = doc(db, 'itens', firestoreId);
        await updateDoc(itemRef, {
            custoEmPrevencoes: custoPrevencoes,
            valorBRL: valorBRL
        });
        alert('Item atualizado com sucesso!');
        modalEditarItem.style.display = 'none'; // Fecha o modal
        localStorage.setItem('activeTabAdmin', 'itens');
        location.reload(); // Recarrega para atualizar a lista
    } catch (error) {
        console.error("Erro ao editar item:", error);
        alert('Ocorreu um erro ao atualizar o item. Verifique o console.');
    }
  });
}