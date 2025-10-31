Webhook 
* Method: GET 
* Path: /students/dashboard

VerifyStudentJWT (Function Node)

Get Student Balance (Postgres)
* Query parameters:
$1 → {{$json["studentId"]}}
$2 → {{$json["schoolId"]}}

* Output:
{
  "balance": 1200
}

Get Recent Transactions (Postgres)
* Query parameters:
$1 → {{$json["studentId"]}}

Assemble Response (Function Node)

Respond to Webhook
* Configuração:

	* Response Code: ={{$json["statusCode"] || 200}}
	* Response Body: ={{$json}}