export type MonthPoint = { label: string; total: number };

const W = 640;
const H = 230;
const PAD = { top: 16, right: 12, bottom: 28, left: 12 };

function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export function RevenueChart({ data, format }: { data: MonthPoint[]; format: (n: number) => string }) {
  const max = Math.max(...data.map((d) => d.total), 0);
  const hasData = max > 0;
  const top = hasData ? max * 1.15 : 1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const pts: [number, number][] = data.map((d, i) => [
    PAD.left + (i / Math.max(data.length - 1, 1)) * innerW,
    PAD.top + innerH - (d.total / top) * innerH,
  ]);
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1][0]} ${PAD.top + innerH} L ${pts[0][0]} ${PAD.top + innerH} Z`;
  const peak = hasData ? data.reduce((a, b) => (b.total > a.total ? b : a)) : null;
  const summary = hasData
    ? `Revenue from won deals over the last 12 months. Highest month: ${peak!.label}, ${format(peak!.total)}.`
    : "No won deals recorded in the last 12 months.";

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={summary}>
        {[0, 1, 2, 3].map((i) => {
          const y = PAD.top + (innerH / 3) * i;
          return <line key={i} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#e6e4f4" strokeWidth="1" />;
        })}
        {hasData && <path d={area} fill="#5b4fe9" opacity="0.08" />}
        <path d={line} fill="none" stroke="#5b4fe9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {hasData &&
          pts.map(([x, y], i) =>
            data[i].total > 0 ? <circle key={i} cx={x} cy={y} r="4" fill="#fff" stroke="#5b4fe9" strokeWidth="2.5" /> : null,
          )}
        {data.map((d, i) => (
          <text key={d.label + i} x={pts[i][0]} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b6a86">
            {d.label}
          </text>
        ))}
      </svg>
      {!hasData && (
        <p className="mt-1 text-center text-sm text-muted">Revenue appears here once you mark deals as won.</p>
      )}
    </div>
  );
}
