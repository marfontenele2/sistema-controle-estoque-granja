// Este arquivo define o estado inicial da aplicação em memória.
// No futuro, os "itens" também virão do Firestore.
// As listas "equipes" e "pedidos" são preenchidas dinamicamente.

// Adicione 'export' aqui para que outros módulos possam importar esta variável
export let appState = {
  itens: [
    { id: 1, nome: "Caixa de Luvas (50 pares)", custoEmPrevencoes: 50, valorBRL: 38.00 },
    { id: 2, nome: "Álcool Absoluto (1 Litro)", custoEmPrevencoes: 21, valorBRL: 15.50 },
    { id: 3, nome: "Kit de Prevenção (unitário)", custoEmPrevencoes: 1, valorBRL: 4.25 },
  ],
  equipes: [],
  pedidos: []
};