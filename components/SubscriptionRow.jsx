"use client"

import { useState, useRef, useEffect } from "react"
import { Rss, MoreHorizontal, Edit3, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function SubscriptionRow({ subscription, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showMenu])

  const handleEdit = () => {
    onEdit?.(subscription)
    setShowMenu(false)
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete the subscription "${subscription.name}"?`)) {
      onDelete?.(subscription.id)
    }
    setShowMenu(false)
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
        <div className="flex items-center gap-2 flex-1 text-left min-w-0">
          <Rss className="h-4 w-4 text-zinc-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{subscription.name}</div>
            <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{subscription.description}</div>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-opacity"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 z-[100]"
              >
                <button
                  onClick={handleEdit}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}