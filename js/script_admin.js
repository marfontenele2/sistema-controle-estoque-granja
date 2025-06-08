import { db } from './firebase-config.js';
import { appState } from './banco_dados.js';
import { carregarDadosIniciais } from './logica_core.js';
import { 
  collection, getDocs, doc, updateDoc, increment, query, orderBy, where, addDoc, deleteDoc, writeBatch, getDoc, Timestamp, getCountFromServer 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function atualizarCardsDashboard() {
  try {
    const pedidosPendentesQuery = query(collection(db, "pedidos"), where("status", "==", "Pendente"));
    const snapshotPendentes = await getCountFromServer(pedidosPendentesQuery);
    document.getElementById('card-pedidos-pendentes').textContent = snapshotPendentes.data().count;
  } catch(e) { console.error("Erro ao contar pedidos pendentes:", e); }

  const itensBaixoEstoque = appState.itens.filter(item => (item.quantidadeEmEstoque || 0) < 10).length;
  document.getElementById('card-itens-estoque-baixo').textContent = itensBaixoEstoque;

  const valorTotalEstoque = appState.itens.reduce((total, item) => {
    return total + ((item.valorBRL || 0) * (item.quantidadeEmEstoque || 0));
  }, 0);
  document.getElementById('card-valor-estoque').textContent = valorTotalEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalEquipes = appState.equipes.length;
  document.getElementById('card-equipes-ativas').textContent = totalEquipes;
}

async function renderizarRegistrosConsumo() {
  const divListaRegistros = document.getElementById('lista-registros-consumo');
  divListaRegistros.innerHTML = '<p>Buscando registros...</p>';
  try {
    const consumosRef = collection(db, 'consumos');
    const q = query(consumosRef, orderBy("dataRegistro", "desc"));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      divListaRegistros.innerHTML = '<p>Nenhum registro de atendimento encontrado.</p>';
      return;
    }
    let tabelaHTML = `<table class="tabela-relatorio"><thead><tr><th>Data da Coleta</th><th>Nome da Paciente</th><th>CNS</th><th>Equipe Responsável</th></tr></thead><tbody>`;
    querySnapshot.forEach(doc => {
      const registro = doc.data();
      tabelaHTML += `<tr><td>${registro.dataColeta ? new Date(registro.dataColeta).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}</td><td>${registro.nomeMulher || 'Não informado'}</td><td>${registro.cnsMulher || 'Não informado'}</td><td>${registro.equipeNome || 'Não informado'}</td></tr>`;
    });
    tabelaHTML += `</tbody></table>`;
    divListaRegistros.innerHTML = tabelaHTML;
  } catch (error) {
    console.error("Erro ao buscar registros:", error);
    divListaRegistros.innerHTML = '<p style="color: red;">Erro ao carregar os registros.</p>';
  }
}

function renderizarDropdownItens() {
  const selectItensEntrada = document.getElementById('item-select-entrada');
  selectItensEntrada.innerHTML = '';
  if (!appState.itens || appState.itens.length === 0) {
    selectItensEntrada.innerHTML = '<option disabled selected>Nenhum item cadastrado</option>';
    return;
  }
  const optionDefault = document.createElement('option');
  optionDefault.disabled = true; optionDefault.selected = true;
  optionDefault.textContent = 'Selecione um item';
  selectItensEntrada.appendChild(optionDefault);
  const itensOrdenados = [...appState.itens].sort((a, b) => a.nome.localeCompare(b.nome));
  itensOrdenados.forEach(item => {
    const option = document.createElement('option');
    option.value = item.firestoreId;
    option.textContent = `${item.nome} (Estoque: ${item.quantidadeEmEstoque || 0})`;
    selectItensEntrada.appendChild(option);
  });
}

function renderizarPainelEquipes() {
  const divListaEquipes = document.getElementById('lista-equipes');
  const selectEquipesForm = document.getElementById('equipe-select');
  divListaEquipes.innerHTML = '';
  selectEquipesForm.innerHTML = '';
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
    const acoesHTML = `<div class="equipe-card-actions"><button class="btn-acao-equipe btn-editar-equipe" data-id="${equipe.firestoreId}">Editar</button><button class="btn-acao-equipe btn-excluir-equipe" data-id="${equipe.firestoreId}">Excluir</button></div>`;
    equipeCard.innerHTML = `<div class="equipe-card-content"><h4>${equipe.nome}</h4><p>ID: ${equipe.id}</p><p>Saldo Produção: <strong>${equipe.saldoProducao || 0}</strong></p><p>Saldo Reserva: <strong>${equipe.saldoReserva || 0}</strong></p></div>${acoesHTML}`;
    divListaEquipes.appendChild(equipeCard);
    const option = document.createElement('option');
    option.value = equipe.firestoreId; 
    option.textContent = equipe.nome;
    selectEquipesForm.appendChild(option.cloneNode(true));
  });
}

