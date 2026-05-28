"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, Conversation, DirectMessage, PublicUser } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Send, ArrowLeft } from "lucide-react";

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays < 7) return d.toLocaleDateString("ko-KR", { weekday: "short" });
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function MessagesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = searchParams.get("with");
  const { user: currentUser, initialized } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<PublicUser | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!currentUser) { router.replace("/login"); return; }
  }, [initialized, currentUser]);

  const fetchConversations = useCallback(async () => {
    try {
      const list = await api.getConversations();
      setConversations(list);
    } catch {}
  }, []);

  const fetchMessages = useCallback(async (userId: string) => {
    try {
      const msgs = await api.getMessages(userId);
      setMessages(msgs);
    } catch {}
  }, []);

  // 대화 목록 로드 + 10초 폴링
  useEffect(() => {
    if (!currentUser) return;
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [currentUser, fetchConversations]);

  // 선택한 유저 변경 시 메시지 + 프로필 로드
  useEffect(() => {
    if (!selectedUserId || !currentUser) return;
    setMessages([]);
    setPartnerProfile(null);

    api.getPublicUser(selectedUserId).then(setPartnerProfile).catch(() => {});
    fetchMessages(selectedUserId);

    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => fetchMessages(selectedUserId), 4000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [selectedUserId, currentUser, fetchMessages]);

  // 새 메시지 올 때마다 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!selectedUserId || !input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      const msg = await api.sendMessage(selectedUserId, content);
      setMessages((prev) => [...prev, msg]);
      fetchConversations();
    } catch {
      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (!initialized || !currentUser) return null;

  const initials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#0a0a0a" }}>

      {/* ── 대화 목록 ── */}
      <div
        className={`flex flex-col border-r border-border ${selectedUserId ? "hidden md:flex" : "flex"}`}
        style={{ width: 280, minWidth: 280, background: "#0a0a0a" }}
      >
        <div className="px-5 py-5 border-b border-border flex-shrink-0">
          <h2
            className="text-[18px] font-semibold"
            style={{ color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}
          >
            메시지
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 px-6 text-center">
              <p className="text-sm text-muted">아직 대화가 없습니다.</p>
              <Link href="/people" className="text-xs text-accent hover:underline">사람 찾기</Link>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.user.id === selectedUserId;
              return (
                <button
                  key={conv.user.id}
                  onClick={() => router.push(`/messages?with=${conv.user.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                  style={{
                    background: isSelected ? "rgba(255,255,255,0.05)" : "transparent",
                    borderLeft: isSelected ? "2px solid #c8ff00" : "2px solid transparent",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-semibold select-none"
                    style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
                  >
                    {initials(conv.user.display_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-[13px] font-medium truncate" style={{ color: "rgba(255,255,255,0.9)" }}>
                        {conv.user.display_name}
                      </p>
                      {conv.last_message && (
                        <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
                          {formatTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {conv.last_message
                          ? (conv.last_message.sender_id === currentUser.id ? "나: " : "") + conv.last_message.content
                          : "대화를 시작하세요"}
                      </p>
                      {conv.unread_count > 0 && (
                        <span
                          className="flex-shrink-0 flex items-center justify-center rounded-full text-[9px] font-semibold min-w-[16px] h-4 px-1"
                          style={{ background: "#c8ff00", color: "#000" }}
                        >
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── 메시지 스레드 ── */}
      {selectedUserId ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0" style={{ background: "#0a0a0a" }}>
            <button
              onClick={() => router.push("/messages")}
              className="md:hidden p-1.5 rounded-lg text-muted hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            {partnerProfile ? (
              <>
                <div
                  className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-semibold select-none"
                  style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
                >
                  {initials(partnerProfile.display_name)}
                </div>
                <Link href={`/users/${partnerProfile.id}`} className="hover:underline min-w-0">
                  <p className="text-[14px] font-medium truncate" style={{ color: "rgba(255,255,255,0.9)" }}>
                    {partnerProfile.display_name}
                  </p>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>@{partnerProfile.username}</p>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full" style={{ background: "#1a1a1a" }} />
                <div className="h-4 w-28 rounded" style={{ background: "#1a1a1a" }} />
              </div>
            )}
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1">
            {messages.length === 0 && (
              <div className="flex items-center justify-center flex-1">
                <p className="text-sm text-muted">첫 메시지를 보내보세요.</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === currentUser.id;
              const prevMsg = messages[i - 1];
              const showTime = !prevMsg || new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000;
              return (
                <div key={msg.id}>
                  {showTime && (
                    <div className="text-center my-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)" }}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-0.5`}>
                    <div
                      className="max-w-[70%] px-3.5 py-2 rounded-2xl text-[13px] leading-[1.5] break-words"
                      style={isMine ? {
                        background: "#c8ff00",
                        color: "#000",
                        borderBottomRightRadius: 6,
                      } : {
                        background: "#1a1a1a",
                        color: "rgba(255,255,255,0.9)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderBottomLeftRadius: 6,
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력창 */}
          <div className="px-4 py-3 border-t border-border flex-shrink-0" style={{ background: "#0a0a0a" }}>
            <div className="flex items-end gap-2 rounded-2xl border border-border px-4 py-2.5" style={{ background: "#111" }}>
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="메시지 입력..."
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.9)", maxHeight: 120 }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: input.trim() ? "#c8ff00" : "transparent", border: input.trim() ? "none" : "1px solid rgba(255,255,255,0.1)" }}
              >
                <Send size={13} style={{ color: input.trim() ? "#000" : "rgba(255,255,255,0.3)" }} />
              </button>
            </div>
            <p className="text-[10px] mt-1.5 text-center" style={{ color: "rgba(255,255,255,0.15)" }}>
              Enter로 전송 · Shift+Enter로 줄바꿈
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center flex-col gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Send size={22} style={{ color: "rgba(255,255,255,0.15)" }} />
          </div>
          <p className="text-sm text-muted">대화를 선택하세요</p>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesInner />
    </Suspense>
  );
}
