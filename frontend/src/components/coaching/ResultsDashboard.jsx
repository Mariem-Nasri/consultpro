import SVSGauge from "./SVSGauge";           // composant déjà existant dans ton frontend
import Timeline from "./Timeline";           // composant déjà existant dans ton frontend
import CommunicationPanel from "./CommunicationPanel";
import CoachingReportCard from "./CoachingReportCard";

/**
 * data = { report, coaching } tel que renvoyé par GET /api/analysis/{job_id}
 *   - report   : sortie du pipeline de diarisation (segments, role_map, duration_s...)
 *   - coaching : sortie de coaching_service.generate_coaching()
 *                (svs, communication, stats, segments, report_text, garde_fous)
 */
export default function ResultsDashboard({ data }) {
  const { coaching } = data;
  const { svs, communication, stats, segments, total_duration_s, silence_s } = coaching;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-slate-800">
          Rapport de coaching — consultation analysée
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Durée totale : {(total_duration_s / 60).toFixed(1)} min · Silences : {silence_s.toFixed(0)}s
          · Usage interne, non diagnostique.
        </p>
      </header>

      {/* Score SVS global + sous-scores — réutilise ton SVSGauge existant */}
      <section className="bg-white rounded-2xl border border-slate-100 p-6">
        <SVSGauge svs={svs} />
      </section>

      {/* Répartition du temps de parole par rôle */}
      <section className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Répartition du temps de parole</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2 font-normal">Locuteur</th>
              <th className="py-2 font-normal">Segments</th>
              <th className="py-2 font-normal">Durée</th>
              <th className="py-2 font-normal">% du temps</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.role} className="border-b border-slate-50">
                <td className="py-2 font-medium text-slate-700">{s.role}</td>
                <td className="py-2 text-slate-500">{s.segments}</td>
                <td className="py-2 text-slate-500">{s.total.toFixed(0)}s</td>
                <td className="py-2 text-slate-500">{s.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Timeline de la consultation — réutilise ton Timeline existant */}
      <section className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Timeline de la consultation</h3>
        <Timeline segments={segments} />
      </section>

      {/* Analyse communication praticien / patient */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Analyse de la communication</h2>
        <CommunicationPanel communication={communication} />
      </section>

      {/* Points forts / axes d'amélioration */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Coaching</h2>
        <CoachingReportCard communication={communication} svs={svs} />
      </section>
    </div>
  );
}
