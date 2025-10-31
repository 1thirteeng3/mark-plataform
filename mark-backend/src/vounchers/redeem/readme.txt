VerifyStudentJWT

Validate Body & Load Voucher

Postgres Node - Load Voucher Option
* Query Parameters:
	* $1 → {{$json["voucherCatalogId"]}}
	* $2 → {{$json["schoolId"]}

Postgres Node - Load Student Balance
* Query Parameters:
	* $1 → {{$json["studentId"]}}
	* $2 → {{$json["schoolId"]}}

Function Node - Pre-check Balance

Function Node: Build Atomic Transaction (DEBIT + PENDING)
* Dependendo de como o node Postgres do n8n está configurado, capturar o id do redeemed_vouchers recém-criado dentro da mesma transação e propagar isso de volta pode exigir uma abordagem diferente (ex.: quebrar a transação em duas etapas e fazer SELECT depois).

* Se necessário, adaptação prática:

	BEGIN
	UPDATE saldo
	INSERT redeemed_vouchers RETURNING id
	INSERT ledger_transactions usando esse id se precisar (só 	para log futuro)
	COMMIT
	Depois rodar SELECT isolado para pegar o último redeem 	criado pelo aluno (ORDER BY created_at DESC LIMIT 1).

HTTP Request Node: Call Voucher Provider
* Input:
{
  "provider": "Amazon",
  "value": 50,
  "currency": "BRL",
  "studentId": "uuid_do_aluno"
}

Output:
{
  "code": "AMZ-GIFT-1234-5678",
  "instructions": "Use este código no site..."
}

OBS: O JS ESTILO FUNCTION É MODELAGEM CONCEITUAL. NA EXECUTAÇÃO FOI FEITO HTTP NODE E SUA RESPECTIVA CONFIGURAÇÃO DE REQUEST DO RELOADLY

Postgres Node Final - Finalize Redemption
* Pra fazer o UPDATE correto, precisamos saber qual linha em    redeemed_vouchers atualizar.

	* Você pode capturar o id retornado no INSERT...RETURNING 	dentro da transação anterior (ideal)(abordagem A).

	* Se não capturou diretamente, você pode localizar a 	linha mais recente PENDING daquele aluno + 	voucherCatalogId ordenada por created_at DESC LIMIT 1 	(Abordagem B).

* Ambas abordagens usam function node Build Update Completed/FINALIZE SQL, que mudam de acordo com a abordagem.

Function Node Final de Resposta ao Aluno
* O Respond Node final usaria:
	* responseCode: ={{$json["statusCode"] || 200}}
	* responseBody: ={{$json}}

-----------------------------------------------------------------
Pipeline lógico:

* VerifyStudentJWT

* Validate Body & Load Voucher

* Pre-check saldo e disponibilidade

* Transação atômica:

	* Debitar saldo do aluno (students.marks_balance -= cost)
	* Criar registro em redeemed_vouchers com status PENDING
	* Criar linha no ledger_transactions tipo DEBIT

* Chamar provedor externo (HTTP Request → fornecedor de voucher: Reloadly)

* Atualizar redeemed_vouchers para COMPLETED com voucher_code

* Retornar sucesso para o aluno com as instruções de resgate

* Se a chamada externa falhar → ROLLBACK (nada é debitado)