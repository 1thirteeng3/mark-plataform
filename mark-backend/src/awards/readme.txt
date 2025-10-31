* Etapas técnicas (sequência):

* Webhook (recebe studentId, ruleId)
	* Method: POST
	* Path: /awards
	* Response mode: Respont to Webhook

* VerifyAdminJWT (middleware RBAC)

* Validate Body (Function)
	* Contrato da API LLD
{
  "studentId": "uuid-do-aluno",
  "ruleId": "uuid-da-regra"
} 

* Get Rule (Postgres SELECT)
	* Query parameters:
$1 → {{$json["ruleId"]}}
$2 → {{$json["schoolId"]}}

* Get Student (Postgres SELECT)
	* Query parameters:
$1 → {{$json["studentId"]}}
$2 → {{$json["schoolId"]}}

* Transaction Block:

	* BEGIN

	* UPDATE students SET marks_balance = marks_balance + X

	* INSERT ledger_transactions (CREDIT)

	* COMMIT

* Respond to webhook:
* responseBody = ={{$json}}
* responseCode = ={{$json["statusCode"] || 200}}

	* Resposta 200 OK:
{
  "message": "Premiação aplicada com sucesso!",
  "studentId": "uuid-do-aluno",
  "ruleId": "uuid-da-regra",
  "marksCredited": 150
}
-----------------------------------------------------------------
Decisões Técnicas

* Atomicidade: A operação de crédito é transacional (BEGIN / COMMIT / ROLLBACK). Se qualquer etapa falhar, nenhuma modificação é persistida.

* Imutabilidade do Ledger: Nenhum UPDATE ocorre em ledger_transactions. Cada registro é uma linha auditável permanente.

* Escopo de Escola: O schoolId é extraído do JWT e usado em todas as queries.

* Descrição Legível: A description na transação inclui o nome da regra para auditoria clara.
-----------------------------------------------------------------
Boas Práticas Implementadas

* BEGIN/COMMIT/ROLLBACK: impede inconsistências no saldo.

* Verificação cruzada de school_id: bloqueia acesso inter-escolar.

* Descrição legível no ledger: ajuda auditorias e painéis administrativos.

* Respostas padronizadas (camelCase) conforme LLD.

	* Tratamento de erros estruturado:

	* 401: Token inválido

	* 403: Role ≠ ADMIN

	* 404: Entidade não encontrada

	* 500: Falha de transação
-----------------------------------------------------------------
Webhook /awards (POST)
	Recebe { "studentId": "...", "ruleId": "..." }

VerifyAdminJWT (Function)
	Valida token
	Garante role === 'ADMIN'
	Exporta { schoolId, userId }

Validate Body (Function)
	Garante que studentId e ruleId existem
	Propaga studentId, ruleId, schoolId

Postgres - Get Rule
	SELECT rule_name, marks_to_award FROM school_rules WHERE id=$1 	AND school_id=$2

Postgres - Get Student
	SELECT id, marks_balance FROM students WHERE id=$1 AND 	school_id=$2

Build Transaction SQL (Function)

	Verifica se aluno+regra existem
	Monta bloco:
BEGIN;
  UPDATE students ...
  INSERT INTO ledger_transactions ...
COMMIT;

	Output: { sql, values, marksCredited, studentId, ruleId }

Postgres - Execute Transaction

	Roda o bloco atômico

Respond /awards (POST)

	Retorna 200 + JSON de confirmação
