import { cls } from "./utils"
import ActionConfirmation from "./ActionConfirmation";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Message({ role, children, actionCommand, onActionConfirm }) {
  const isUser = role === "user";
  const isStringContent = typeof children === 'string';

  return (
    <div className={cls("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
          AI
        </div>
      )}
      <div
        className={cls(
          "max-w-[80%] rounded-2xl px-3 py-2 shadow-sm",
          isUser
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800",
          isStringContent && "prose prose-sm dark:prose-invert whitespace-pre-wrap",
          isUser && isStringContent && "prose-p:text-white dark:prose-p:text-zinc-900"
        )}
      >
        {isStringContent ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {children}
          </ReactMarkdown>
        ) : (
          children
        )}
        {actionCommand && role === 'assistant' && (
          <ActionConfirmation command={actionCommand} onConfirm={onActionConfirm} />
        )}
      </div>
      {isUser && (
        <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
          JD
        </div>
      )}
    </div>
  )
}