"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Sidebar from "./Sidebar"
import Header from "./Header"
import ChatPane from "./ChatPane"
import ThemeToggle from "./ThemeToggle"
import { useAuth } from "../context/AuthContext"

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

  useEffect(() => {
    try {
      const media = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)")
      if (!media) return
      const listener = (e) => {
        const saved = localStorage.getItem("theme")
        if (!saved) setTheme(e.matches ? "dark" : "light")
      }
      media.addEventListener("change", listener)
      return () => media.removeEventListener("change", listener)
    } catch {}
  }, [])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem("sidebar-collapsed")
      return raw ? JSON.parse(raw) : { pinned: true, recent: false }
    } catch {
      return { pinned: true, recent: false }
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed))
    } catch {}
  }, [collapsed])

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar-collapsed-state")
      return saved ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed-state", JSON.stringify(sidebarCollapsed))
    } catch {}
  }, [sidebarCollapsed])

  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState("")
  const searchRef = useRef(null)
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingConvId, setThinkingConvId] = useState(null)

  useEffect(() => {
    const fetchConversations = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/conversations', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
          if (data.length > 0 && !selectedId) {
            setSelectedId(data[0].id);
          } else if (data.length === 0) {
            createNewChat();
          }
        }
      } catch (error) {
        console.error("Failed to fetch conversations", error);
      }
    };
    fetchConversations();
  }, [token]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault()
        createNewChat()
      }
      if (e.key === "Escape" && sidebarOpen) setSidebarOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sidebarOpen])

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations
    const q = query.toLowerCase()
    return conversations.filter((c) => c.title.toLowerCase().includes(q))
  }, [conversations, query])

  const pinned = filtered.filter((c) => c.pinned).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  const recent = filtered.filter((c) => !c.pinned).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))

  function togglePin(id) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))
  }

  function createNewChat() {
    const tempId = `temp-${Date.now()}`;
    const item = {
      id: tempId,
      title: "New Chat",
      updatedAt: new Date().toISOString(),
      messages: [],
      pinned: false,
    };
    setConversations((prev) => [item, ...prev]);
    setSelectedId(tempId);
    setSidebarOpen(false);
  }

  async function sendMessage(content) {
    if (!content.trim() || !token) return;

    const currentConvId = selectedId;
    const isNewChat = currentConvId.startsWith('temp-');

    const userMsg = { id: `temp-user-${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() };
    
    setConversations(prev =>
      prev.map(c => c.id !== currentConvId ? c : { ...c, messages: [...(c.messages || []), userMsg] })
    );

    setIsThinking(true);
    setThinkingConvId(currentConvId);

    try {
      const payload = {
        conversationId: isNewChat ? null : currentConvId,
        message: content,
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to send message');
      
      const data = await res.json();
      
      setConversations(prev =>
        prev.map(c => {
          if (c.id !== (isNewChat ? currentConvId : data.conversationId)) return c;
          
          const newMessages = [...(c.messages || []).filter(m => m.id !== userMsg.id), userMsg, data.message];

          return {
            ...c,
            id: data.conversationId,
            title: data.title,
            messages: newMessages,
            updatedAt: new Date().toISOString(),
          };
        })
      );
      
      if (isNewChat) {
        setSelectedId(data.conversationId);
      }

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMsg = { id: `temp-error-${Date.now()}`, role: "assistant", content: "Sorry, something went wrong.", createdAt: new Date().toISOString() };
      setConversations(prev =>
        prev.map(c => c.id !== currentConvId ? c : { ...c, messages: [...(c.messages || []), errorMsg] })
      );
    } finally {
      setIsThinking(false);
      setThinkingConvId(null);
    }
  }

  const selected = conversations.find((c) => c.id === selectedId) || null

  return (
    <div className="h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="md:hidden sticky top-0 z-40 flex items-center gap-2 border-b border-zinc-200/60 bg-white/80 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="ml-1 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-4 w-4 items-center justify-center">✱</span> AI Assistant
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
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          pinned={pinned}
          recent={recent}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          togglePin={togglePin}
          query={query}
          setQuery={setQuery}
          searchRef={searchRef}
          createNewChat={createNewChat}
        />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <Header createNewChat={createNewChat} sidebarCollapsed={sidebarCollapsed} setSidebarOpen={setSidebarOpen} />
          <ChatPane
            conversation={selected}
            onSend={(content) => sendMessage(content)}
            isThinking={isThinking && thinkingConvId === selected?.id}
            onPauseThinking={() => setIsThinking(false)}
          />
        </main>
      </div>
    </div>
  )
}