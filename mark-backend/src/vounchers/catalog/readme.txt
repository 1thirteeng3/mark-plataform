Webhook (/vouchers/catalog)
* Method: GET
* Path: vouncher/catalog
* Responde Mode: Respond to Webhook

VerifyStudentJWT (Function)

Postgres - Get Vouchers (Execute Query)
* Query parameters:
$1 = {{$json["schoolId"]}}

Respond to Webhook
* Configurações
	* responseMode: onReceived
	* responseCode: ={{$json["statusCode"] || 200}}
	* responseData: ={{$json}}

* Resposta 200 OK:
const vouchers = $json.data || [];

return [
  {
    json: vouchers,
  },
];