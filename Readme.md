<div align="center">
  <img src="public/XtagLogoBK.png" alt="xTag Logo" width="96">
  <h1>xTag Project Documentation</h1>
  <p>An AI-native interface for a 402-enabled world.</p>
</div>

---

## 1. Project Overview

xTag is a proof-of-concept AI assistant that demonstrates how Large Language Models (LLMs) can be transformed into truly autonomous agents capable of interacting with paid, on-chain resources. It provides a natural language interface for users to perform complex actions that require micropayments, abstracting away the complexities of blockchain transactions.

The core innovation lies in its ability to understand a user's intent, identify a corresponding paid API endpoint, seek confirmation, and execute a payment-enabled request—all within a simple chat interface. This is powered by the **x402 protocol**, which standardizes programmatic payments for API access.

## 2. How xTag Enhances AI Agents

Traditional AI assistants are limited to free, public data sources. They cannot access premium data, execute transactions, or interact with services that require payment. This severely limits their "agentic" capabilities—their ability to act autonomously on a user's behalf.

xTag solves this by integrating a crypto wallet directly with the AI agent, governed by the x402 protocol. This enhancement provides several key benefits:

-   **Economic Capability:** The agent can now pay for the resources it needs to fulfill a user's request, unlocking access to high-quality, proprietary data and services.
-   **True Autonomy:** With the ability to transact, the agent moves beyond being a simple information retriever to become a genuine actor in the digital economy. It can book services, purchase data, or trigger on-chain events.
-   **Seamless User Experience:** The user interacts via natural language, while the agent handles the entire backend process of API negotiation, payment, and data retrieval. The complexity of private keys, gas fees, and transaction signing is completely hidden.

## 3. Architectural Diagram

The xTag ecosystem is composed of three main parts: the User Interface (this application), the xTag Backend, and the external Paid Resource Server.

```ascii
+------------------------+        +-------------------------+        +--------------------------+
|   User Interface       |        |     xTag Backend        |        |  Paid Resource Server    |
|   (Next.js/React)      |        |   (Next.js API Routes)  |        |  (e.g., Vercel Serverless)|
+------------------------+        +-------------------------+        +--------------------------+
| - Chat UI              |        | - /api/auth/nfc         |        | - /api/get-data          |
| - Wallet Display       |        | - /api/chat             |        | - /api/nft-metadata      |
| - NFC Login            |        | - /api/wallet/*         |        | - /api/trading-signals   |
+------------------------+        +-------------------------+        +--------------------------+
          ^                         ^           ^           ^                    ^
          | User Interaction        |           |           |                    |
          v                         |           |           |                    |
+------------------------+          |           |           |                    |
|         User           |          |           |           |                    |
+------------------------+          |           |           |                    |
          |                         |           |           |                    |
          +------------------------>|           |           |                    |
            (1. Login/Chat)         |           |           |                    |
                                    |           |           |                    |
                                    +---------->|           |                    |
                                    (2. Auth &   |           |                    |
                                     Wallet Gen) |           |                    |
                                                |           |                    |
                                    +-----------+---------->|                    |
                                    (3. LLM Call - Gemini)  |                    |
                                                            |                    |
                                    +-----------------------+------------------->|
                                    (4. Paid API Request via x402)               |
                                                                                 |
                                    +-----------------------+<-------------------+
                                    (5. Receives Data)      |                    |
                                                            |                    |
                                    +-----------+<----------+                    |
                                    (6. Formats Response)                        |
                                                |                                |
          +<------------------------------------+                                |
          (7. Displays final result)

```

## 4. Core Features Explained

> ### NFC-Based Authentication & Wallet Creation
>
> xTag uses NFC tags as a physical authenticator. On first tap, the system:
>
> 1.  Generates a new EOA (Externally Owned Account) wallet.
> 2.  Encrypts and stores the private key, associating it with the unique NFC ID.
> 3.  Creates a user record in the database.
> 4.  Issues a JWT for session management.
>
> This process provides a seamless, passwordless onboarding experience while automatically provisioning each user with a dedicated wallet for the AI agent to use.

> ### The Paid Resource Server
>
> A separate, external server hosts the paid API endpoints. This server is responsible for:
>
> -   Protecting resources behind a 402 Payment Required wall.
> -   Issuing challenges (pricing, recipient address, etc.) to unauthorized clients.
> -   Verifying on-chain payments.
> -   Granting access to the resource upon successful payment.
>
> In this demo, the server is hosted at `https://x402-server-updated.vercel.app`.

## 5. The x402 Request Flow (Sequence Diagram)

When a user confirms an action that requires a paid resource, the following sequence is initiated by the xTag backend.

```ascii
User        xTag Backend (with x402-axios)      Paid Resource Server
 |                  |                                      |
 |---[run "cmd"]--->|                                      |
 |                  |---(1) GET /api/resource-------------->|
 |                  |                                      |
 |                  |<--(2) 402 Payment Required-----------|
 |                  |    (Headers: x-payment-challenge)    |
 |                  |                                      |
 |                  |    (3) Decodes challenge,            |
 |                  |        constructs & signs tx         |
 |                  |                                      |
 |                  |---(4) Submits tx to Polygon Amoy----->| (Blockchain)
 |                  |                                      |
 |                  |---(5) GET /api/resource-------------->|
 |                  |    (Headers: x-payment-response)     |
 |                  |                                      |
 |                  |<--(6) 200 OK + Resource Data---------|
 |                  |                                      |
 |<--[Formatted Data]|                                      |
 |                  |                                      |
```

The `x402-axios` library automatically handles steps 2 through 5, making the integration trivial for the developer. The library intercepts the `402` response, handles the on-chain payment, and retries the original request with the required payment proof.

## 6. API Payloads & Responses

### Chat Endpoint: `/api/chat`

This is the main endpoint for user interaction.

**Request Payload:**

```json
{ "message": "Can you get me the latest trading signals?" }
```

**AI Response (Permission Seeking):**

```json
{
  "role": "assistant",
  "content": "I can fetch the latest cryptocurrency trading signals for you. This action costs 0.10 USDC. Would you like me to proceed? [DYAD_ACTION:run \\"trading-signals\\"]"
}
```

**User Confirmation (sent back to chat):**

```json
{ "message": "run \\"trading-signals\\"" }
```

**Final API Response (After successful x402 call):**

```json
{
  "role": "assistant",
  "content": "✅ **Successfully fetched data from \\"trading-signals\\"**\\n\\n**Latest Trading Signals:**\\n- 🟢 **BTC/USD**: BUY at 68500.50 (Confidence: 0.92)\\n- 🔴 **ETH/USD**: SELL at 3500.75 (Confidence: 0.88)\\n\\n---\\n**Payment Details:**\\n*Transaction Hash:* [0x123...abc](https://amoy.polygonscan.com/tx/0x123...abc)"
}
```