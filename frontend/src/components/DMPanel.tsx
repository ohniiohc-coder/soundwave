"use client";
import { useState, useEffect, useRef } from "react";
import { X, Pencil, ArrowLeft, Send, MessageCircle } from "lucide-react";
import { api, Conversation, DirectMessage, PublicUser } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useDMPanelStore } from "@/store/dmPanelStore";

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "방금";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전에 활동`;
  if (diffDays < 7) return d.toLocaleDateString("ko-KR", { weekday: "short" });
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

// ── Inbox View ──
function InboxView() {
  const { close, openChat, openNewMessage } = useDMPanelStore();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!user) return;
    api.getConversations().then(setConversations).catch(() => {});
    const interval = setInterval(
      () => api.getConversations().then(setConversations).catch(() => {}),
      10000
    );
    return () => clearInterval(interval);
  }, [user]);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <span className="text-[15px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
          메시지
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={openNewMessage}
            className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors text-muted hover:text-white"
            title="새 메시지"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={close}
            className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors text-muted hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
            <p className="text-sm text-muted">아직 대화가 없습니다.</p>
            <button
              onClick={openNewMessage}
              className="text-xs transition-colors hover:underline"
              style={{ color: "#c8ff00" }}
            >
              새 메시지 보내기
            </button>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.user.id}
              onClick={() => openChat(conv.user.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
            >
              <div className="relative flex-shrink-0">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-semibold select-none"
                  style={{
                    background: "#1e1e1e",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {initials(conv.user.display_name)}
                </div>
                {conv.user.is_online && (
                  <span
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                    style={{ background: "#4ade80", borderColor: "#111" }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p
                    className="text-[13px] truncate"
                    style={{
                      color: conv.unread_count > 0 ? "#fff" : "rgba(255,255,255,0.85)",
                      fontWeight: conv.unread_count > 0 ? 600 : 500,
                    }}
                  >
                    {conv.user.display_name}
                  </p>
                  {conv.last_message && (
                    <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {formatTime(conv.last_message.created_at)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="text-[12px] truncate"
                    style={{
                      color: conv.unread_count > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {conv.last_message
                      ? (conv.last_message.sender_id === user?.id ? "나: " : "") + conv.last_message.content
                      : "대화를 시작하세요"}
                  </p>
                  {conv.unread_count > 0 && (
                    <span
                      className="flex-shrink-0 flex items-center justify-center rounded-full text-[9px] font-bold min-w-[18px] h-[18px] px-1"
                      style={{ background: "#c8ff00", color: "#000" }}
                    >
                      {conv.unread_count > 99 ? "99+" : conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}

// ── New Message View ──
function NewMessageView() {
  const { close, goToInbox, openChat } = useDMPanelStore();
  const { user } = useAuthStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  const [selected, setSelected] = useState<PublicUser | null>(null);

  useEffect(() => {
    if (!user) return;
    api.getFollowing(user.id).then(setResults).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!query.trim()) {
      api.getFollowing(user.id).then(setResults).catch(() => {});
      return;
    }
    const timeout = setTimeout(() => {
      api.searchUsers(query).then(setResults).catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, user]);

  const handleStartChat = () => {
    if (!selected) return;
    openChat(selected.id);
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border flex-shrink-0">
        <button
          onClick={goToInbox}
          className="p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors text-muted hover:text-white"
        >
          <ArrowLeft size={16} />
        </button>
        <span
          className="flex-1 text-[14px] font-semibold text-center pr-8"
          style={{ color: "rgba(255,255,255,0.9)" }}
        >
          새 메시지
        </span>
        <button
          onClick={close}
          className="p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors text-muted hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <span className="text-[12px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>
          받는 사람:
        </span>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색..."
          className="flex-1 bg-transparent outline-none text-[13px]"
          style={{ color: "rgba(255,255,255,0.9)" }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {results.length > 0 && (
          <>
            <p
              className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {query.trim() ? "검색 결과" : "추천"}
            </p>
            {results.map((u) => {
              const isSelected = selected?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => setSelected((prev) => (prev?.id === u.id ? null : u))}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0"
                    style={{
                      background: "#1e1e1e",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    {initials(u.display_name)}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p
                      className="text-[13px] font-medium truncate"
                      style={{ color: "rgba(255,255,255,0.9)" }}
                    >
                      {u.display_name}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
                      @{u.username}
                    </p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                    style={{
                      borderColor: isSelected ? "#c8ff00" : "rgba(255,255,255,0.2)",
                      background: isSelected ? "#c8ff00" : "transparent",
                    }}
                  >
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="#000"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <button
          onClick={handleStartChat}
          disabled={!selected}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: "#c8ff00", color: "#000" }}
        >
          채팅 시작
        </button>
      </div>
    </>
  );
}

// ── Chat View ──
function ChatView({ userId }: { userId: string }) {
  const { close, goToInbox } = useDMPanelStore();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [partner, setPartner] = useState<PublicUser | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getPublicUser(userId).then(setPartner).catch(() => {});
    api.getMessages(userId).then(setMessages).catch(() => {});
    const interval = setInterval(
      () => api.getMessages(userId).then(setMessages).catch(() => {}),
      4000
    );
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      const msg = await api.sendMessage(userId, content);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      <div
        className="flex items-center gap-2 px-3 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <button
          onClick={goToInbox}
          className="p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors text-muted hover:text-white flex-shrink-0"
        >
          <ArrowLeft size={16} />
        </button>

        {partner ? (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold"
                style={{
                  background: "#1e1e1e",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                {initials(partner.display_name)}
              </div>
              {partner.is_online && (
                <span
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full border"
                  style={{ background: "#4ade80", borderColor: "#111" }}
                />
              )}
            </div>
            <div className="min-w-0">
              <p
                className="text-[13px] font-semibold truncate leading-tight"
                style={{ color: "rgba(255,255,255,0.9)" }}
              >
                {partner.display_name}
              </p>
              <p
                className="text-[10px] leading-tight"
                style={{ color: partner.is_online ? "#4ade80" : "rgba(255,255,255,0.3)" }}
              >
                {partner.is_online ? "활동 중" : `@${partner.username}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2 animate-pulse">
            <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: "#1e1e1e" }} />
            <div className="h-3.5 w-24 rounded" style={{ background: "#1e1e1e" }} />
          </div>
        )}

        <button
          onClick={close}
          className="p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors text-muted hover:text-white flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-0.5">
        {messages.length === 0 && (
          <div className="flex items-center justify-center flex-1">
            <p className="text-[12px] text-muted">첫 메시지를 보내보세요.</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === user?.id;
          const prevMsg = messages[i - 1];
          const showTime =
            !prevMsg ||
            new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() >
              5 * 60 * 1000;
          return (
            <div key={msg.id}>
              {showTime && (
                <div className="text-center my-3">
                  <span
                    className="text-[10px] px-2.5 py-1 rounded-full"
                    style={{
                      color: "rgba(255,255,255,0.2)",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              )}
              <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-0.5`}>
                <div
                  className="max-w-[75%] px-3 py-2 rounded-2xl text-[12px] leading-[1.55] break-words"
                  style={
                    isMine
                      ? { background: "#c8ff00", color: "#000", borderBottomRightRadius: 6 }
                      : {
                          background: "#1e1e1e",
                          color: "rgba(255,255,255,0.9)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderBottomLeftRadius: 6,
                        }
                  }
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div
        className="px-3 py-2.5 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="flex items-center gap-2 rounded-2xl px-3 py-2"
          style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="메시지 입력..."
            className="flex-1 bg-transparent outline-none text-[12px]"
            style={{ color: "rgba(255,255,255,0.9)" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-30"
            style={{ background: input.trim() ? "#c8ff00" : "rgba(255,255,255,0.06)" }}
          >
            <Send size={11} style={{ color: input.trim() ? "#000" : "rgba(255,255,255,0.3)" }} />
          </button>
        </div>
      </div>
    </>
  );
}

// ── Floating Trigger Button ──
function DMFloatingButton() {
  const { toggle, isOpen } = useDMPanelStore();
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.getUnreadCount().then((r) => setUnread(r.count)).catch(() => {});
    const interval = setInterval(
      () => api.getUnreadCount().then((r) => setUnread(r.count)).catch(() => {}),
      15000
    );
    return () => clearInterval(interval);
  }, [user]);

  if (!user || isOpen) return null;

  return (
    <button
      onClick={toggle}
      className="fixed z-[65] flex items-center gap-2 transition-all"
      style={{
        right: 16,
        bottom: 19,
        height: 44,
        paddingLeft: 14,
        paddingRight: 16,
        background: isOpen ? "#1e1e1e" : "rgba(20,20,20,0.95)",
        border: `1px solid ${isOpen ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: 22,
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        backdropFilter: "blur(12px)",
      }}
    >
      <MessageCircle
        size={18}
        style={{ color: isOpen ? "#c8ff00" : "rgba(255,255,255,0.7)", flexShrink: 0 }}
      />
      <span
        className="text-[13px] font-medium"
        style={{ color: isOpen ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)" }}
      >
        메시지
      </span>
      {unread > 0 && !isOpen && (
        <span
          className="flex items-center justify-center rounded-full text-[9px] font-bold min-w-[16px] h-4 px-1"
          style={{ background: "#c8ff00", color: "#000" }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

// ── Main Panel ──
export function DMPanel() {
  const { isOpen, view, selectedUserId } = useDMPanelStore();
  const { user } = useAuthStore();

  return (
    <>
      <DMFloatingButton />
      {isOpen && user && (
        <div
          className="fixed z-[70] flex flex-col overflow-hidden shadow-2xl"
          style={{
            right: 16,
            bottom: 19,
            width: 360,
            height: 520,
            background: "#111",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
          }}
        >
          {view === "inbox" && <InboxView />}
          {view === "new-message" && <NewMessageView />}
          {view === "chat" && selectedUserId && <ChatView userId={selectedUserId} />}
        </div>
      )}
    </>
  );
}
