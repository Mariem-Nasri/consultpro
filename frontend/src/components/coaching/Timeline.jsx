const COLOR = { Médecin: "#1D9E75", Patient: "#378ADD" };

export default function Timeline({ segments }) {
  const totalEnd = Math.max(...segments.map((s) => s.end), 1);

  return (
    <div>
      <div className="relative h-10 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
        {segments.map((seg, i) => (
          <div
            key={i}
            title={`${seg.role} · ${seg.start.toFixed(0)}s-${seg.end.toFixed(0)}s · ${seg.text?.slice(0, 60) || ""}`}
            className="absolute top-0 h-full"
            style={{
              left: `${(seg.start / totalEnd) * 100}%`,
              width: `${Math.max(((seg.end - seg.start) / totalEnd) * 100, 0.3)}%`,
              backgroundColor: COLOR[seg.role] || "#999",
            }}
          />
        ))}
      </div>
      <div className="flex gap-4 mt-2 text-xs text-slate-500">
        {Object.entries(COLOR).map(([role, color]) => (
          <span key={role} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
            {role}
          </span>
        ))}
      </div>
    </div>
  );
}