function renderizarListaPedidos(pedidos) {
  const divListaPedidos = document.getElementById('lista-pedidos');
  divListaPedidos.innerHTML = '';
  if (!pedidos || pedidos.length === 0) {
    divListaPedidos.innerHTML = '<p>Nenhum pedido encontrado.</p>'; 
    return;
  }
  pedidos.forEach(pedido => {
    const pedidoCard = document.createElement('div');
    const status = (pedido.status || 'desconhecido').toLowerCase();
    pedidoCard.className = 'pedido-card';
    pedidoCard.classList.add(`status-${status}`);
    const dataPedido = pedido.dataCriacao ? new Date(pedido.dataCriacao.seconds * 1000).toLocaleDateString('pt-BR') : 'N/A';
    let itensHTML = pedido.itens && Array.isArray(pedido.itens) ? pedido.itens.map(item => `<li>${item.quantidade}x - ${item.nome}</li>`).join('') : '<li>N/A</li>';
    let actionsHTML = '';
    if (pedido.status === 'Pendente') {
      actionsHTML = `<div class="pedido-actions"><button class="btn-aprovar" data-id="${pedido.firestoreId}">Aprovar</button><button class="btn-rejeitar" data-id="${pedido.firestoreId}">Rejeitar</button></div>`;
    }
    pedidoCard.innerHTML = `<div class="pedido-header"><h4>Pedido para ${pedido.equipeNome}</h4><span class="pedido-status">${pedido.status}</span></div><div class="pedido-body"><p><strong>Data:</strong> ${dataPedido}</p><ul>${itensHTML}</ul></div>${actionsHTML}`;
    divListaPedidos.appendChild(pedidoCard);
  });
}

function renderizarPainelItens() {
  const divListaItens = document.getElementById('lista-itens');
  divListaItens.innerHTML = '';
  if (!appState.itens || appState.itens.length === 0) {
    divListaItens.innerHTML = '<p>Nenhum item encontrado.</p>'; 
    return;
  }
  const itensOrdenados = [...appState.itens].sort((a, b) => a.nome.localeCompare(b.nome));
  itensOrdenados.forEach(item => {
    const itemCard = document.createElement('div');
    itemCard.className = 'equipe-card';
    itemCard.innerHTML = `<div class="equipe-card-content"><h4>${item.nome}</h4><p>Custo: <strong>${item.custoEmPrevencoes}</strong></p><p>Valor: <strong>R$ ${(item.valorBRL || 0).toFixed(2)}</strong></p><p>Estoque: <strong>${item.quantidadeEmEstoque || 0}</strong></p></div><div class="equipe-card-actions"><button class="btn-acao-equipe btn-editar-item" data-id="${item.firestoreId}">Editar</button><button class="btn-acao-equipe btn-excluir-item" data-id="${item.firestoreId}" style="background: #c82333;">Excluir</button></div>`;
    divListaItens.appendChild(itemCard);
  });
}

async function carregarErenderizarPedidos(statusFiltro = 'Pendente') {
  const divListaPedidos = document.getElementById('lista-pedidos');
  divListaPedidos.innerHTML = '<p>Carregando pedidos...</p>';
  try {
    const q = statusFiltro === 'todos'
      ? query(collection(db, "pedidos"), orderBy("dataCriacao", "desc"))
      : query(collection(db, "pedidos"), where("status", "==", statusFiltro), orderBy("dataCriacao", "desc"));
    const querySnapshot = await getDocs(q);
    const pedidos = querySnapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    renderizarListaPedidos(pedidos);
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    divListaPedidos.innerHTML = '<p style="color: red;">Erro ao carregar pedidos.</p>';
  }
}

