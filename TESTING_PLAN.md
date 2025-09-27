# Manual Testing Plan

This document provides a step-by-step guide to manually test the critical features of the AI Assistant application. You will need to have the application running with the live preview and access to the server logs to complete these tests.

---

## 1. User Signup & Wallet Creation

**Objective**: Verify that a new user can sign up with an NFC ID and that a smart wallet is correctly provisioned for them on the server.

**Steps**:
1.  Navigate to the `/login` page in the application preview.
2.  Enter a **new, unique** NFC ID that has never been used before (e.g., `creator-01`).
3.  Click "Continue".
4.  **Expected Result**: You should be redirected to the main chat interface.
5.  **Verification**:
    *   Check the server logs for the following messages in order:
        *   `New user detected. Creating smart account...`
        *   `[WALLET] New signer generated.`
        *   `[WALLET] Smart account address generated: 0x...`
        *   A `prisma:query` that inserts a new `User` into the database.
    *   In the UI, check the "My Wallet" section in the sidebar. It should display the new smart account address.

---

## 2. User Login

**Objective**: Verify that an existing user can log in successfully.

**Steps**:
1.  In the UI, click "Log out" from the sidebar.
2.  You will be redirected to the `/login` page.
3.  Enter the **same NFC ID** you used in the signup test (e.g., `creator-01`).
4.  Click "Continue".
5.  **Expected Result**: You should be logged in and redirected to the main chat interface.
6.  **Verification**:
    *   Check the server logs for a message like: `Login successful`.
    *   The wallet address displayed in the sidebar should be the same as the one created during signup.

---

## 3. Subscription Creation

**Objective**: Verify that a logged-in user can create a new subscription.

**Steps**:
1.  Ensure you are logged in as the `creator-01` user.
2.  In the sidebar, expand the "SUBSCRIPTIONS" section.
3.  Click "Create subscription".
4.  Fill out the modal with the following details:
    *   **Name**: `Test News Feed`
    *   **Description**: `Daily updates on tech news.`
    *   **Price (USDC)**: `0.01`
    *   **Agent Prompt**: `Provide a summary of the top 3 tech news stories from today.`
5.  Click "Create Subscription".
6.  **Expected Result**: The modal should close, and the "Test News Feed" should appear in the subscriptions list.
7.  **Verification**:
    *   Check the server logs for a `prisma:query` that inserts a new `Subscription` into the database.
    *   The new subscription should be visible in the sidebar with the correct price. Since you are the creator, it should also show as "Owned".

---

## 4. The x402 On-Chain Payment Flow

**Objective**: Verify that a second user can successfully purchase a subscription from the first user via an on-chain transaction.

**Prerequisites**:
*   You will need a second, distinct user.
*   The second user's wallet must be funded with testnet MATIC (for gas) and USDC on the Polygon Amoy network. You can get these from a public faucet like the [Polygon Faucet](https://faucet.polygon.technology/).

**Steps**:
1.  **Create Buyer Account**: Log out from the `creator-01` account. Sign up with a **new NFC ID** (e.g., `buyer-01`). Note the new smart wallet address for this user.
2.  **Fund Buyer Wallet**: Send at least 0.02 MATIC and 0.02 USDC to the `buyer-01`'s smart wallet address.
3.  **Initiate Purchase**: While logged in as `buyer-01`, type the following command into the chat composer and send it: `run "Test News Feed"`
4.  **Monitor Logs**: This is the most important step. Watch the server logs closely.
5.  **Expected Result**: After a few moments (on-chain transactions can take time), you should receive a message in the chat confirming the payment was successful, followed by the premium content (the summary of tech news).
6.  **Verification**:
    *   **Logs**: Look for the complete x402 flow in the logs:
        *   `[CHAT API] Detected 'run' command...`
        *   `[x402] Initiating paid request...`
        *   `[ACCESS API] Access denied... Returning 402 Payment Required.`
        *   `[x402] SUCCESS: On-chain transaction confirmed. Tx Hash: 0x...`
        *   `[CHAT API] New purchase detected. Creating DB record...`
        *   `[CHAT API] Prepending successful payment message to response.`
    *   **Database**: A new record should exist in the `Purchase` table linking `buyer-01` to the "Test News Feed" subscription.
    *   **UI**: The "Test News Feed" subscription in the sidebar should now show as "Owned" for the `buyer-01` user.
    *   **Wallet Balance**: If you refresh the wallet info for `buyer-01`, their USDC balance should have decreased by 0.01.