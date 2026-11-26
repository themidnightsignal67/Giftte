# Giftte Firestore Security Specification

## 1. Data Invariants
1. User profiles (`/users/{userId}`) contain PII (`email`) and must only be readable/writable by the authenticated owner (`request.auth.uid == userId`) with verified email (`request.auth.token.email_verified == true`). Blanket `list` on `/users` is strictly forbidden.
2. Subcollections (`/users/{userId}/recipients/{recipientId}`, `/users/{userId}/savedGifts/{savedGiftId}`, `/users/{userId}/decisions/{decisionId}`) require `request.auth.uid == userId` and `incoming().ownerId == userId`.
3. If a `SavedGift` references a specific `recipientId` other than `"general"`, that recipient document must exist under `/users/{userId}/recipients/{recipientId}`.
4. Document IDs (`userId`, `recipientId`, `savedGiftId`, `decisionId`) must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters.
5. `createdAt` is immutable and must equal `request.time` on creation; `updatedAt` must equal `request.time` on both creation and update.
6. Every write enforces strict allowed keys via `hasAll` and `hasOnly` on create, and `affectedKeys().hasOnly(...)` on update.

## 2. The "Dirty Dozen" Adversarial Payloads
1. Unauthenticated read on `/users/uid123` -> `PERMISSION_DENIED`
2. Cross-user read on `/users/otherUid/savedGifts/gift1` -> `PERMISSION_DENIED`
3. Unverified email write on `/users/uid123` (`email_verified: false`) -> `PERMISSION_DENIED`
4. Identity spoofing: create `/users/uid123/savedGifts/g1` with `ownerId: "otherUid"` -> `PERMISSION_DENIED`
5. Shadow field injection: create `/users/uid123` with extra field `isAdmin: true` -> `PERMISSION_DENIED`
6. Oversized ID poisoning: create `/users/uid123/recipients/` + 500-char ID -> `PERMISSION_DENIED`
7. Client timestamp forgery: create `/users/uid123/savedGifts/g1` with past `createdAt` -> `PERMISSION_DENIED`
8. Immutable field tampering: update `SavedGift.createdAt` or `SavedGift.ownerId` -> `PERMISSION_DENIED`
9. Orphaned recipient reference: create `SavedGift` with `recipientId: "nonexistent"` -> `PERMISSION_DENIED`
10. Invalid status enum: update `SavedGift.status` to `"Stolen"` -> `PERMISSION_DENIED`
11. Value poisoning: update `SavedGift.personalNote` with 2,000-character string -> `PERMISSION_DENIED`
12. Unbounded array injection: create `DecisionSnapshot` with 20 `topGiftIds` -> `PERMISSION_DENIED`