export async function initAdminPanel() {
  try {
    await carregarDadosIniciais(); 
    renderizarPainelEquipes();
    renderizarPainelItens();
    renderizarDropdownItens();
    await carregarErenderizarPedidos('Pendente');
    await renderizarRegistrosConsumo();
    await atualizarCardsDashboard();
  } catch (error) {
    console.error("Erro fatal na inicialização:", error);
    document.querySelector('main').innerHTML = '<h1>Erro grave ao carregar.</h1>';
    return;
  }

  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  function ativarAba(tabId) {
    tabButtons.forEach(btn => btn.classList.toggle('ativo', btn.dataset.tab === tabId));
    tabPanels.forEach(panel => panel.classList.toggle('ativo', panel.id === `tab-${tabId}`));
  }
  const activeTabId = localStorage.getItem('activeTabAdmin') || 'dashboard';
  ativarAba(activeTabId);
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        ativarAba(tabId);
        localStorage.setItem('activeTabAdmin', tabId);
    });
  });

  document.getElementById('btn-filtro-pendentes').addEventListener('click', () => carregarErenderizarPedidos('Pendente'));
  document.getElementById('btn-filtro-todos').addEventListener('click', () => carregarErenderizarPedidos('todos'));
  
  document.getElementById('form-reserva').addEventListener('submit', async function(event) {
     event.preventDefault();
     const equipeId = this.elements['equipe-select'].value;
     const valor = parseInt(this.elements['valor-reserva'].value);
     if (!equipeId || isNaN(valor) || valor <= 0) { alert('Dados inválidos'); return; }
     try {
         await updateDoc(doc(db, "equipes", equipeId), { saldoReserva: increment(valor) });
         alert('Saldo adicionado!');
         location.reload();
     } catch (error) { console.error("Erro:", error); alert('Erro ao adicionar saldo'); }
  });

  document.getElementById('form-entrada-estoque').addEventListener('submit', async function(event) {
     event.preventDefault();
     const itemFirestoreId = this.elements['item-select-entrada'].value;
     const quantidade = parseInt(this.elements['quantidade-entrada'].value);
     if (!itemFirestoreId || isNaN(quantidade) || quantidade <= 0) { alert('Dados inválidos'); return; }
     const itemSelecionado = appState.itens.find(i => i.firestoreId === itemFirestoreId);
     if (!itemSelecionado) { alert('Item não encontrado'); return; }
     const batch = writeBatch(db);
     batch.update(doc(db, 'itens', itemFirestoreId), { quantidadeEmEstoque: increment(quantidade) });
     batch.set(doc(collection(db, 'movimentacoesEstoque')), { tipo: 'entrada', itemId: itemSelecionado.id, itemName: itemSelecionado.nome, quantidade: quantidade, data: Timestamp.now(), observacao: this.elements['observacao-entrada'].value || 'N/A' });
     try {
       await batch.commit();
       alert('Estoque atualizado!');
       location.reload();
     } catch (error) { console.error("Erro:", error); alert('Erro ao registrar entrada'); }
  });
   
  document.getElementById('lista-pedidos').addEventListener('click', async (event) => {
     const target = event.target;
     if (!(target.classList.contains('btn-aprovar') || target.classList.contains('btn-rejeitar'))) return;
     const pedidoId = target.dataset.id;
     if (!pedidoId) return;
     if (target.classList.contains('btn-rejeitar') && confirm('Rejeitar este pedido?')) {
         await updateDoc(doc(db, 'pedidos', pedidoId), { status: 'Rejeitado' });
         carregarErenderizarPedidos('Pendente');
     }
     if (target.classList.contains('btn-aprovar') && confirm('Aprovar este pedido?')) {
         target.disabled = true;
         try {
             const pedidoSnap = await getDoc(doc(db, 'pedidos', pedidoId));
             if (!pedidoSnap.exists()) throw new Error("Pedido não encontrado!");
             const pedidoData = pedidoSnap.data();
             const batch = writeBatch(db);
             for (const itemPedido of pedidoData.itens) {
                 const itemEstoque = appState.itens.find(i => i.id === itemPedido.itemId);
                 if (!itemEstoque || (itemEstoque.quantidadeEmEstoque || 0) < itemPedido.quantidade) throw new Error(`Estoque insuficiente para ${itemPedido.nome}`);
                 batch.update(doc(db, 'itens', itemEstoque.firestoreId), { quantidadeEmEstoque: increment(-itemPedido.quantidade) });
                 batch.set(doc(collection(db, 'movimentacoesEstoque')), { tipo: 'saida', itemId: itemEstoque.id, itemName: itemEstoque.nome, quantidade: itemPedido.quantidade, data: Timestamp.now(), observacao: `Pedido para ${pedidoData.equipeNome}` });
             }
             batch.update(doc(db, 'pedidos', pedidoId), { status: 'Aprovado' });
             await batch.commit();
             alert('Pedido aprovado!');
             location.reload();
         } catch (error) {
             alert(error.message);
             target.disabled = false;
         }
     }
  });

  document.getElementById('form-relatorio-movimentacao').addEventListener('submit', async function(event) {
    event.preventDefault();
    const divResultado = document.getElementById('resultado-relatorio-movimentacao');
    divResultado.innerHTML = '<p>Buscando movimentações...</p>';
    const dataInicioStr = this.elements['data-inicio-mov'].value;
    const dataFimStr = this.elements['data-fim-mov'].value;
    if (!dataInicioStr || !dataFimStr) { alert('Selecione as datas'); return; }
    const dataInicio = Timestamp.fromDate(new Date(dataInicioStr + 'T00:00:00'));
    const dataFim = Timestamp.fromDate(new Date(dataFimStr + 'T23:59:59'));
    try {
      const q = query(collection(db, 'movimentacoesEstoque'), where("data", ">=", dataInicio), where("data", "<=", dataFim), orderBy("data", "desc"));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) { divResultado.innerHTML = '<p>Nenhuma movimentação encontrada para o período.</p>'; return; }
      let tabelaHTML = `<table class="tabela-relatorio"><thead><tr><th>Data</th><th>Item</th><th>Tipo</th><th>Qtd</th><th>Obs.</th></tr></thead><tbody>`;
      querySnapshot.forEach(doc => {
        const mov = doc.data();
        tabelaHTML += `<tr><td>${new Date(mov.data.seconds * 1000).toLocaleString('pt-BR')}</td><td>${mov.itemName}</td><td>${mov.tipo}</td><td>${mov.quantidade}</td><td>${mov.observacao}</td></tr>`;
      });
      tabelaHTML += `</tbody></table>`;
      divResultado.innerHTML = tabelaHTML;
    } catch (error) { console.error("Erro:", error); divResultado.innerHTML = '<p style="color:red">Erro ao gerar relatório.</p>'; }
  });

  document.getElementById('btn-imprimir-relatorio').addEventListener('click', () => {
    const divRelatorio = document.getElementById('resultado-relatorio-movimentacao');
    if (!divRelatorio || !divRelatorio.querySelector('table')) {
      alert("Gere um relatório válido primeiro.");
      return;
    }
    const conteudoParaImprimir = divRelatorio.innerHTML;
    const janelaImpressao = window.open('', '_blank');
    janelaImpressao.document.write('<html><head><title>Relatório de Movimentação</title><link rel="stylesheet" href="css/estilo.css"><style>body{padding:30px;}h1{text-align:center;}</style></head><body>');
    janelaImpressao.document.write('<h1>Relatório de Movimentação de Estoque</h1>');
    janelaImpressao.document.write(conteudoParaImprimir);
    janelaImpressao.document.write('</body></html>');
    janelaImpressao.document.close();
  });
  
  const modalEditarEquipe = document.getElementById('modal-editar-equipe');
  const modalEditarItem = document.getElementById('modal-editar-item');
  const closeButtons = document.querySelectorAll('.modal-close');
  closeButtons.forEach(btn => { btn.addEventListener('click', () => { modalEditarEquipe.style.display = 'none'; modalEditarItem.style.display = 'none'; }); });
  window.addEventListener('click', (event) => { if (event.target == modalEditarEquipe) { modalEditarEquipe.style.display = "none"; } if (event.target == modalEditarItem) { modalEditarItem.style.display = "none"; } });

  document.getElementById('form-nova-equipe').addEventListener('submit', async function(event) {
    event.preventDefault();
    const nome = this.elements['nome-nova-equipe'].value.trim();
    const id = parseInt(this.elements['id-nova-equipe'].value);
    if (!nome || isNaN(id)) { alert('Dados inválidos'); return; }
    if (appState.equipes.some(e => e.id === id)) { alert('ID já existe.'); return; }
    try {
      await addDoc(collection(db, 'equipes'), { nome, id, saldoProducao: 0, saldoReserva: 0, uid: "" });
      alert('Equipe cadastrada!');
      location.reload();
    } catch (error) { console.error("Erro:", error); alert('Erro ao cadastrar equipe'); }
  });

  document.getElementById('form-editar-equipe').addEventListener('submit', async function(event) {
    event.preventDefault();
    const firestoreId = document.getElementById('edit-equipe-firestore-id').value;
    const nome = document.getElementById('edit-nome-equipe').value.trim();
    const id = parseInt(document.getElementById('edit-id-equipe').value);
    if (!nome || isNaN(id) || !firestoreId) return;
    if (appState.equipes.some(e => e.id === id && e.firestoreId !== firestoreId)) { alert('ID já pertence a outra equipe.'); return; }
    try {
      await updateDoc(doc(db, 'equipes', firestoreId), { nome, id });
      alert('Equipe atualizada!');
      location.reload();
    } catch (error) { console.error("Erro:", error); alert('Erro ao atualizar equipe'); }
  });

  document.getElementById('form-editar-item').addEventListener('submit', async function(event) {
    event.preventDefault();
    const firestoreId = document.getElementById('edit-item-id-hidden').value;
    const custo = parseInt(document.getElementById('edit-custo-prevencoes').value);
    const valorBRL = parseFloat(document.getElementById('edit-valor-brl').value);
    if (isNaN(custo) || isNaN(valorBRL) || !firestoreId) return;
    try {
      await updateDoc(doc(db, 'itens', firestoreId), { custoEmPrevencoes: custo, valorBRL });
      alert('Item atualizado!');
      location.reload();
    } catch (error) { console.error("Erro:", error); alert('Erro ao atualizar item'); }
  });

  document.getElementById('form-novo-item').addEventListener('submit', async function(event) {
    event.preventDefault();
    const nome = this.elements['nome-novo-item'].value.trim();
    const id = parseInt(this.elements['id-novo-item'].value);
    const custo = parseInt(this.elements['custo-novo-item'].value);
    const valorBRL = parseFloat(this.elements['valor-brl-novo-item'].value);
    if (!nome || isNaN(id) || isNaN(custo) || isNaN(valorBRL)) return;
    if (appState.itens.some(item => item.id === id)) { alert('ID já existe.'); return; }
    const novoItem = { nome, id, custoEmPrevencoes: custo, valorBRL, quantidadeEmEstoque: 0 };
    try {
      await addDoc(collection(db, 'itens'), novoItem);
      alert('Item cadastrado!');
      location.reload();
    } catch (error) { console.error("Erro:", error); alert('Erro ao cadastrar item'); }
  });

  document.getElementById('lista-itens').addEventListener('click', async (event) => {
    if (event.target.classList.contains('btn-excluir-item')) {
      const itemFirestoreId = event.target.dataset.id;
      const itemParaExcluir = appState.itens.find(i => i.firestoreId === itemFirestoreId);
      const nomeItem = itemParaExcluir ? itemParaExcluir.nome : 'este item';
      if (confirm(`Tem certeza que deseja excluir o item "${nomeItem}"?`)) {
        try {
          await deleteDoc(doc(db, 'itens', itemFirestoreId));
          alert(`Item "${nomeItem}" excluído com sucesso!`);
          location.reload();
        } catch (error) {
          console.error("Erro ao excluir item:", error);
          alert("Ocorreu um erro ao excluir o item.");
        }
      }
    }
     if (event.target.classList.contains('btn-editar-item')) {
      abrirModalEditarItem(event.target.dataset.id);
    }
  });

  document.getElementById('lista-equipes').addEventListener('click', async (event) => {
    if (event.target.classList.contains('btn-editar-equipe')) {
      abrirModalEditarEquipe(event.target.dataset.id);
    }
    if (event.target.classList.contains('btn-excluir-equipe')) {
      excluirEquipe(event.target.dataset.id);
    }
  });
}

