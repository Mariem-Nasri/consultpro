import { AnalysisResult, AnalysisStatus, ConsultationSummary, ReportSummary } from "@shared/api";

const transcript = [
  { id: "t-1", startSeconds: 42, endSeconds: 54, speaker: "PRACTITIONER" as const, text: "Depuis quand ressentez-vous cette gêne ?", tags: ["Question ouverte"] },
  { id: "t-2", startSeconds: 68, endSeconds: 78, speaker: "PATIENT" as const, text: "Depuis quelques semaines, surtout le soir.", tags: [] },
  { id: "t-3", startSeconds: 87, endSeconds: 98, speaker: "PRACTITIONER" as const, text: "Est-ce que vous avez mal au froid ?", tags: ["Question fermée"] },
  { id: "t-4", startSeconds: 117, endSeconds: 132, speaker: "PRACTITIONER" as const, text: "Si je comprends bien, la gêne est surtout présente lorsque vous sollicitez cette dent.", tags: ["Reformulation"] },
];

const result: AnalysisResult = {
  id: "024", practitionerId: "pr-024", date: "Aujourd'hui, 10:42", duration: "24 min 38 sec", status: "completed", progress: 100, modelVersion: "2.1.0", communicationScore: 82, openQuestions: 72, closedQuestions: 28, reformulation: 81, activeListening: 86, empathy: 78, interruptions: 12, speechRate: "Normal", pauses: "Optimal", strengths: ["Bonne écoute active", "Explications claires", "Reformulations pertinentes"], improvements: ["Poser davantage de questions ouvertes", "Réduire les interruptions", "Ralentir légèrement le débit"], recommendations: ["Encouragez le patient à développer davantage ses réponses avant de passer à des questions ciblées."], suggestedQuestions: ["Pouvez-vous me décrire plus précisément ce que vous ressentez ?"], svs: { global: 72, emotional: 82, functional: 69, systemic: 61, relational: 76 }, transcript,
};

const reports: ReportSummary[] = [];
const analyses = new Map<string, AnalysisResult>([[result.id, result]]);
export const analysisRepository = {
  summaries(): ConsultationSummary[] { return [result, { ...result, id: "023", date: "04 déc. 2026", duration: "18 min 12 sec", communicationScore: 78, svs: { ...result.svs, global: 69 } }, { ...result, id: "022", date: "28 nov. 2026", duration: "31 min 05 sec", communicationScore: 76 }, { ...result, id: "021", date: "21 nov. 2026", duration: "22 min 41 sec", communicationScore: 72 }].map((item) => ({ id: item.id, date: item.date, duration: item.duration, score: item.communicationScore, svs: item.svs.global, status: item.status === "completed" ? "Analysée" : "En cours", patient: `PAT-${item.id}X` })); },
  get(id: string): AnalysisResult | undefined { return analyses.get(id) ?? (this.summaries().find((item) => item.id === id) ? { ...result, id } : undefined); },
  create(input: { practitionerId: string; storageKey: string; mimeType: string }): AnalysisResult { const created = { ...result, id: `AN-${Date.now()}`, practitionerId: input.practitionerId, status: "queued" as const, progress: 0 }; analyses.set(created.id, created); return created; },
  addReport(report: ReportSummary) { reports.unshift(report); return report; },
  listReports() { return reports; },
};
