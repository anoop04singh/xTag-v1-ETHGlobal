# Database, Wallet, and Authentication Architecture

This document provides a detailed explanation of how the database is integrated, how user wallets are created and managed, and how this system ties into user authentication.

## 1. Database Integration with Prisma

The application uses **Prisma** as its Object-Relational Mapper (ORM) to interact with a PostgreSQL database. This provides a type-safe and intuitive way to perform database operations.

### Key Files:

-   **`prisma/schema.prisma`**: This is the single source of truth for our database schema. It defines all the models (tables), their fields (columns), and the relationships between them. The primary models are:
    -   `User`: Stores user information, including their `nfcId`, public `walletAddress`, and the encrypted private key (`encryptedSignerKey`).
    -   `Conversation` & `Message`: Store the chat history for each user.
    -   `Subscription`: Defines the premium content offerings created by users.
    -   `Purchase`: A record of a successful on-chain transaction, linking a `User` to a `Subscription`.

-   **`lib/db.ts`**: This file initializes and exports a singleton instance of the Prisma client. This ensures that only one connection to the database is maintained across the application, which is a best practice for performance and resource management.

```typescript
// lib/db.ts - Simplified
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

## 2. Server-Managed Wallet Creation

To provide a seamless Web3 experience without requiring users to manage their own browser extensions or private keys, the application provisions and manages a unique smart contract wallet for each user directly on the server.

### Key Files:

-   **`lib/wallet.ts`**: This file contains the core logic for creating a new wallet.
-   **`lib/encryption.ts`**: This utility handles the critical task of encrypting and decrypting private keys.

### The Process:

1.  **Initiation**: Wallet creation is triggered only when a new user signs up for the first time.
2.  **Key Generation**: The `createWallet()` function in `lib/wallet.ts` uses the `viem` library to generate a new, cryptographically secure private key (`generatePrivateKey`).
3.  **Address Derivation**: From this private key, a public wallet address is derived using `privateKeyToAccount`.
4.  **Secure Encryption**: Before the private key is stored, it is immediately encrypted using the `encrypt()` function from `lib/encryption.ts`. This function uses the `AES-256-GCM` algorithm and a server-side `ENCRYPTION_SECRET` (a 32-character string stored as an environment variable). **The raw, unencrypted private key is never stored in the database.**
5.  **Return Values**: The `createWallet` function returns the public `walletAddress` and the original `signerPrivateKey` to the calling function, which is responsible for storing the encrypted version.

## 3. Mapping, Storage, and Authentication Flow

The authentication system links a user's simple identifier (`nfcId`) to their secure, server-managed wallet.

### Key File:

-   **`app/api/auth/nfc/route.ts`**: This API endpoint orchestrates the entire signup and login process.

### First-Time User Signup Flow:

1.  A user enters a new `nfcId` on the login page.
2.  A `POST` request is sent to `/api/auth/nfc`.
3.  The API checks the `User` table and finds no user with that `nfcId`.
4.  It calls `createWallet()` to generate a new private key and public address.
5.  It encrypts the private key.
6.  It creates a new `User` record in the database, **mapping** the `nfcId` to the public `walletAddress` and the `encryptedSignerKey`.
7.  A JSON Web Token (JWT) is generated using `lib/auth.ts`. This token contains the user's unique database ID and their public wallet address.
8.  The JWT is sent back to the client, establishing an authenticated session.

### Existing User Login Flow:

1.  A user enters their existing `nfcId`.
2.  A `POST` request is sent to `/api/auth/nfc`.
3.  The API finds the corresponding `User` record in the database.
4.  It generates a new JWT with the user's ID and wallet address from the database record. **The encrypted private key is not touched or decrypted during login.**
5.  The JWT is sent to the client.

### Using the Wallet for Transactions (e.g., x402 Payment):

1.  The user is authenticated, and the server knows their `userId`.
2.  When an on-chain transaction is required (e.g., in `lib/x402.ts`), the server retrieves the `encryptedSignerKey` for that user from the database.
3.  The key is **decrypted in memory** using `lib/encryption.ts` just before it's needed to sign the transaction.
4.  The `viem` wallet client uses the decrypted key to sign and send the transaction to the blockchain.
5.  Once the transaction is complete, the in-memory decrypted key is discarded. It is never sent to the client or stored anywhere unencrypted.

This architecture ensures that the user experience is simple (login with just an ID) while maintaining a high level of security by keeping private keys encrypted at rest and only handling them on the server for the brief moment they are needed.