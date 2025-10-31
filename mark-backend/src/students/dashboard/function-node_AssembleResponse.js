/**
 * Assemble Dashboard Response
 *
 * Objetivo:
 *   - Combinar saldo atual (students) com últimas transações (ledger).
 *   - Montar a resposta final no formato camelCase definido no LLD.
 *
 * Por que:
 *   - O dashboard precisa carregar rapidamente o saldo e o extrato.
 *   - Isso é o painel que o aluno vê no app.
 */

const balanceNode = $items('Postgres - Get Student Balance')[0].json.data[0];
const txNode = $items('Postgres - Get Recent Transactions')[0].json.data;

const balance = balanceNode?.balance || 0;
const recentTransactions = txNode || [];

return [
  {
    json: {
      balance,
      recentTransactions,
      statusCode: 200,
    },
  },
];
