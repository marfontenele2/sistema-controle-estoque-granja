// js/banco_dados.js

// Usamos uma variável 'let' chamada 'appState' (estado da aplicação)
// para guardar todas as informações do nosso sistema em um único lugar.
// Isso evita que variáveis fiquem "soltas" e organiza o código.
let appState = {
  // Lista de todos os itens que podem ser controlados
  itens: [
    { 
      id: 1, 
      nome: "Caixa de Luvas (50 pares)", 
      // A "moeda" do nosso sistema: quanto "custa" em prevenções
      custoEmPrevencoes: 50, 
      // O valor financeiro para controle do administrador
      valorBRL: 38.00 
    },
    { 
      id: 2, 
      nome: "Álcool Absoluto (1 Litro)", 
      custoEmPrevencoes: 21, 
      valorBRL: 15.50 
    },
    { 
      id: 3, 
      nome: "Kit de Prevenção (unitário)", 
      custoEmPrevencoes: 1, 
      valorBRL: 4.25 
    },
  ],

  // Lista das equipes que usarão o sistema
  equipes: [
    { 
      id: 101, 
      nome: "Equipe - Sala de Coleta 1",
      // O saldo que a equipe ganha ao fazer exames
      saldoProducao: 75,
      // O saldo de emergência que o admin concede
      saldoReserva: 0
    },
    { 
      id: 102, 
      nome: "Equipe Volante A",
      saldoProducao: 0,
      saldoReserva: 0
    },
  ],

  // Um array vazio que guardará o histórico de todos os pedidos feitos
  pedidos: [
    // Exemplo de como um pedido será guardado no futuro:
    // { id: 2025001, equipeId: 101, data: "2025-06-07", itens: [...], valorTotal: 123.00, status: "Entregue" }
  ]
};

// --- Fim do arquivo banco_dados.js ---