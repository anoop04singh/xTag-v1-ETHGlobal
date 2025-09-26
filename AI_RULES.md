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