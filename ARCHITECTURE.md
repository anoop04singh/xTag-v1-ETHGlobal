# Application Architecture & Flow Documentation

## 1. Overview

This document outlines the complete architecture of the AI Assistant application. The application's core feature is providing a conversational AI interface where users can interact with a Gemini-powered assistant. Its unique value proposition is the ability for users to create and purchase on-chain "Subscriptions" using a smart contract wallet, which grant access to premium AI prompts and content.

The entire system is designed around a strict **separation of concerns**:
-   **The Frontend (Next.js/React)** is responsible for the user interface and state management.
-   **The AI (Google Gemini)** is responsible for generating conversational, non-transactional content.
-   **The Backend API (Next.js API Routes)** acts as the central orchestrator, handling business logic, authentication, and database interactions.
-   **The Blockchain (Polygon Amoy)** serves as the decentralized, trustless ledger for all premium content purchases.

---

## 2. Core Concepts

-   **Smart Wallets (Biconomy)**: Each user is automatically provisioned a unique smart contract wallet upon their first login. Their private key is generated on the server, encrypted, and stored in the database. This wallet is used to sign and send all on-chain transactions (e.g., purchasing a subscription). This provides a seamless web3 experience without requiring users to manage their own wallets or browser extensions.

-   **On-Chain Subscriptions (x402 Protocol)**: Subscriptions are premium prompts created by users. Access to these prompts is controlled by the `x402` protocol. When a user attempts to access a resource they don't own, the server returns a `402 Payment Required` response. Our custom `x402-fetch` library intercepts this, initiates an on-chain transaction using the user's smart wallet, and upon success, retries the request with proof of payment to gain access.

-   **Authentication (NFC ID -> JWT)**: The application uses a simplified authentication model where a unique NFC ID serves as the user's identifier. On login, the server generates a secure JSON Web Token (JWT) which is stored on the client and sent with every subsequent API request to authenticate the user.

---

## 3. Directory Structure

```
/
├── app/
│   ├── api/
│   │   ├── auth/nfc/route.ts       # Handles user login/signup via NFC ID.
│   │   ├── chat/route.ts           # The main orchestrator for all chat messages and commands.
│   │   ├── subscriptions/
│   │   │   ├── [id]/access/route.ts # Protected endpoint for premium subscription content.
│   │   │   └── route.ts            # CRUD operations for subscriptions.
│   │   └── wallet/balance/route.ts # Fetches the user's on-chain wallet balance.
│   ├── login/page.tsx              # The user login page.
│   ├── layout.tsx                  # Root layout, includes AuthProvider.
│   └── page.tsx                    # Main application page, protected route.
├── components/
│   ├── ui/                         # Shadcn UI components (vendor).
│   ├── AIAssistantUI.jsx           # The main component assembling the UI.
│   ├── ChatPane.jsx                # Displays the conversation and handles message rendering.
│   ├── Composer.jsx                # The text input area for sending messages.
│   ├── Sidebar.jsx                 # The main navigation sidebar.
│   └── CreateSubscriptionModal.jsx # Modal for creating/editing subscriptions.
├── context/
│   └── AuthContext.tsx             # React context for managing user authentication state.
├── lib/
│   ├── auth.ts                     # JWT creation and verification helpers.
│   ├── currentUser.ts              # Helper to get the current user from a request.
│   ├── db.ts                       # Prisma client instance.
│   ├── encryption.ts               # Encrypts/decrypts user wallet private keys.
│   ├── gemini.ts                   # Interface for interacting with the Google Gemini API.
│   ├── subscription-access.ts      # Core logic for checking subscription ownership.
│   ├── wallet.ts                   # Logic for creating Biconomy smart wallets.
│   └── x402.ts                     # Implements the x402 payment flow using an internal fetcher.
├── prisma/
│   └── schema.prisma               # Defines the database schema.
└── ... (config files)
```

---

## 4. Detailed Flow Analysis

### Flow 1: First-Time User Signup

1.  **User**: Navigates to the `/login` page and enters their unique NFC ID.
2.  **Frontend**: The `LoginPage` component calls the `login` function from `AuthContext`.
3.  **API Call**: `AuthContext` sends a POST request to `/api/auth/nfc` with the `nfcId`.
4.  **Backend (`/api/auth/nfc`)**:
    -   Checks the database for a user with this `nfcId`. It finds none.
    -   Calls `createSmartAccount()` from `lib/wallet.ts` to generate a new private key and derive a smart wallet address.
    -   Calls `encrypt()` from `lib/encryption.ts` to encrypt the new private key using the server's secret.
    -   Creates a new `User` record in the database with the `nfcId`, `smartAccountAddress`, and `encryptedSignerKey`.
    -   Calls `createToken()` from `lib/auth.ts` to generate a JWT for the new user.
    -   Returns the JWT to the frontend.
