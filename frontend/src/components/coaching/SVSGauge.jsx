const scoreColor = (v) => (v >= 70 ? "#1D9E75" : v >= 50 ? "#EF9F27" : "#E24B4A");

export default function SVSGauge({ svs }) {
  const subs = [
    { label: "S1 Émotionnel", value: svs.S1_emotionnel },
    { label: "S2 Fonctionnel", value: svs.S2_fonctionnel },
    { label: "S3 Systémique", value: svs.S3_systemique },
    { label: "S4 Relationnel", value: svs.S4_relationnel },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6 items-center">
      <div className="flex flex-col items-center justify-center">
        <div
          className="w-36 h-36 rounded-full flex items-center justify-center text-3xl font-bold"
          style={{
            border: `10px solid ${scoreColor(svs.global)}`,
            color: scoreColor(svs.global),
          }}
        >
          {svs.global}
        </div>
        <p className="text-xs text-slate-400 mt-2">SVS Global / 100</p>
      </div>

      <div className="space-y-3">
        {subs.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{s.label}</span>
              <span>{s.value}/100</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${s.value}%`, backgroundColor: scoreColor(s.value) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
