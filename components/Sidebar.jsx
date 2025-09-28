"use client"
import { motion, AnimatePresence } from "framer-motion"
import {
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import ThemeToggle from "./ThemeToggle"
import { cls } from "./utils"
import { useAuth } from "../context/AuthContext"
import WalletInfo from "./WalletInfo"

export default function Sidebar({
  open,
  onClose,
  theme,
  setTheme,
  sidebarCollapsed = false,
  setSidebarCollapsed = () => {},
}) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed inset-y-0 left-0 z-50 flex h-full w-80 shrink-0 flex-col border-r border-zinc-200/60 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:hidden"
          >
            <div className="flex items-center gap-2 border-b border-zinc-200/60 px-3 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8">
                    <img src="/XtagLogoBK.png" alt="xTag Logo" className="h-8 w-8 dark:hidden" />
                    <img src="/XtagLogoWh.png" alt="xTag Logo" className="h-8 w-8 hidden dark:block" />
                </div>
                <div className="text-sm font-semibold tracking-tight">xTag</div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={onClose}
                  className="rounded-xl p-2 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800"
                  aria-label="Close sidebar"
                >
                  <PanelLeftClose className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {user && <WalletInfo collapsed={false} />}
            </div>
            <div className="border-t border-zinc-200/60 dark:border-zinc-800">
              <div className="flex items-center gap-2 px-3 py-3">
                <button onClick={logout} className="text-xs text-zinc-500 hover:underline dark:text-zinc-400">
                  Log out
                </button>
                <div className="ml-auto">
                  <ThemeToggle theme={theme} setTheme={setTheme} collapsed={false} />
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 80 : 320 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="z-50 hidden h-full shrink-0 flex-col overflow-hidden border-r border-zinc-200/60 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex"
      >
        <div className={cls("flex h-full flex-col", sidebarCollapsed ? "w-20" : "w-80")}>
          <div className="flex items-center gap-2 border-b border-zinc-200/60 px-3 py-3 dark:border-zinc-800">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={sidebarCollapsed ? "collapsed" : "expanded"}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex w-full items-center"
              >
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8">
                        <img src="/XtagLogoBK.png" alt="xTag Logo" className="h-8 w-8 dark:hidden" />
                        <img src="/XtagLogoWh.png" alt="xTag Logo" className="h-8 w-8 hidden dark:block" />
                    </div>
                    <div className="text-sm font-semibold tracking-tight">xTag</div>
                  </div>
                )}
                <div className={cls("ml-auto flex items-center gap-1", sidebarCollapsed && "w-full justify-center")}>
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="rounded-xl p-2 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800"
                    aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
                    title={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
                  >
                    {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {user && <WalletInfo collapsed={sidebarCollapsed} />}
          </div>

          <div className="border-t border-zinc-200/60 dark:border-zinc-800">
            <div className={cls("flex items-center gap-2 px-3 py-3", sidebarCollapsed && "justify-center")}>
              {!sidebarCollapsed && (
                <button onClick={logout} className="text-xs text-zinc-500 hover:underline dark:text-zinc-400">
                  Log out
                </button>
              )}
              <div className={cls(!sidebarCollapsed && "ml-auto")}>
                <ThemeToggle theme={theme} setTheme={setTheme} collapsed={sidebarCollapsed} />
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  )
}