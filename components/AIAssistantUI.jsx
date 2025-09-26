"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Calendar, LayoutGrid, MoreHorizontal } from "lucide-react"
import Sidebar from "./Sidebar"
import Header from "./Header"
import ChatPane from "./ChatPane"
import GhostIconButton from "./GhostIconButton"
import ThemeToggle from "./ThemeToggle"
import CreateSubscriptionModal from "./CreateSubscriptionModal"
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
      return raw ? JSON.parse(raw) : { pinned: true, recent: false, subscriptions: false, folders: true, templates: true }
    } catch {
      return { pinned: true, recent: false, subscriptions: false, folders: true, templates: true }
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
  const [templates, setTemplates] = useState([])
  const [folders, setFolders] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [showCreateSubscriptionModal, setShowCreateSubscriptionModal] = useState(false)

  const [query, setQuery] = useState("")
  const searchRef = useRef(null)

  const [isThinking, setIsThinking] = useState(false)
  const [thinkingConvId, setThinkingConvId] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        // Fetch conversations
        const convRes = await fetch('/api/conversations', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (convRes.ok) {
          const convData = await convRes.json();
          setConversations(convData);
          if (convData.length > 0 && !selectedId) {
            setSelectedId(convData[0].id);
          } else if (convData.length === 0) {
            createNewChat();
          }
        }
        // Fetch subscriptions
        const subRes = await fetch('/api/subscriptions', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscriptions(subData);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };
    fetchData();
  }, [token]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault()
        createNewChat()
      }
      if (!e.metaKey && !e.ctrlKey && e.key === "/") {
        const tag = document.activeElement?.tagName?.toLowerCase()
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault()
          searchRef.current?.focus()
        }
      }
      if (e.key === "Escape" && sidebarOpen) setSidebarOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sidebarOpen, conversations])

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations
    const q = query.toLowerCase()
    return conversations.filter((c) => c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q))
  }, [conversations, query])

  const pinned = filtered.filter((c) => c.pinned).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))

  const recent = filtered
    .filter((c) => !c.pinned)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 10)

  const folderCounts = React.useMemo(() => {
    const map = Object.fromEntries(folders.map((f) => [f.name, 0]))
    for (const c of conversations) if (map[c.folder] != null) map[c.folder] += 1
    return map
  }, [conversations, folders])

  function togglePin(id) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))
  }

  function createNewChat() {
    const tempId = `temp-${Math.random().toString(36).slice(2)}`;
    const item = {
      id: tempId,
      title: "New Chat",
      updatedAt: new Date().toISOString(),
      messages: [],
      preview: "Say hello to start...",
      pinned: false,
      folder: null,
    };
    setConversations((prev) => [item, ...prev]);
    setSelectedId(tempId);
    setSidebarOpen(false);
  }

  function createFolder() {
    const name = prompt("Folder name")
    if (!name) return
    if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase())) return alert("Folder already exists.")
    setFolders((prev) => [...prev, { id: Math.random().toString(36).slice(2), name }])
  }

  async function handleCreateSubscription(subscriptionData) {
    if (!token) return;
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subscriptionData),
      });
      if (res.ok) {
        const newSubscription = await res.json();
        setSubscriptions(prev => [newSubscription, ...prev]);
      } else {
        console.error("Failed to create subscription");
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
    }
  }

  async function sendMessage(convId, content) {
    if (!content.trim() || !token) return;

    const now = new Date().toISOString();
    const userMsg = { id: `temp-user-${Date.now()}`, role: "user", content, createdAt: now };
    
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== convId) return c;
        return { ...c, messages: [...(c.messages || []), userMsg] };
      })
    );

    setIsThinking(true);
    setThinkingConvId(convId);

    try {
      const isNewChat = convId.startsWith('temp-');
      const payload = {
        conversationId: isNewChat ? null : convId,
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

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      const data = await res.json();
      const assistantMessage = data.message;

      setConversations(prev =>
        prev.map(c => {
          if (c.id !== convId) return c;
          
          const finalMessages = c.messages.filter(m => !m.id.startsWith('temp-user-'));
          finalMessages.push(userMsg, assistantMessage);

          if (data.isNewConversation) {
            return {
              ...c,
              id: data.conversationId,
              title: data.title,
              messages: [...c.messages, assistantMessage],
              updatedAt: new Date().toISOString(),
            };
          } else {
            return { ...c, messages: [...c.messages, assistantMessage], updatedAt: new Date().toISOString() };
          }
        }).map(c => data.isNewConversation && c.id === convId ? {...c, id: data.conversationId, title: data.title} : c)
      );
      
      if (data.isNewConversation) {
        setSelectedId(data.conversationId);
      }

    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsThinking(false);
      setThinkingConvId(null);
    }
  }

  function editMessage(convId, messageId, newContent) {
    console.log("Editing is not yet supported with the backend.");
  }

  function resendMessage(convId, messageId) {
    console.log("Resending is not yet supported with the backend.");
  }

  function pauseThinking() {
    setIsThinking(false)
    setThinkingConvId(null)
  }

  function handleUseTemplate(template) {
    if (composerRef.current) {
      composerRef.current.insertTemplate(template.content)
    }
  }

  const composerRef = useRef(null)
  const selected = conversations.find((c) => c.id === selectedId) || null

  return (
    <div className="h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="md:hidden sticky top-0 z-40 flex items-center gap-2 border-b border-zinc-200/60 bg-white/80 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="ml-1 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-4 w-4 items-center justify-center">✱</span> AI Assistant
        </div>
        <div className="ml-auto flex items-center gap-2">
          <GhostIconButton label="Schedule">
            <Calendar className="h-4 w-4" />
          </GhostIconButton>
          <GhostIconButton label="Apps">
            <LayoutGrid className="h-4 w-4" />
          </GhostIconButton>
          <GhostIconButton label="More">
            <MoreHorizontal className="h-4 w-4" />
          </GhostIconButton>
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
          conversations={conversations}
          pinned={pinned}
          recent={recent}
          folders={folders}
          folderCounts={folderCounts}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          togglePin={togglePin}
          query={query}
          setQuery={setQuery}
          searchRef={searchRef}
          createFolder={createFolder}
          createNewChat={createNewChat}
          templates={templates}
          setTemplates={setTemplates}
          onUseTemplate={handleUseTemplate}
          subscriptions={subscriptions}
          onShowCreateSubscription={() => setShowCreateSubscriptionModal(true)}
        />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <Header createNewChat={createNewChat} sidebarCollapsed={sidebarCollapsed} setSidebarOpen={setSidebarOpen} />
          <ChatPane
            ref={composerRef}
            conversation={selected}
            onSend={(content) => selected && sendMessage(selected.id, content)}
            onEditMessage={(messageId, newContent) => selected && editMessage(selected.id, messageId, newContent)}
            onResendMessage={(messageId) => selected && resendMessage(selected.id, messageId)}
            isThinking={isThinking && thinkingConvId === selected?.id}
            onPauseThinking={pauseThinking}
          />
        </main>
      </div>
      <CreateSubscriptionModal
        isOpen={showCreateSubscriptionModal}
        onClose={() => setShowCreateSubscriptionModal(false)}
        onCreateSubscription={handleCreateSubscription}
      />
    </div>
  )
}