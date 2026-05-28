"use client";
import { useState, useRef } from "react";
import { Upload, CheckCircle2, XCircle, Music2, Loader2, Home } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

type UploadStatus = {
  file: string;
  status: "uploading" | "success" | "error";
  message?: string;
};

export default function UploadPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [statuses, setStatuses] = useState<UploadStatus[]>([]);
  const [dragging, setDragging] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted">
        <p className="text-sm">관리자 계정으로 로그인해야 합니다.</p>
        <button
          onClick={() => router.push("/login")}
          className="px-4 py-2 bg-accent rounded-full text-black text-sm font-semibold hover:bg-accent-light transition-colors"
        >
          로그인
        </button>
      </div>
    );
  }

  const uploadFiles = async (files: File[]) => {
    const newStatuses: UploadStatus[] = files.map((f) => ({
      file: f.name,
      status: "uploading",
    }));
    setStatuses((prev) => [...newStatuses, ...prev]);

    let newSuccess = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await api.uploadMusic(file);
        newSuccess++;
        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: "success", message: "업로드 완료" } : s
          )
        );
      } catch (e: any) {
        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: "error", message: e.message } : s
          )
        );
      }
    }

    if (newSuccess > 0) setSuccessCount((c) => c + newSuccess);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ["audio/mpeg", "audio/flac", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/ogg"].includes(f.type)
    );
    if (files.length) uploadFiles(files);
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">음악 업로드</h1>
        <p className="text-muted text-sm mt-1">MP3, FLAC, M4A, WAV, OGG 형식을 지원합니다.</p>
      </div>

      {/* 드래그 앤 드롭 영역 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors
          ${dragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50 hover:bg-bg-panel"}
        `}
      >
        <div className={`p-4 rounded-full ${dragging ? "bg-accent/20" : "bg-bg-elevated"}`}>
          <Music2 size={28} className={dragging ? "text-accent" : "text-muted"} />
        </div>
        <div className="text-center">
          <p className="font-medium">파일을 드래그하거나 클릭하여 업로드</p>
          <p className="text-sm text-muted mt-1">MP3 · FLAC · M4A · WAV · OGG</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {/* 업로드 후 홈 이동 버튼 */}
      {successCount > 0 && (
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent rounded-full text-black font-semibold text-sm hover:bg-accent-light transition-colors"
        >
          <Home size={15} />
          홈에서 확인하기 ({successCount}곡 추가됨)
        </button>
      )}

      {/* 업로드 상태 목록 */}
      {statuses.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide">업로드 현황</h2>
          <div className="bg-bg-panel rounded-xl overflow-hidden divide-y divide-border">
            {statuses.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                {s.status === "uploading" && <Loader2 size={16} className="text-accent animate-spin flex-shrink-0" />}
                {s.status === "success" && <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />}
                {s.status === "error" && <XCircle size={16} className="text-red-500 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{s.file}</p>
                  {s.message && <p className="text-xs text-muted">{s.message}</p>}
                </div>
                <span className={`text-xs flex-shrink-0 ${
                  s.status === "success" ? "text-green-500" :
                  s.status === "error" ? "text-red-500" : "text-muted"
                }`}>
                  {s.status === "uploading" ? "업로드 중..." : s.status === "success" ? "완료" : "실패"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