function abrirModalEditarEquipe(firestoreId) {
    const equipe = appState.equipes.find(e => e.firestoreId === firestoreId);
    if (!equipe) return;
    document.getElementById('edit-equipe-firestore-id').value = equipe.firestoreId;
    document.getElementById('edit-nome-equipe').value = equipe.nome;
    document.getElementById('edit-id-equipe').value = equipe.id;
    document.getElementById('modal-editar-equipe').style.display = 'flex';
}

function abrirModalEditarItem(firestoreId) {
    const item = appState.itens.find(i => i.firestoreId === firestoreId);
    if (!item) return;
    document.getElementById('edit-item-id-hidden').value = item.firestoreId;
    document.getElementById('edit-item-nome').textContent = `Editar: ${item.nome}`;
    document.getElementById('edit-custo-prevencoes').value = item.custoEmPrevencoes;
    document.getElementById('edit-valor-brl').value = item.valorBRL.toFixed(2);
    document.getElementById('modal-editar-item').style.display = 'flex';
}

async function excluirEquipe(firestoreId) {
    if (!confirm('ATENÇÃO: Deseja EXCLUIR esta equipe?')) return;
    try {
        await deleteDoc(doc(db, 'equipes', firestoreId));
        alert('Equipe excluída!');
        location.reload();
    } catch (error) { console.error("Erro ao excluir equipe:", error); alert('Erro ao excluir equipe'); }
}