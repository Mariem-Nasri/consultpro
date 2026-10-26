import fs from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import { AIAnalysisService, AnalysisStatusResponse, AnalysisResult, ModelService } from "@shared/api";
import { analysisRepository } from "../repositories/analysisRepository";

const storageRoot = path.resolve(process.cwd(), "storage/audio");
export const storageService = {
  async saveAudio(file: Express.Multer.File) { await fs.mkdir(storageRoot, { recursive: true }); const storageKey = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`; await fs.writeFile(path.join(storageRoot, storageKey), file.buffer); return storageKey; },
};

const jobs = new Map<string, { analysisId: string; status: AnalysisStatusResponse["status"]; progress: number; currentStep: string }>();
export const aiAnalysisService: AIAnalysisService = {
  async uploadAudio() { return { jobId: crypto.randomUUID() }; },
  async startAnalysis({ analysisId }) { jobs.set(analysisId, { analysisId, status: "processing", progress: 10, currentStep: "Transcription" }); },
  async getAnalysisStatus(analysisId) { const job = jobs.get(analysisId); return job ?? { analysisId, status: "completed", progress: 100, currentStep: "Completed" }; },
  async getAnalysisResults(analysisId) { const stored = analysisRepository.get(analysisId); if (!stored) throw new Error("Analysis not found"); return stored; },
};

export const modelService: ModelService = {
  async uploadModel() { return { modelId: crypto.randomUUID() }; },
  async validateModel() {},
  async deployModel() {},
  async getModelStatus() { return "ready"; },
  async rollbackModel() {},
};

export async function generateAnalysisPdf(analysis: AnalysisResult) {
  const document = new PDFDocument({ margin: 48 });
  const chunks: Buffer[] = []; document.on("data", (chunk) => chunks.push(chunk));
  document.fontSize(20).fillColor("#071A33").text("CONSULT PRO");
  document.fontSize(9).fillColor("#0B5CFF").text("AI-POWERED PRACTITIONER COACHING");
  document.moveDown().fontSize(18).fillColor("#071A33").text(`Rapport d'analyse · Consultation #${analysis.id}`);
  document.fontSize(10).fillColor("#6B7C93").text(`${analysis.date} · ${analysis.duration} · Modèle ${analysis.modelVersion}`);
  document.moveDown().fontSize(28).fillColor("#0B5CFF").text(`${analysis.communicationScore} / 100`);
  document.fontSize(11).fillColor("#071A33").text("Score de communication");
  document.moveDown().fontSize(13).text("Indicateurs de communication");
  document.fontSize(10).fillColor("#425875").text(`Questions ouvertes: ${analysis.openQuestions}%   Questions fermées: ${analysis.closedQuestions}%\nReformulation: ${analysis.reformulation}%   Écoute active: ${analysis.activeListening}%\nEmpathie verbale: ${analysis.empathy}%   Interruptions: ${analysis.interruptions}`);
  document.moveDown().fillColor("#071A33").fontSize(13).text("Vos points forts"); analysis.strengths.forEach((item) => document.fontSize(10).fillColor("#425875").text(`• ${item}`));
  document.moveDown().fillColor("#071A33").fontSize(13).text("Axes d'amélioration"); analysis.improvements.forEach((item) => document.fontSize(10).fillColor("#425875").text(`→ ${item}`));
  document.moveDown().fillColor("#071A33").fontSize(13).text("Consult Pro AI"); analysis.recommendations.forEach((item) => document.fontSize(10).fillColor("#425875").text(item));
  document.moveDown().fillColor("#071A33").fontSize(13).text("Score de vigilance systémique"); document.fontSize(11).fillColor("#425875").text(`Global ${analysis.svs.global} · Émotionnel ${analysis.svs.emotional} · Fonctionnel ${analysis.svs.functional} · Systémique ${analysis.svs.systemic} · Relationnel ${analysis.svs.relational}`);
  document.moveDown().fontSize(8).fillColor("#8090A4").text("Indicateur non diagnostique destiné à soutenir la vigilance et le questionnement du praticien. Consult Pro est un outil d'assistance et de coaching et ne fournit pas de diagnostic médical.");
  document.end(); await new Promise<void>((resolve) => document.on("end", () => resolve())); return Buffer.concat(chunks);
}
