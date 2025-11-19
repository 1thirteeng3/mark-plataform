const assert = require('assert');

// Mocking n8n 'items' and 'return'
const mockStudents = [
    { fullName: "John Doe", email: "john@example.com", grade: "10A", registrationNumber: "REG001" },
    { fullName: "Jane Doe", email: "jane@example.com", grade: "10B", registrationNumber: "REG002" },
    { fullName: "Invalid Email", email: "not-an-email", grade: "11A", registrationNumber: "REG003" },
    { fullName: "Duplicate Email", email: "john@example.com", grade: "10A", registrationNumber: "REG004" },
    { fullName: "Missing Info", email: "missing@example.com" } // Missing grade/reg
];

global.items = [{ json: { students: mockStudents } }];

// We need to wrap the code in a function to execute it like n8n
function runN8nCode() {
    const students = items[0].json.students || [];
    const validStudents = [];
    const errors = [];
    const emailsSeen = new Set();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    students.forEach((student, index) => {
        const rowNum = index + 1;
        const { fullName, email, grade, registrationNumber } = student;

        if (!fullName || !grade || !registrationNumber) {
            errors.push(`Linha ${rowNum}: Campos obrigatórios faltando (Nome, Turma ou Matrícula).`);
            return;
        }

        if (email) {
            if (!emailRegex.test(email)) {
                errors.push(`Linha ${rowNum}: Email inválido (${email}).`);
                return;
            }
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
}

console.log("Starting Batch Import Tests...");
const result = runN8nCode();
const output = result[0].json;

console.log("Processed:", output.totalProcessed);
console.log("Valid:", output.successCount);
console.log("Errors:", output.errorCount);
console.log("Error Messages:", output.errors);

assert.strictEqual(output.successCount, 2, "Should have 2 valid students");
assert.strictEqual(output.errorCount, 3, "Should have 3 errors");
assert.ok(output.errors.some(e => e.includes("Email inválido")), "Should detect invalid email");
assert.ok(output.errors.some(e => e.includes("Email duplicado")), "Should detect duplicate email");
assert.ok(output.errors.some(e => e.includes("Campos obrigatórios")), "Should detect missing fields");

console.log("Batch Import Tests Passed!");
