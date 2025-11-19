const authUtils = require('./mark-backend/lib/authUtils');
const assert = require('assert');

console.log("Starting Auth Tests...");

// 1. Test PBKDF2 Hashing and Verification
const password = "mySuperSecretPassword";
const hash = authUtils.hashPasswordPBKDF2(password);
console.log("Generated Hash:", hash);

assert.ok(hash.includes("pbkdf2$100000$"), "Hash should use 100k iterations");
assert.ok(authUtils.verifyPasswordPBKDF2(password, hash), "Password should verify against generated hash");
assert.ok(!authUtils.verifyPasswordPBKDF2("wrongPassword", hash), "Wrong password should fail");

// 2. Test JWT Signing and Verification (V1)
const secretV1 = "secret_v1_key_very_secure";
const secretV2 = "secret_v2_key_new_rotation";

const payload = { userId: "123", role: "STUDENT", schoolId: "456" };
const tokenV1 = authUtils.signJWT(payload, secretV1);
console.log("Token V1:", tokenV1);

const decodedV1 = authUtils.verifyAndDecodeJWT(`Bearer ${tokenV1}`, secretV1);
assert.strictEqual(decodedV1.userId, "123");
assert.strictEqual(decodedV1.iss, "mark-platform");

// 3. Test JWT Rotation (Sign with V1, Verify with V1 in V2 slot? No, Verify with V1 as primary or secondary)
// verifyAndDecodeJWT(header, v1, v2) -> checks v1 then v2
const decodedRotated = authUtils.verifyAndDecodeJWT(`Bearer ${tokenV1}`, "wrong_key", secretV1);
assert.strictEqual(decodedRotated.userId, "123", "Should verify using the second secret (rotation scenario)");

// 4. Test Strict Validation
try {
    authUtils.verifyAndDecodeJWT(`Bearer ${tokenV1}`, "wrong_key_only");
    assert.fail("Should have thrown invalid signature");
} catch (e) {
    assert.strictEqual(e.message, "TOKEN_INVALID_SIGNATURE");
}

console.log("Auth Tests Passed!");