5.  **Frontend**: `AuthContext` receives the JWT, stores it in `localStorage`, updates its state, and redirects the user to the main application page (`/`).

### Flow 2: The x402 On-Chain Payment Flow (The Core Logic)

This is the most critical flow.

1.  **User Intent**: The user wants to access a premium subscription named "Daily Tech News". They type `run "Daily Tech News"` into the `Composer.jsx` and press send.
2.  **Orchestrator (`/api/chat`)**:
    -   The API receives the message. It uses a regex to detect the `run "..."` command.
    -   It **intercepts the command** and does *not* send it to the Gemini LLM for a conversational reply.
    -   It queries the database to find the "Daily Tech News" subscription ID.
3.  **Initiate Paid Request**:
    -   The chat API calls `makePaidRequest(userId, '/api/subscriptions/{id}/access', token)` from `lib/x402.ts`.
4.  **Internal Fetch & 402 Response**:
    -   Inside `makePaidRequest`, the `x402-fetch` library is configured to use our special `internalApiFetcher`.
    -   The `internalApiFetcher` directly calls the `getSubscriptionAccess(userId, subId)` function from `lib/subscription-access.ts`.
    -   `getSubscriptionAccess` checks the database. It sees the user is not the creator and has no `Purchase` record.
    -   It constructs a `402 Payment Required` response object in memory, containing the creator's wallet address, the price (e.g., 0.01), and the currency (USDC).
5.  **On-Chain Transaction**:
    -   `x402-fetch` catches the `402` response.
    -   It decrypts the user's stored private key.
    -   It connects to the Polygon Amoy network and initiates a real USDC transfer from the user's smart wallet to the creator's wallet for the specified amount.
    -   **If the user has insufficient USDC, this step fails, and `makePaidRequest` throws an error.**
6.  **Confirmation & Access**:
    -   The on-chain transaction is confirmed by the network.
    -   `x402-fetch` automatically retries the request to `internalApiFetcher`, this time with cryptographic proof of payment.
    -   `getSubscriptionAccess` is called again. This time, the proof of payment is valid (or, in a simplified model, it could re-check the DB), and it returns a `200 OK` response containing the secret premium prompt.
7.  **Content Delivery & Record Keeping**:
    -   `makePaidRequest` returns the premium prompt and the on-chain `transactionHash` to the chat API.
    -   The chat API creates a new `Purchase` record in the database, linking the user, the subscription, and the `transactionHash` as permanent proof.
    -   It sends the premium prompt to the Gemini LLM.
    -   It prepends a success message (e.g., "Payment of 0.01 USDC was successful!") to the AI's response.
    -   The final, premium content is saved as a new message and sent back to the user.

---

## 5. Database Schema (`schema.prisma`)

-   **`User`**: Stores user information, including their unique `nfcId`, their `smartAccountAddress`, and their `encryptedSignerKey`.
-   **`Conversation`**: Represents a single chat thread. Linked to a `User`.
-   **`Message`**: A single message within a `Conversation`, with a `role` (`user` or `assistant`) and `content`.
-   **`Subscription`**: A premium content offering created by a `User` (the `creator`). Contains the `name`, `description`, `price`, `currency`, and the secret `prompt`.
-   **`Purchase`**: A join table that represents a successful on-chain transaction. It links a `User` to a `Subscription` and stores the `txHash` as immutable proof of purchase.

---

## 6. Environment Variables (`.env`)

-   `DATABASE_URL`: Connection string for the PostgreSQL database.
-   `JWT_SECRET`: A long, random string for signing authentication tokens.
-   `ENCRYPTION_SECRET`: A 32-character string for encrypting wallet private keys.
-   `GEMINI_API_KEY`: API key for the Google Gemini service.
-   `BICONOMY_BUNDLER_URL`: RPC endpoint for the Biconomy bundler service.
-   `BICONOMY_PAYMASTER_API_KEY`: (Optional) API key for Biconomy's paymaster to sponsor gas fees.
-   `POLYGON_AMOY_RPC_URL`: RPC endpoint for the Polygon Amoy testnet.
-   `USDC_CONTRACT_ADDRESS`: The contract address for the mock USDC token on Amoy.
-   `X402_FACILITATOR_URL`: The URL for the x402 facilitator service (e.g., `https://x402.polygon.technology`).
-   `NEXT_PUBLIC_APP_URL`: The public base URL of the deployed application (e.g., `http://localhost:3000`).