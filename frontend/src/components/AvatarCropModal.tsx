"use client";
import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { X } from "lucide-react";

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const size = 400;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, size, size,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("Canvas is empty")); return; }
        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}

interface Props {
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onClose: () => void;
}

export function AvatarCropModal({ imageSrc, onConfirm, onClose }: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [confirming, setConfirming] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels || confirming) return;
    setConfirming(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onConfirm(blob);
    } catch {
      alert("이미지 처리 실패");
      setConfirming(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>
            프로필 사진 자르기
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/[0.08]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* 크롭 영역 */}
        <div className="relative flex-shrink-0" style={{ height: "340px", background: "#0a0a0a" }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={1}
            maxZoom={3}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "#0a0a0a" },
              cropAreaStyle: {
                border: "2px dashed rgba(255,255,255,0.5)",
                color: "rgba(0,0,0,0.55)",
              },
            }}
          />
        </div>

        {/* 줌 슬라이더 */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: "#4ade80" }}
          />
        </div>

        {/* 확인 버튼 */}
        <div className="px-5 pb-5 flex-shrink-0">
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ background: "#4ade80", color: "#000" }}
          >
            {confirming ? "처리 중..." : "프로필 사진 설정"}
          </button>
        </div>
      </div>
    </div>
  );
}
