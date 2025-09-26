"use client"
import { motion, AnimatePresence } from "framer-motion"
import { X, Lightbulb } from "lucide-react"
import { useState, useEffect } from "react"

export default function CreateSubscriptionModal({ isOpen, onClose, onCreateSubscription, editingSubscription = null }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [prompt, setPrompt] = useState("")

  const isEditing = !!editingSubscription

  useEffect(() => {
    if (isOpen) {
      if (editingSubscription) {
        setName(editingSubscription.name || "")
        setDescription(editingSubscription.description || "")
        setPrompt(editingSubscription.prompt || "")
      } else {
        setName("")
        setDescription("")
        setPrompt("")
      }
    }
  }, [editingSubscription, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim() && description.trim() && prompt.trim()) {
      const subscriptionData = { name: name.trim(), description: description.trim(), prompt: prompt.trim() }
      
      if (isEditing) {
        onCreateSubscription({ ...subscriptionData, id: editingSubscription.id })
      } else {
        onCreateSubscription(subscriptionData)
      }
      onClose()
    }
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={handleCancel}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{isEditing ? "Edit Subscription" : "Create Subscription"}</h2>
                <button onClick={handleCancel} className="rounded-lg p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2">
                <div>
                  <label htmlFor="subName" className="block text-sm font-medium mb-2">
                    Subscription Name
                  </label>
                  <input
                    id="subName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g. Daily Tech News, Weekly Market Summary"
                    className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="subDesc" className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <input
                    id="subDesc"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A short description of what this subscription provides."
                    className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label htmlFor="subPrompt" className="block text-sm font-medium mb-2">
                    Agent Prompt
                  </label>
                  <textarea
                    id="subPrompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="The detailed prompt for the AI agent to execute for this subscription."
                    rows={6}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 resize-none"
                  />
                </div>

                <div className="flex items-start gap-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                  <Lightbulb className="h-5 w-5 text-zinc-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="font-medium mb-1">How do Subscriptions work?</div>
                    <div>
                      Subscriptions are public prompts that anyone can ask the agent about. The agent will use the prompt you provide here to generate content when requested.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || !description.trim() || !prompt.trim()}
                    className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                  >
                    {isEditing ? "Update Subscription" : "Create Subscription"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}