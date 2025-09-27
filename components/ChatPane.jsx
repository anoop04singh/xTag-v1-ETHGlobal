"use client"

import { useState } from "react"
import { Square } from "lucide-react"
import Message from "./Message"
import Composer from "./Composer"

function ThinkingMessage({ onPause }) {
  return (
    <Message role="assistant">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></div>
        </div>
        <span className="text-sm text-zinc-500">AI is thinking...</span>
        <button
          onClick={onPause}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Square className="h-3 w-3" /> Pause
        </button>
      </div>
    </Message>
  )
}

export default function ChatPane({ messages = [], onSend, isThinking, onPauseThinking }) {
  const [busy, setBusy] = useState(false)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-8">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center">
              <div className="h-16 w-16 mb-4 mx-auto">
                <img src="/XtagLogoBK.png" alt="xTag Logo" className="h-16 w-16 dark:hidden" />
                <img src="/XtagLogoWh.png" alt="xTag Logo" className="h-16 w-16 hidden dark:block" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">How can I help you today?</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Try the command <code className="font-mono bg-zinc-100 dark:bg-zinc-800 rounded px-1 py-0.5">run "get-data"</code> to test the payment flow.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <Message role={m.role}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </Message>
              </div>
            ))}
            {isThinking && <ThinkingMessage onPause={onPauseThinking} />}
          </>
        )}
      </div>

      <Composer
        onSend={async (text) => {
          if (!text.trim()) return
          setBusy(true)
          await onSend?.(text)
          setBusy(false)
        }}
        busy={busy}
      />
    </div>
  )
}