O objetivo desse endpoint é retornar os dados do usuário autenticado, validando o token JWT enviado no header da requisição (Authorization: Bearer <token>).

O fluxo técnico no n8n segue exatamente este pipeline:

Webhook (GET /auth/me)
   ↓
Function Node → validar JWT
   ↓
(Postgres Node - opcional) → buscar dados adicionais do usuário
   ↓
Respond to Webhook (status 200)

-------------------------------------------------------------------

Webhook Node
* Método: GET
* Path: /auth/me
* Recebe a requisição do cliente contendo o header Authorization: Bearer <jwt>
* Passa o request ao próximo node sem alterar o body.

Function Node - Validação JWT

Postgres Node - enriquecimento de Dados
* Execution Query
* Query parameter: $1 = {{$json["userId"]}}

Respond to Webhook
* Resposta 200 OK (json):
{
  "user": {
    "id": "uuid",
    "name": "Nome do Usuário",
    "email": "usuario@escola.com",
    "role": "ADMIN",
    "schoolId": "uuid-escola"
  }
}

-----------------------------------------------------------------

Boas Práticas e Segurança

* JWT_SECRET armazenado apenas em variáveis de ambiente, nunca no repositório.

* Todas as requisições foram (e devem) trafegar via HTTPS (TLS 1.2+).

* Utilizei RBAC (role-based access control): role vem embutido no JWT.

* Padronizei logs e respostas de erro para observabilidade no n8n/Nginx/Postgres.





