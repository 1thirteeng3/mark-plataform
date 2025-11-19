# Mark Platform API Documentation

## Authentication

### Login
**POST** `/auth/login`
- **Body**: `{ "email": "student@example.com", "password": "password" }`
- **Response**: `{ "accessToken": "...", "user": { ... } }`

## Students

### Batch Import (Admin Only)
**POST** `/students/batch-import`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "students": [ { "fullName": "John", "email": "john@example.com", "grade": "10A", "registrationNumber": "123" } ] }`
- **Response**: `{ "message": "Batch import processed.", ... }`

## Vouchers

### Redeem Voucher (Student Only)
**POST** `/vouchers/redeem`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "voucherId": "uuid", "cost": 100 }`
- **Response**: `{ "status": "SUCCESS", "redemptionId": "..." }`
