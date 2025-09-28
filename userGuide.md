<div align="center">
  <img src="public/XtagLogoWh.png" alt="xTag Logo" width="96">
  <h1>xTag User Guide</h1>
</div>

---

## 1. Welcome to xTag!

Welcome! xTag is an intelligent assistant that can perform tasks for you that require on-chain payments, like fetching premium data from protected sources. This guide will walk you through how to use its features.

## 2. Getting Started: Logging In

Your journey begins with a simple and secure login process using an NFC tag.

### Step 1: Scan Your NFC Tag
-   Click the **"Scan NFC Tag"** button.
-   If you're on a compatible mobile device (like Android with Chrome), your phone will ask you to hold your NFC tag near the back of your device.
-   The app will automatically read the tag's ID and log you in.

### Alternative: Manual Login
If you can't scan the tag, you can type its unique ID into the text box and click **"Continue"**.

Upon your first login, xTag automatically creates and securely stores a new cryptocurrency wallet for you. This wallet is what your AI assistant will use to pay for services on your behalf.

## 3. The Main Interface

Once logged in, you'll see three main sections:

-   **Sidebar (Left):** Here you can see your **Wallet Info**, including your wallet address and token balances. You can also log out from here.
-   **Header (Top):** Switch between the three main views: **Chat**, **Explore**, and **About**.
-   **Main Pane (Center):** This is where you'll interact with the AI, explore available commands, or read about the project.

## 4. Interacting with Your AI Assistant

The **Chat** view is where the magic happens. You can talk to the AI in plain English. When you ask for something that requires a paid service, the AI will follow a simple, transparent process.

### How Paid Requests Work: A Step-by-Step Example

Let's say you want to get the latest crypto trading signals.

**Step 1: Make a Request**
You start by asking the AI a question, just like you would with any other chatbot.

> **You:** "Show me the latest crypto trading signals"

**Step 2: Get a Confirmation Prompt**
The AI understands your request corresponds to a paid service. It will ask for your permission and clearly state the cost before doing anything.

> **AI:** "I can fetch the latest cryptocurrency trading signals for you. This action costs 0.10 USDC. Would you like me to proceed?"
>
> `[Yes, run "trading-signals"]` *(This appears as a clickable button)*

**Step 3: Authorize the Action**
Click the **"Yes, run..."** button. This tells the AI that you approve the action and the associated cost.

**Step 4: Receive Your Data**
The AI assistant will now securely handle the payment in the background and fetch the data for you. The final result is then displayed in the chat.

> **AI:** "✅ **Successfully fetched data from "trading-signals"**
>
> **Latest Trading Signals:**
> - 🟢 **BTC/USD**: BUY at 68500.50 (Confidence: 0.92)
> - 🔴 **ETH/USD**: SELL at 3500.75 (Confidence: 0.88)
>
> ---
> **Payment Details:**
> *Transaction Hash:* [0x123...abc](https://amoy.polygonscan.com/tx/0x123...abc)"

## 5. Available Commands

You can see a full list of available paid actions in the **Explore** tab. Here are the primary commands you can use, grouped by their data source.

---

### Live On-Chain Data Endpoints

These commands fetch real-time data directly from the Polygon blockchain.

#### NFT Metadata
-   **Description:** Retrieves detailed information about a specific NFT on the Polygon network.
-   **Command:** `run "nft-metadata" --contract_address <address> --token_id <id>`
-   **How to use:**
    1.  Ask the AI to "find an NFT".
    2.  The AI will ask for the contract address and token ID.
    3.  Provide the details, and the AI will then ask for final confirmation to run the command.

    **Sample Interaction:**
    > **You:** "Can you look up an NFT for me?"
    >
    > **AI:** "Yes, I can fetch NFT metadata for you. This costs 0.002 USDC. What is the contract address and token ID of the NFT?"
    >
    > **You:** "The contract is 0xabc... and the token is 123"
    >
    > **AI:** "Great. I will now fetch the metadata for that NFT. Please confirm."
    >
    > `[Yes, run "nft-metadata" --contract_address 0xabc... --token_id 123]`

#### Wallet Portfolio
-   **Description:** Fetches the ERC20 token portfolio for a wallet on the Polygon network.
-   **Command:** `run "wallet-balance" --address <address>`
-   **How to use:**
    -   To check your **own** wallet, just ask "what's in my wallet?" or "show me my portfolio".
    -   To check **another** wallet, ask "check the balance of 0x..." and provide the full address.

---

### Demonstration Endpoints

These commands use mock data to showcase a wider range of potential utilities for AI agents.

#### Trading Signals
-   **Description:** Provides the latest cryptocurrency trading signals.
-   **Command:** `run "trading-signals"`
-   **How to use:** Simply ask for "trading signals" or "market signals".

#### Documentation
-   **Description:** Accesses technical documentation about the service.
-   **Command:** `run "documentation"`
-   **How to use:** Ask for "documentation" or "the project docs".

---

Enjoy exploring the future of AI agents with xTag!
