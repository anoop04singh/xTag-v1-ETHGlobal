"use client"
import { MoreHorizontal, Menu } from "lucide-react"
import GhostIconButton from "./GhostIconButton"
import { cls } from "./utils"
import ThemeToggle from "./ThemeToggle"

export default function Header({ setSidebarOpen, view, setView, theme, setTheme }) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-zinc-200/60 bg-white/80 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
      {/* Mobile Header Content */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <img src="/XtagLogoBK.png" alt="xTag Logo" className="h-4 w-4 dark:hidden" />
          <img src="/XtagLogoWh.png" alt="xTag Logo" className="h-4 w-4 hidden dark:block" />
          xTag
        </div>
      </div>

      {/* Centered View Switcher */}
      <div className="flex-1 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            onClick={() => setView('chat')}
            className={cls(
              "rounded-md px-2 sm:px-3 py-1 text-sm font-medium transition-colors",
              view === 'chat' ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            )}
          >
            Chat
          </button>
          <button
            onClick={() => setView('explore')}
            className={cls(
              "rounded-md px-2 sm:px-3 py-1 text-sm font-medium transition-colors",
              view === 'explore' ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            )}
          >
            Explore
          </button>
          <button
            onClick={() => setView('about')}
            className={cls(
              "rounded-md px-2 sm:px-3 py-1 text-sm font-medium transition-colors",
              view === 'about' ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            )}
          >
            About
          </button>
        </div>
      </div>

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden md:block">
          <GhostIconButton label="More">
            <MoreHorizontal className="h-4 w-4" />
          </GhostIconButton>
        </div>
        <div className="md:hidden">
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </div>
    </div>
  )
}