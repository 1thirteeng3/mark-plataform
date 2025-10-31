Webhook 
* Method: GET
* Path: /schools/rules

VerifyAdminJWT 

Function (validação e lógica)  

Postgres
* Query parameter: {{$json["values"][0]}}

Respond to Webhook
* Resposta array puro:
[
  { "id": "uuid1", "ruleName": "Participação", "marksToAward": 100 },
  { "id": "uuid2", "ruleName": "Presença", "marksToAward": 50 }
]
 
-----------------------------------------------------------------
Webhook 
* Method: GET
* Path: /schools/rules

VerifyAdminJWT 

Function (validação e lógica)  

Postgres

Respond to Webhook
* retorna 201 + objeto criado
{
  "id": "uuid",
  "ruleName": "Participação em Aula",
  "marksToAward": 100
}
