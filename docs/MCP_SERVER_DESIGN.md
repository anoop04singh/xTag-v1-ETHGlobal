# MCP (Micro-payment) Server & Agent Architecture

## 1. Core Philosophy & Principles

This document outlines the architecture for the Micro-payment and Subscriptions Agent. The server is the central nervous system of the application, responsible for orchestrating interactions between the user, the AI, the database, and the blockchain.

-   **Server as the Single Source of Truth**: The server holds all business logic. It manages user accounts, subscription metadata, and the state of payment flows. The client and AI are interfaces to this logic, not decision-makers.
-   **Blockchain as the Ledger of Ownership**: The Polygon Amoy blockchain is the immutable, trustless ledger for all subscription purchases. A successful on-chain transaction is the only definitive proof of ownership.
-   **AI as the Intelligent User Interface**: The LLM's role is to provide a natural language interface for the user. It guides users to available features but **never** participates in the transactional logic of payments.
-   **Seamless Web3 Experience**: Users do not need their own wallets or browser extensions. The server provisions and manages a unique Biconomy smart contract wallet for each user, providing a Web2-like experience for Web3 transactions.

## 2. System Components

1.  **Frontend (Next.js/React)**: The user-facing application. Manages UI state and communicates with the Backend API via authenticated requests.
2.  **Backend API (Next.js API Routes)**: This is the **MCP Server**. It exposes endpoints for authentication, chat orchestration, subscription management, and wallet interactions.
3.  **Database (Prisma/PostgreSQL)**: Stores all application state that is not on-chain, including user data, encrypted wallet keys, conversation history, and subscription metadata.
4.  **Blockchain (Polygon Amoy)**: The decentralized payment layer where all subscription purchase transactions are recorded.
5.  **Wallet Service (Biconomy)**: Provides the infrastructure for creating and interacting with user-specific smart contract wallets.
6.  **Payment Protocol (x402)**: The standard used for handling micropayments. The server uses `402 Payment Required` responses to signal the need for an on-chain transaction.
7.  **AI Agent (Google Gemini)**: The Large Language Model that powers the conversational interface.

## 3. Detailed Data Flows

### Flow A: First-Time User Onboarding & Wallet Creation

This flow describes how a new user is seamlessly onboarded and provisioned a smart wallet using only their NFC ID.

1.  **Initiation**: The user navigates to the login page and enters their unique NFC ID.
2.  **Authentication Request**: The frontend sends a `POST` request to `/api/auth/nfc` with the `nfcId`.
3.  **Server Logic (`/api/auth/nfc`)**:
    a. The server queries the `User` table for the given `nfcId`. It finds no existing user.
    b. It recognizes this as a new user signup and calls the `createSmartAccount()` function in `lib/wallet.ts`.
    c. **Wallet Creation**: `createSmartAccount` generates a new private key and uses Biconomy's SDK to derive a corresponding smart contract wallet address on the Polygon Amoy network.
    d. **Key Encryption**: The server receives the new private key and immediately encrypts it using the `encrypt()` function from `lib/encryption.ts` and the server's `ENCRYPTION_SECRET`. **The raw private key is never stored.**
    e. **Database Commit**: A new record is created in the `User` table, storing the `nfcId`, the public `smartAccountAddress`, and the `encryptedSignerKey`.
    f. **Token Issuance**: The server generates a secure JSON Web Token (JWT) containing the new user's ID and smart account address using `lib/auth.ts`.
4.  **Session Creation**: The server returns the JWT to the frontend. The client stores this token in `localStorage` and uses it in the `Authorization` header for all subsequent API calls. The user is now logged in and has a fully functional, server-managed smart wallet.

### Flow B: The x402 On-Chain Subscription Purchase

This is the core transactional flow of the application.

1.  **User Intent**: A user, who does not own the "Daily Market Analysis" subscription, types `run "Daily Market Analysis"` into the chat.
2.  **Orchestration (`/api/chat`)**:
    a. The chat API receives the message. It detects the `run "..."` command and intercepts it.
    b. It queries the database to find the subscription ID for "Daily Market Analysis".
3.  **Initiate Paid Request**: The chat API calls `makePaidRequest(userId, '/api/subscriptions/{id}/access', userToken)` from `lib/x402.ts`.
4.  **Internal Resource Request & 402 Response**:
    a. `makePaidRequest` uses a special **internal fetcher** that calls the logic of the `/api/subscriptions/[id]/access` endpoint directly, avoiding a network timeout.
    b. The access logic (`lib/subscription-access.ts`) is executed. It checks the `Purchase` table and finds no record of ownership for this user and subscription.
    c. The function returns a `402 Payment Required` response object *in memory*, containing the creator's wallet address, the price, and the currency from the `Subscription` record.
5.  **On-Chain Transaction**:
    a. The `x402-fetch` library, wrapped in `makePaidRequest`, catches the `402` response.
    b. It queries the database for the user's `encryptedSignerKey`, decrypts it, and initializes a Viem account object.
    c. It constructs and sends the USDC transfer transaction to the Polygon Amoy network via the Biconomy bundler.
    d. **Failure Point**: If the user's smart wallet has insufficient USDC, the transaction fails, and `makePaidRequest` throws an error, which is caught by the chat API and relayed to the user.
6.  **Confirmation & Access**:
    a. The on-chain transaction is confirmed. The facilitator provides proof of payment.
    b. `x402-fetch` automatically retries the internal request, now with the payment proof.
    c. The access logic is executed again. This time, it validates the proof and returns a `200 OK` response containing the secret premium `prompt`.
7.  **Content Delivery & Record Keeping**:
    a. `makePaidRequest` returns the premium prompt and the on-chain `transactionHash` to the chat API.
    b. The chat API creates a new `Purchase` record in the database, linking the user, the subscription, and the `transactionHash` as permanent proof of ownership.
    c. The premium prompt is sent to the Gemini LLM to generate the final content.
    d. The AI's response, prepended with a success message, is saved to the database and sent back to the user.