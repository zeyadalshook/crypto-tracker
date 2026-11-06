// Pipeline Report History and Checkpoint Storage
import { FullAnalysisReport } from '../../types/pipeline';

const REPORTS_KEY = 'crypto_pipeline_analysis_reports_v1';

export function savePipelineReport(report: FullAnalysisReport): void {
  try {
    const existing = loadPipelineReports();
    const updated = [report, ...existing.filter((r) => r.reportId !== report.reportId)].slice(0, 20);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save pipeline report:', err);
  }
}

export function loadPipelineReports(): FullAnalysisReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load pipeline reports:', err);
    return [];
  }
}

export function getLatestReportForSymbol(symbol: string): FullAnalysisReport | null {
  const reports = loadPipelineReports();
  return reports.find((r) => r.symbol.toUpperCase() === symbol.toUpperCase()) || null;
}
