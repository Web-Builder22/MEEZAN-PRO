# Security Specification

## 1. Data Invariants
- Each user profile document is stored under `/users/{userId}` where `{userId}` strictly matches `request.auth.uid`.
- Subcollections `/users/{userId}/customers/{customerId}`, `/users/{userId}/suppliers/{supplierId}`, and `/users/{userId}/transactions/{transactionId}` require the user to be authenticated and strictly access their own root path (`request.auth.uid == userId`).
- Admins (including bootstrapped `mnomi4884@gmail.com`) have override access.
- All IDs must pass `isValidId` check (alphanumeric and dashes, max length 128).

## 2. The "Dirty Dozen" Payloads (Expected to fail with PERMISSION_DENIED)
1. Unauthenticated write to `/users/{userId}`
2. User 'A' updating profile of User 'B'
3. Write with missing required fields in `/users/{userId}`
4. Write with invalid enum role (e.g. `role: "SuperAdmin"`)
5. Write with string size exceeding limit (> 100 characters in name)
6. Customer creation under another user's path (`/users/{otherUid}/customers/{custId}`)
7. Customer creation with empty name
8. Transaction creation with invalid type (`type: "transfer"`)
9. Transaction creation with negative or zero amount
10. Malicious attempt to change `uid` on profile update
11. Injection of invalid characters in path variable (e.g. SQL injection payload as ID)
12. Blanket list queries without authenticating
