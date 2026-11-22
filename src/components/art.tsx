/** Small decorative and illustrative SVGs shared by the landing sections. Gradients are defined once in <ArtDefs />. */

export function ArtDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="coinFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6f1ff" />
          <stop offset="0.55" stopColor="#cdbdf8" />
          <stop offset="1" stopColor="#9a80ea" />
        </linearGradient>
        <linearGradient id="coinEdge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a6fe3" />
          <stop offset="1" stopColor="#5b3fc4" />
        </linearGradient>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7b5be0" stopOpacity="0.32" />
          <stop offset="1" stopColor="#7b5be0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9a80ea" />
          <stop offset="1" stopColor="#6747cf" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Coin({ size = 56, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <ellipse cx="32" cy="36" rx="26" ry="24" fill="url(#coinEdge)" />
      <ellipse cx="32" cy="31" rx="26" ry="24" fill="url(#coinFace)" />
      <ellipse cx="32" cy="31" rx="19" ry="17.5" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" />
      <path d="M22 24c3-5 9-7 14-5" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 22v18M27 27h8a3 3 0 010 6h-6a3 3 0 000 6h8" fill="none" stroke="#6747cf" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CoinStack({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <Coin size={52} className="absolute bottom-0 left-0" />
      <Coin size={52} className="absolute bottom-3 left-7" />
      <Coin size={52} className="absolute bottom-6 left-3" />
    </div>
  );
}

export function Sparkle({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6L12 1z" fill="#fff" fillOpacity="0.9" />
    </svg>
  );
}

function smooth(pts: [number, number][]) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}, ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function AreaChart({ values, className = "", dots = true }: { values: number[]; className?: string; dots?: boolean }) {
  const W = 240;
  const H = 90;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts: [number, number][] = values.map((v, i) => [
    (i / (values.length - 1)) * (W - 12) + 6,
    H - 10 - ((v - min) / Math.max(max - min, 1)) * (H - 26),
  ]);
  const line = smooth(pts);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true" preserveAspectRatio="none">
      {[0, 1, 2].map((i) => <line key={i} x1="0" x2={W} y1={12 + i * 30} y2={12 + i * 30} stroke="#7b5be0" strokeOpacity="0.1" />)}
      <path d={`${line} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke="url(#lineStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {dots && pts.map(([x, y], i) => (i % 2 === 0 ? <circle key={i} cx={x} cy={y} r="3.6" fill="#fff" stroke="#6747cf" strokeWidth="2" /> : null))}
    </svg>
  );
}

/** A soft blurred colour blob used to blend section backgrounds. */
export function Glow({ className = "" }: { className?: string }) {
  return <div className={`pointer-events-none absolute rounded-full blur-3xl ${className}`} aria-hidden="true" />;
}
