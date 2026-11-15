export type ExplanationDepth = 'quick' | 'detailed';
export type EvidenceNote = { evidenceId: string; text: string; sourceId: string };
export type Explanation = {
  summary: string;
  uncertainty: string;
  actionReason?: string;
  sourceIds: string[];
  evidenceNotes?: EvidenceNote[];
};
export function explanationDepth(value: unknown): ExplanationDepth | null {
  return value === undefined || value === 'quick' ? 'quick' : value === 'detailed' ? value : null;
}
