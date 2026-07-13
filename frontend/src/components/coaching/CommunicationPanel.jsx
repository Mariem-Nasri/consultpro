import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";

const scoreColor = (v) => (v >= 70 ? "#1D9E75" : v >= 50 ? "#EF9F27" : "#E24B4A");

export default function CommunicationPanel({ communication }) {
  const c = communication;

  const praticienData = [
    { label: "Questions ouvertes", value: c.questions_ouvertes, target: 60 },
    { label: "Reformulations", value: c.reformulations, target: 40 },
    { label: "Empathie verbale", value: c.empathie, target: 60 },
    { label: "Interruptions", value: c.interruptions, target: 20 },
  ];

  const patientData = [
    { label: "Engagement", value: c.engagement_patient, color: "#1D9E75" },
    { label: "Hésitations", value: c.hesitations_patient, color: "#EF9F27" },
    { label: "Résistance", value: c.resistance_patient, color: "#E24B4A" },
    { label: "Fatigue décisionnelle", value: Math.min(40, Math.floor(c.hesitations_patient / 2)), color: "#EF9F27" },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Discours praticien</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={praticienData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} unit="%" fontSize={11} />
            <YAxis dataKey="label" type="category" width={130} fontSize={11} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {praticienData.map((d, i) => (
                <Cell key={i} fill={scoreColor(d.value)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Signaux patient</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={patientData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} unit="%" fontSize={11} />
            <YAxis dataKey="label" type="category" width={130} fontSize={11} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {patientData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
