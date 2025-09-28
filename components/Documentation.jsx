"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CodeBlock = ({ children }) => (
  <pre className="bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-lg text-xs text-left overflow-x-auto">
    <code className="font-mono">{children}</code>
  </pre>
);

export default function Documentation() {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
            <div className="inline-block h-24 w-24 mb-6">
                <img src="/XtagLogoBK.png" alt="xTag Logo" className="h-24 w-24 dark:hidden" />
                <img src="/XtagLogoWh.png" alt="xTag Logo" className="h-24 w-24 hidden dark:block" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">xTag Project Documentation</h1>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">
                An AI-native interface for a 402-enabled world.
            </p>
        </div>

        <section>
          <h2>1. Project Overview</h2>
          <p>
            xTag is a proof-of-concept AI assistant that demonstrates how Large Language Models (LLMs) can be transformed into truly autonomous agents capable of interacting with paid, on-chain resources. It provides a natural language interface for users to perform complex actions that require micropayments, abstracting away the complexities of blockchain transactions.
          </p>
          <p>
            The core innovation lies in its ability to understand a user's intent, identify a corresponding paid API endpoint, seek confirmation, and execute a payment-enabled request—all within a simple chat interface. This is powered by the <strong>x402 protocol</strong>, which standardizes programmatic payments for API access.
          </p>
        </section>

        <section>
          <h2>2. How xTag Enhances AI Agents</h2>
          <p>
            Traditional AI assistants are limited to free, public data sources. They cannot access premium data, execute transactions, or interact with services that require payment. This severely limits their "agentic" capabilities—their ability to act autonomously on a user's behalf.
          </p>
          <p>
            xTag solves this by integrating a crypto wallet directly with the AI agent, governed by the x402 protocol. This enhancement provides several key benefits:
          </p>
          <ul>
            <li><strong>Economic Capability:</strong> The agent can now pay for the resources it needs to fulfill a user's request, unlocking access to high-quality, proprietary data and services.</li>
            <li><strong>True Autonomy:</strong> With the ability to transact, the agent moves beyond being a simple information retriever to become a genuine actor in the digital economy. It can book services, purchase data, or trigger on-chain events.</li>
            <li><strong>Seamless User Experience:</strong> The user interacts via natural language, while the agent handles the entire backend process of API negotiation, payment, and data retrieval. The complexity of private keys, gas fees, and transaction signing is completely hidden.</li>
          </ul>
        </section>

        <section>
          <h2>3. Architectural Diagram</h2>
          <p>The xTag ecosystem is composed of three main parts: the User Interface (this application), the xTag Backend, and the external Paid Resource Server.</p>
          <CodeBlock>
{`
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

`}
          </CodeBlock>
        </section>

        <section>
          <h2>4. Core Features Explained</h2>
          <Card className="not-prose">
            <CardHeader>
              <CardTitle>NFC-Based Authentication & Wallet Creation</CardTitle>
            </CardHeader>
            <CardContent>
              <p>xTag uses NFC tags as a physical authenticator. On first tap, the system:</p>
              <ol>
                <li>Generates a new EOA (Externally Owned Account) wallet.</li>
                <li>Encrypts and stores the private key, associating it with the unique NFC ID.</li>
                <li>Creates a user record in the database.</li>
                <li>Issues a JWT for session management.</li>
              </ol>
              <p>This process provides a seamless, passwordless onboarding experience while automatically provisioning each user with a dedicated wallet for the AI agent to use.</p>
            </CardContent>
          </Card>
          <Card className="not-prose mt-4">
            <CardHeader>
              <CardTitle>The Paid Resource Server</CardTitle>
            </CardHeader>
            <CardContent>
              <p>A separate, external server hosts the paid API endpoints. This server is responsible for:</p>
              <ul>
                <li>Protecting resources behind a 402 Payment Required wall.</li>
                <li>Issuing challenges (pricing, recipient address, etc.) to unauthorized clients.</li>
                <li>Verifying on-chain payments.</li>
                <li>Granting access to the resource upon successful payment.</li>
              </ul>
              <p>In this demo, the server is hosted at <Badge variant="secondary">https://x402-server-updated.vercel.app</Badge>.</p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2>5. The x402 Request Flow (Sequence Diagram)</h2>
          <p>When a user confirms an action that requires a paid resource, the following sequence is initiated by the xTag backend.</p>
          <CodeBlock>
{`
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
`}
          </CodeBlock>
          <p>The <Badge variant="outline">x402-axios</Badge> library automatically handles steps 2 through 5, making the integration trivial for the developer. The library intercepts the `402` response, handles the on-chain payment, and retries the original request with the required payment proof.</p>
        </section>

        <section>
          <h2>6. API Payloads & Responses</h2>
          
          <h3>Chat Endpoint: <code>/api/chat</code></h3>
          <p>This is the main endpoint for user interaction.</p>
          <p><strong>Request Payload:</strong></p>
          <CodeBlock>{`{ "message": "Can you get me the latest trading signals?" }`}</CodeBlock>
          <p><strong>AI Response (Permission Seeking):</strong></p>
          <CodeBlock>{`{
  "role": "assistant",
  "content": "I can fetch the latest cryptocurrency trading signals for you. This action costs 0.10 USDC. Would you like me to proceed? [DYAD_ACTION:run \\"trading-signals\\"]"
}`}</CodeBlock>
          <p><strong>User Confirmation (sent back to chat):</strong></p>
          <CodeBlock>{`{ "message": "run \\"trading-signals\\"" }`}</CodeBlock>
          <p><strong>Final API Response (After successful x402 call):</strong></p>
          <CodeBlock>{`{
  "role": "assistant",
  "content": "✅ **Successfully fetched data from \\"trading-signals\\"**\\n\\n**Latest Trading Signals:**\\n- 🟢 **BTC/USD**: BUY at 68500.50 (Confidence: 0.92)\\n- 🔴 **ETH/USD**: SELL at 3500.75 (Confidence: 0.88)\\n\\n---\\n**Payment Details:**\\n*Transaction Hash:* [0x123...abc](https://amoy.polygonscan.com/tx/0x123...abc)"
}`}</CodeBlock>
        </section>
      </div>
    </div>
  );
}