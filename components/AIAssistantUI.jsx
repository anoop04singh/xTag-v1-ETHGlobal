"use client"

import React, { useEffect, useState } from "react"
import Sidebar from "./Sidebar"
import Header from "./Header"
import ChatPane from "./ChatPane"
import ThemeToggle from "./ThemeToggle"
import { useAuth } from "../context/AuthContext"
import ExplorePane from "./ExplorePane"

export default function AIAssistantUI() {
  const { token } = useAuth();
  const [theme, setTheme] = useState(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("theme")
    if (saved) return saved
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      return "dark"
    return "light"
  })

  useEffect(() => {
    try {
      if (theme === "dark") document.documentElement.classList.add("dark")
      else document.documentElement.classList.remove("dark")
      document.documentElement.setAttribute("data-theme", theme)
      document.documentElement.style.colorScheme = theme
      localStorage.setItem("theme", theme)
    } catch {}
  }, [theme])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)
  const [view, setView] = useState('chat');

  async function sendMessage(content) {
    if (!content.trim() || !token) return;

    const userMsg = { id: `user-${Date.now()}`, role: "user", content };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: content }),
      });

      if (!res.ok) throw new Error('Failed to send message');
      
      const data = await res.json();
      const assistantMsg = { id: `assistant-${Date.now()}`, role: data.role, content: data.content };
      setMessages(prev => [...prev, assistantMsg]);

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMsg = { id: `error-${Date.now()}`, role: "assistant", content: "Sorry, something went wrong." };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <div className="h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="md:hidden sticky top-0 z-40 flex items-center gap-2 border-b border-zinc-200/60 bg-white/80 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="ml-1 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <img src="/XtagLogoBK.png" alt="xTag Logo" className="h-4 w-4 dark:hidden" />
          <img src="/XtagLogoWh.png" alt="xTag Logo" className="h-4 w-4 hidden dark:block" />
          xTag
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </div>

      <div className="mx-auto flex h-[calc(100vh-0px)] max-w-[1400px]">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
          setTheme={setTheme}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <Header 
            sidebarCollapsed={sidebarCollapsed} 
            setSidebarOpen={setSidebarOpen}
            view={view}
            setView={setView}
          />
          {view === 'chat' ? (
            <ChatPane
              messages={messages}
              onSend={sendMessage}
              isThinking={isThinking}
              onPauseThinking={() => setIsThinking(false)}
            />
          ) : (
            <ExplorePane />
          )}
        </main>
      </div>
    </div>
  )
}