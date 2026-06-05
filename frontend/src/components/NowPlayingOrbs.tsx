"use client";
import { useEffect, useRef, useState } from "react";
import { api, PublicUser } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const ORB_COLORS = [
  { bg: "#b5d4f4", fg: "#0c447c" },
  { bg: "#a8dfc9", fg: "#0a5040" },
  { bg: "#cccaf5", fg: "#3c3489" },
  { bg: "#f2bed0", fg: "#72243e" },
  { bg: "#f9c87a", fg: "#633806" },
  { bg: "#f4c1ae", fg: "#712b13" },
  { bg: "#c3e8b8", fg: "#2a6015" },
  { bg: "#e8c4f4", fg: "#5c1a7c" },
];

const FLOAT_ANIMS = ["npf-a", "npf-b", "npf-c", "npf-d"];

export function NowPlayingOrbs() {
  const { user } = useAuthStore();
  const [playing, setPlaying] = useState<PublicUser[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = () =>
      api.getFollowing(user.id)
        .then((users) => setPlaying(users.filter((u) => u.now_playing !== null)))
        .catch(() => {});
    fetch();
    const id = setInterval(fetch, 15000);
    return () => clearInterval(id);
  }, [user?.id]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    if (playing.length === 0) return;

    const W = container.offsetWidth || 760;
    const H = 280;

    const FLOAT_AMP = 14;
    const HOVER_SIZE = 120;
    const RMIN = 28, RMAX = 44;
    const CARD_W = 224, CARD_H = RMAX * 2 + 28;
    const EDGE = 6 + FLOAT_AMP;
    const INIT_INSET = 80;
    const GAP_ORB = 20 + FLOAT_AMP * 2;
    const PUSH_MARGIN = 16 + FLOAT_AMP;

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

    type OrbData = {
      user: PublicUser;
      x: number; y: number; r: number;
      anim: string; dur: string; delay: string;
      cardLeft: boolean;
      color: { bg: string; fg: string };
    };

    // Layout — orbs without overlap
    const orbs: OrbData[] = [];
    let tries = 0;
    const ix = INIT_INSET, iy = INIT_INSET;
    const iw = W - 2 * INIT_INSET, ih = H - 2 * INIT_INSET;
    while (orbs.length < playing.length && tries < 10000) {
      tries++;
      const r = RMIN + Math.random() * (RMAX - RMIN);
      if (iw < 2 * r || ih < 2 * r) break;
      const x = ix + r + Math.random() * (iw - 2 * r);
      const y = iy + r + Math.random() * (ih - 2 * r);
      let ok = true;
      for (const o of orbs) {
        if (Math.hypot(o.x - x, o.y - y) < o.r + r + GAP_ORB + FLOAT_AMP) { ok = false; break; }
      }
      if (!ok) continue;
      const u = playing[orbs.length];
      orbs.push({
        user: u, x, y, r,
        anim: FLOAT_ANIMS[Math.floor(Math.random() * FLOAT_ANIMS.length)],
        dur: (6 + Math.random() * 4).toFixed(1),
        delay: (Math.random() * 2).toFixed(1),
        cardLeft: x > W / 2,
        color: ORB_COLORS[orbs.length % ORB_COLORS.length],
      });
    }

    // Collision avoidance on hover
    const compute = (hi: number): { dx: number; dy: number }[] => {
      const R = HOVER_SIZE / 2;
      const Ho = orbs[hi];
      let cx0: number, cx1: number;
      if (Ho.cardLeft) { cx1 = Ho.x - R - 14; cx0 = cx1 - CARD_W; }
      else { cx0 = Ho.x + R + 14; cx1 = cx0 + CARD_W; }
      const cy0 = clamp(Ho.y - CARD_H / 2, EDGE, H - CARD_H - EDGE);
      const cy1 = cy0 + CARD_H;
      const card = { x0: cx0, y0: cy0, x1: cx1, y1: cy1 };
      const inX = (x: number, r: number) => x >= r + EDGE && x <= W - r - EDGE;
      const inY = (y: number, r: number) => y >= r + EDGE && y <= H - r - EDGE;
      const pos = orbs.map((o, i) => ({ x: o.x, y: o.y, r: i === hi ? R : o.r }));

      const pushFromCard = (j: number) => {
        const p = pos[j];
        const nx = clamp(p.x, card.x0, card.x1);
        const ny = clamp(p.y, card.y0, card.y1);
        const ex = p.x - nx, ey = p.y - ny;
        const ed = Math.hypot(ex, ey);
        const ins = p.x >= card.x0 && p.x <= card.x1 && p.y >= card.y0 && p.y <= card.y1;
        if (ins) {
          const cs = [
            { a: "x", v: card.x0 - p.r - PUSH_MARGIN, c: p.x - card.x0, ok: inX(card.x0 - p.r - PUSH_MARGIN, p.r) },
            { a: "x", v: card.x1 + p.r + PUSH_MARGIN, c: card.x1 - p.x, ok: inX(card.x1 + p.r + PUSH_MARGIN, p.r) },
            { a: "y", v: card.y0 - p.r - PUSH_MARGIN, c: p.y - card.y0, ok: inY(card.y0 - p.r - PUSH_MARGIN, p.r) },
            { a: "y", v: card.y1 + p.r + PUSH_MARGIN, c: card.y1 - p.y, ok: inY(card.y1 + p.r + PUSH_MARGIN, p.r) },
          ];
          const pool = (cs.filter((c) => c.ok).length ? cs.filter((c) => c.ok) : cs)
            .sort((a, b) => a.c - b.c);
          if (pool[0].a === "x") p.x = pool[0].v; else p.y = pool[0].v;
        } else if (ed < p.r + PUSH_MARGIN && ed > 0) {
          p.x = nx + (ex / ed) * (p.r + PUSH_MARGIN);
          p.y = ny + (ey / ed) * (p.r + PUSH_MARGIN);
        }
      };

      for (let it = 0; it < 80; it++) {
        for (let j = 0; j < pos.length; j++) {
          if (j === hi) continue;
          const dx = pos[j].x - pos[hi].x, dy = pos[j].y - pos[hi].y;
          const d = Math.hypot(dx, dy) || 0.01;
          const need = R + pos[j].r + PUSH_MARGIN;
          if (d < need) { pos[j].x = pos[hi].x + (dx / d) * need; pos[j].y = pos[hi].y + (dy / d) * need; }
        }
        for (let j = 0; j < pos.length; j++) if (j !== hi) pushFromCard(j);
        for (let a = 0; a < pos.length; a++) {
          for (let b = a + 1; b < pos.length; b++) {
            const ddx = pos[b].x - pos[a].x, ddy = pos[b].y - pos[a].y;
            const dd = Math.hypot(ddx, ddy) || 0.01;
            const mn = pos[a].r + pos[b].r + GAP_ORB;
            if (dd < mn) {
              const pu = mn - dd, ux = ddx / dd, uy = ddy / dd;
              if (a === hi) { pos[b].x += ux * pu; pos[b].y += uy * pu; }
              else if (b === hi) { pos[a].x -= ux * pu; pos[a].y -= uy * pu; }
              else { pos[a].x -= (ux * pu) / 2; pos[a].y -= (uy * pu) / 2; pos[b].x += (ux * pu) / 2; pos[b].y += (uy * pu) / 2; }
            }
          }
        }
        for (let k = 0; k < pos.length; k++) {
          if (k === hi) continue;
          pos[k].x = clamp(pos[k].x, pos[k].r + EDGE, W - pos[k].r - EDGE);
          pos[k].y = clamp(pos[k].y, pos[k].r + EDGE, H - pos[k].r - EDGE);
        }
      }
      for (let j = 0; j < pos.length; j++) if (j !== hi) pushFromCard(j);
      return orbs.map((o, i) => i === hi ? { dx: 0, dy: 0 } : { dx: pos[i].x - o.x, dy: pos[i].y - o.y });
    };

    // Build DOM imperatively
    type NodeSet = { n: HTMLDivElement; f: HTMLDivElement; ob: HTMLDivElement; card: HTMLDivElement };
    const nodes: NodeSet[] = [];

    orbs.forEach((o, i) => {
      const n = document.createElement("div");
      n.style.cssText = `position:absolute;left:${o.x - o.r}px;top:${o.y - o.r}px;width:${o.r * 2}px;height:${o.r * 2}px;transition:transform .42s cubic-bezier(.22,1,.36,1);will-change:transform`;

      const f = document.createElement("div");
      f.style.cssText = `width:100%;height:100%;animation:${o.anim} ${o.dur}s ${o.delay}s ease-in-out infinite`;

      const scale = HOVER_SIZE / (o.r * 2);
      const ob = document.createElement("div");
      ob.style.cssText = `width:100%;height:100%;border-radius:50%;background:${o.color.bg};color:${o.color.fg};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;transition:transform .42s cubic-bezier(.34,1.56,.64,1);cursor:pointer;user-select:none;font-family:var(--font-playfair,'Playfair Display',Georgia,serif);overflow:hidden`;
      if (o.user.avatar_url) {
        const img = document.createElement("img");
        img.src = o.user.avatar_url;
        img.alt = o.user.display_name;
        img.style.cssText = `width:100%;height:100%;object-fit:cover;border-radius:50%`;
        ob.appendChild(img);
      } else {
        ob.textContent = o.user.display_name.slice(0, 2).toUpperCase();
      }

      const np = o.user.now_playing!;
      const card = document.createElement("div");
      const cardSide = o.cardLeft ? "right" : "left";
      const cardOffset = o.r + HOVER_SIZE / 2 + 14;
      const initTx = o.cardLeft ? "-8px" : "8px";
      card.style.cssText = `position:absolute;top:50%;${cardSide}:${cardOffset}px;width:${CARD_W}px;display:flex;align-items:center;gap:12px;padding:10px 14px;box-sizing:border-box;background:rgba(15,12,28,0.96);border:0.5px solid rgba(255,255,255,0.1);border-radius:14px;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .28s,transform .28s,visibility .28s;transform:translate(${initTx},-50%);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)`;
      const iconSize = o.r * 2;
      const albumArtHtml = np.cover_art_url
        ? `<img src="${escHtml(np.cover_art_url)}" alt="" style="width:${iconSize}px;height:${iconSize}px;flex-shrink:0;border-radius:8px;object-fit:cover">`
        : `<div style="width:${iconSize}px;height:${iconSize}px;flex-shrink:0;border-radius:8px;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.2);font-size:${Math.round(iconSize * 0.4)}px">♪</div>`;
      card.innerHTML = `
        ${albumArtHtml}
        <div style="min-width:0;flex:1;overflow:hidden">
          <p style="font-size:10px;color:rgba(255,255,255,0.35);margin:0 0 3px;letter-spacing:0.1em;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(o.user.display_name)}</p>
          <p style="font-size:13px;font-weight:500;color:rgba(255,255,255,0.9);margin:0 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(np.title)}</p>
          <p style="font-size:11px;color:rgba(255,255,255,0.4);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(np.artist_name ?? "")}</p>
        </div>`;

      f.appendChild(ob);
      n.appendChild(f);
      n.appendChild(card);
      container.appendChild(n);
      nodes.push({ n, f, ob, card });

      n.addEventListener("mouseenter", () => {
        const disp = compute(i);
        nodes.forEach(({ n: nd }, idx) => {
          nd.style.transform = `translate(${disp[idx].dx}px,${disp[idx].dy}px)`;
          nd.style.zIndex = idx === i ? "50" : "1";
        });
        nodes[i].f.style.animationPlayState = "paused";
        nodes[i].ob.style.transform = `scale(${scale})`;
        nodes[i].card.style.opacity = "1";
        nodes[i].card.style.visibility = "visible";
        nodes[i].card.style.transform = "translate(0,-50%)";
      });

      n.addEventListener("mouseleave", () => {
        nodes.forEach(({ n: nd }) => { nd.style.transform = "translate(0,0)"; nd.style.zIndex = "1"; });
        nodes[i].f.style.animationPlayState = "";
        nodes[i].ob.style.transform = "";
        nodes[i].card.style.opacity = "0";
        nodes[i].card.style.visibility = "hidden";
        nodes[i].card.style.transform = `translate(${initTx},-50%)`;
      });
    });

    return () => { container.innerHTML = ""; };
  }, [playing]);

  if (!user || playing.length === 0) return null;

  return (
    <section className="mb-12">
      <p className="text-[10px] tracking-[0.18em] uppercase mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
        지금 듣는 중
      </p>
      <div ref={containerRef} style={{ position: "relative", width: "100%", height: 280 }} />
    </section>
  );
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
