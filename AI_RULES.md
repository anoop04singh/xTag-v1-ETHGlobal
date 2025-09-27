# AI Development Rules

This document outlines the tech stack and coding conventions for this web application. Following these rules ensures consistency, maintainability, and simplicity in the codebase.

## Tech Stack

This is a modern web application built with the following technologies:

-   **Framework**: [Next.js](https://nextjs.org/) (using the App Router) with React.
-   **Language**: [TypeScript](https://www.typescriptlang.org/) for type safety.
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for all styling, following a utility-first approach.
-   **UI Components**: A combination of [shadcn/ui](https://ui.shadcn.com/) and Radix UI primitives.
-   **Icons**: [Lucide React](https://lucide.dev/) for a consistent and clean icon set.
-   **State Management**: Primarily React's built-in hooks (`useState`, `useEffect`, `useContext`).
-   **Animations**: [Framer Motion](https://www.framer.com/motion/) for all UI animations and transitions.
-   **Forms**: [React Hook Form](https://react-hook-form.com/) for form state management, paired with [Zod](https://zod.dev/) for schema validation.
-   **Fonts**: [Geist](https://vercel.com/font) for clean and modern typography.

## Library Usage Rules

To maintain a clean and predictable codebase, please adhere to the following library-specific rules.

### 1. UI Components (shadcn/ui)

-   **Primary Source**: Always use components from `shadcn/ui` (`@/components/ui`) as the first choice for any UI element (e.g., `Button`, `Card`, `Dialog`, `Input`).
-   **No Direct Edits**: Do **not** modify the files within the `components/ui` directory. These are considered vendor files.
-   **Customization**: If you need a customized version of a shadcn/ui component, create a new component in the `components` directory that wraps and extends the base component.

### 2. Styling (Tailwind CSS)

-   **Utility-First**: All styling must be done with Tailwind CSS utility classes. Avoid writing custom CSS in separate files.
-   **`globals.css`**: Only use `app/globals.css` for defining base styles, Tailwind layers (`@tailwind base`), and CSS variables for the theme.
-   **Class Merging**: When conditionally applying classes, always use the `cn` utility function from `lib/utils.ts` to correctly merge Tailwind classes.

### 3. Icons (Lucide React)

-   **Single Source**: All icons must come from the `lucide-react` package. This ensures visual consistency across the application.

### 4. State Management (React Hooks)

-   **Keep it Simple**: For local component state, use `useState` and `useReducer`.
-   **Shared State**: For state that needs to be shared between a few components, lift the state up to the nearest common ancestor or use React Context.
-   **Avoid Over-engineering**: Do not introduce complex global state management libraries (like Redux or Zustand) unless the application's complexity absolutely requires it.

### 5. Animations (Framer Motion)

-   **Consistency**: Use `framer-motion` for all animations, transitions, and micro-interactions. This includes page transitions, modal animations, and list animations.

### 6. Forms (React Hook Form + Zod)

-   **Form Logic**: Use `react-hook-form` to manage form state, validation, and submissions.
-   **Validation**: Define validation schemas using `zod`. This provides robust, type-safe validation.

### 7. Modals, Popovers, and Toasts

-   **Modals/Dialogs**: Use the `Dialog` or `AlertDialog` components from `shadcn/ui`.
-   **Popovers**: Use the `Popover` component from `shadcn/ui`.
-   **Notifications**: Use `sonner` for all toast notifications to provide feedback to the user.

### 8. Server-Side & Blockchain Architecture

-   **Server-Managed Wallets**: User wallets are Biconomy smart contract accounts. They are created and managed exclusively on the server. **Private keys must never be sent to or stored on the client.** All private keys must be encrypted at rest in the database using the server's `ENCRYPTION_SECRET`.
-   **x402 Payment Protocol**: All paid resources (e.g., Subscriptions) **must** be protected by the `x402` protocol. The flow is non-negotiable:
    1.  The client requests a resource.
    2.  The server checks for ownership. If the user does not own it, the server **must** respond with a `402 Payment Required` status and the necessary payment details.
    3.  A client-side library (`x402-fetch`) handles the on-chain transaction.
    4.  The client retries the request with proof of payment to gain access.
-   **Authentication**: All authenticated API endpoints must be protected. Authentication is handled via JWTs, which are issued by the server upon successful login (e.g., via NFC ID) and included in the `Authorization: Bearer <token>` header of every subsequent request.
-   **Separation of Concerns**: The AI's role is strictly conversational. It may guide users on *how* to trigger a paid action (e.g., "use the command `run \"...\"`"), but it **must not** be involved in the transactional logic of checking balances, confirming payments, or granting access. This logic belongs exclusively to the backend server.