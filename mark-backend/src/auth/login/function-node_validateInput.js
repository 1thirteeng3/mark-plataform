/**
 * validateInput
 *
 * Responsabilidade:
 *  - Garantir que recebemos email e password.
 *
 * Por quê:
 *  - Evita passar dados inválidos pra query SQL.
 *  - Padroniza mensagem de erro 400, como definido no LLD.
 *
 * Segurança:
 *  - Nunca logar a senha.
 */

const { email, password } = $json;

if (!email || !password) {
  // vamos devolver um shape de erro tipado; o Respond Node final vai usar isso
  return [
    {
      json: {
        authValidationError: true,
        errorResponse: {
          statusCode: 400,
          message: "Email e senha são obrigatórios.",
          error: "VALIDATION_ERROR",
        },
      },
    },
  ];
}

// Passa adiante os dados limpos
return [
  {
    json: {
      email: String(email).trim().toLowerCase(),
      password: String(password),
    },
  },
];
