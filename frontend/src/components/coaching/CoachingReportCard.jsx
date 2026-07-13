import { CheckCircle2, TrendingUp } from "lucide-react";

export default function CoachingReportCard({ communication, svs }) {
  const c = communication;

  const pointsForts = [];
  if (c.empathie >= 50) pointsForts.push(`Empathie verbale : ${c.empathie}%`);
  if (c.questions_ouvertes >= 40) pointsForts.push(`Questions ouvertes : ${c.questions_ouvertes}%`);
  if (c.resistance_patient < 20) pointsForts.push("Faible résistance patient");
  if (c.nb_long_segments <= 1) pointsForts.push("Structure de consultation cohérente");

  const axes = [];
  if (c.reformulations < 40)
    axes.push({
      titre: `Reformulations ${c.reformulations}% → viser 40%`,
      conseil: 'Ex : "Si je comprends bien, vous ressentez..."',
    });
  if (c.max_segment_dur > 90)
    axes.push({
      titre: `Monologue long : ${c.max_segment_dur.toFixed(0)}s sans retour patient`,
      conseil: 'Fragmenter : "Est-ce que cela vous semble clair ?"',
    });
  if (c.questions_ouvertes < 60)
    axes.push({
      titre: `Questions ouvertes ${c.questions_ouvertes}% → viser 60%`,
      conseil: '"Comment décrivez-vous la douleur ?" plutôt que "Vous avez mal ?"',
    });
  if (c.hesitations_patient > 30)
    axes.push({
      titre: `Hésitations patient : ${c.hesitations_patient}%`,
      conseil: "Vérifier la compréhension du plan de traitement",
    });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-700">Points forts</h3>
        </div>
        {pointsForts.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun point fort marquant détecté.</p>
        ) : (
          <ul className="space-y-2">
            {pointsForts.map((p, i) => (
              <li key={i} className="text-sm text-slate-600 flex gap-2">
                <span className="text-emerald-600">•</span>
                {p}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-700">Axes d'amélioration</h3>
        </div>
        {axes.length === 0 ? (
          <p className="text-sm text-slate-400">Rien à signaler sur cette consultation.</p>
        ) : (
          <ul className="space-y-3">
            {axes.map((a, i) => (
              <li key={i} className="text-sm">
                <p className="text-slate-700 font-medium">{a.titre}</p>
                <p className="text-slate-500 text-xs mt-0.5">{a.conseil}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {svs.S3_systemique < 70 && (
        <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Score systémique modéré ({svs.S3_systemique}/100) — un questionnaire médical
          général est conseillé pour compléter l'analyse.
        </div>
      )}
    </div>
  );
}
