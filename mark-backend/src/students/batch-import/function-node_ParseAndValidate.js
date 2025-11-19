/**
 * ParseAndValidate
 *
 * Responsabilidade:
 *  - Receber JSON (array de objetos) ou CSV.
 *  - Validar campos obrigatórios: Full Name, Class/Grade, School Registration Number.
 *  - Validar formato de email (se fornecido).
 *  - Checar duplicatas DENTRO do arquivo.
 *
 * Input: items[0].json.data (array) ou items[0].binary (se for upload de arquivo, n8n converte antes)
 *
 * Output:
 *  - validStudents: Array de alunos prontos para inserir.
 *  - errors: Array de erros encontrados.
 */

const students = items[0].json.students || []; // Assumindo que o webhook recebe { "students": [...] }
const validStudents = [];
const errors = [];
const emailsSeen = new Set();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

students.forEach((student, index) => {
    const rowNum = index + 1;
    const { fullName, email, grade, registrationNumber } = student;

    // 1. Campos obrigatórios
    if (!fullName || !grade || !registrationNumber) {
        errors.push(`Linha ${rowNum}: Campos obrigatórios faltando (Nome, Turma ou Matrícula).`);
        return;
    }

    // 2. Validação de Email (Opcional, mas se tiver, tem que ser válido)
    if (email) {
        if (!emailRegex.test(email)) {
            errors.push(`Linha ${rowNum}: Email inválido (${email}).`);
            return;
        }
        // 3. Duplicata no arquivo
        if (emailsSeen.has(email)) {
            errors.push(`Linha ${rowNum}: Email duplicado no arquivo (${email}).`);
            return;
        }
        emailsSeen.add(email);
    }

    validStudents.push({
        fullName,
        email: email || null,
        grade,
        registrationNumber,
        // enrollment_id será mapeado do registrationNumber
    });
});

return [
    {
        json: {
            validStudents,
            errors,
            totalProcessed: students.length,
            successCount: validStudents.length,
            errorCount: errors.length
        }
    }
];
