Estrutura do workflow n8n



Webhook (POST /auth/login)

* Method: POST
* Path: auth/login
* Response mode: Respond to Webhook
	* Recebe email/senha

* resposta 200 OK:
{
  "email": "admin@escola.com",
  "password": "senhaSegura!"
}


Function Node: validateInput

* Estamos anexando authValidationError se falhar. No n8n você pode colocar um IF depois; ou pode centralizar o tratamento mais à frente. O ponto é: não deixa seguir pro banco com input quebrado.


Postgres Node: getUserByEmail
* Credencial: Mark Postgres
* Operation: Execute Query
* Query Params: $1 = {{$json["email"]}}
	* Isso corresponde ao que o LLD define: o login seleciona id, name, email, password_hash, role, school_id.
	* password_hash está em formato PBKDF2 (no dev) ou bcrypt (prod). 

Function Node: checkPasswordAndSignJWT
* recebe o resultado do Postgres (user row),

* compara senha,

* gera JWT no formato exigido,

* monta resposta final para o frontend.


Respond to Webhook
* Response body: ={{$json}}

* HTTP status code:

	* Se isAuthError está definido → usar 	{{$json["statusCode"]}} que é 401.

	* Caso contrário → usar 200.

* Uma forma prática é ramificar com um IF node antes do Respond:

	* IF $json.isAuthError === true → Respond com $json e 	status $json.statusCode

	* ELSE → Respond com $json e status 200

-----------------------------------------------------------------



Entrada (POST /auth/login): { "email": "...", "password": "..." }



Saída 200 (json):



{

&nbsp; "accessToken": "<jwt>",

&nbsp; "user": {

&nbsp;   "id": "uuid",

&nbsp;   "name": "Nome",

&nbsp;   "email": "email@exemplo.com",

&nbsp;   "role": "ADMIN|STUDENT"

&nbsp; }

}



Erro 401 se credencial inválida.



JWT payload deve conter { userId, role, schoolId }

