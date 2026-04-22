import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge, RiskScoreGauge } from "@/components/RiskBadge";
import { AlertTriangle, HelpCircle, Hospital, Phone, RefreshCw, ChevronDown, ChevronUp, Lightbulb, Shield, TrendingUp, FileText, MapPin, Loader2, Download, Copy, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { AnalysisResult } from "@/hooks/useHealthSession";

interface DiagnosisResultProps {
  result: AnalysisResult;
  onReset: () => void;
  onSimulateDecision: () => Promise<{ decision: string; reason: string } | null>;
  onGenerateReport: () => Promise<any | null>;
}

const SPECIALIST_MAP: Record<string, { specialty: string; query: string }[]> = {
  "chest pain": [{ specialty: "Cardiologist", query: "cardiologist" }],
  "headache": [{ specialty: "Neurologist", query: "neurologist" }],
  "back pain": [{ specialty: "Orthopedic Doctor", query: "orthopedic+doctor" }],
  "breathing": [{ specialty: "Pulmonologist", query: "pulmonologist" }],
  "stomach": [{ specialty: "Gastroenterologist", query: "gastroenterologist" }],
  "skin": [{ specialty: "Dermatologist", query: "dermatologist" }],
  "anxiety": [{ specialty: "Psychiatrist", query: "psychiatrist" }],
  "eye": [{ specialty: "Ophthalmologist", query: "ophthalmologist" }],
  "ear": [{ specialty: "ENT Specialist", query: "ENT+specialist" }],
};

function getSpecialists(condition: string): { specialty: string; query: string }[] {
  const lower = condition.toLowerCase();
  for (const [key, specs] of Object.entries(SPECIALIST_MAP)) {
    if (lower.includes(key)) return specs;
  }
  return [{ specialty: "General Physician", query: "doctor+clinic" }];
}

export function DiagnosisResult({ result, onReset, onSimulateDecision, onGenerateReport }: DiagnosisResultProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [decisionModal, setDecisionModal] = useState(false);
  const [decision, setDecision] = useState<{ decision: string; reason: string } | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [clinicalReport, setClinicalReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [findingLocation, setFindingLocation] = useState(false);

  const isCritical = result.risk_level === "critical" || result.risk_level === "high";
  const specialists = getSpecialists(result.condition);

  const handleDecision = async () => {
    setDecisionModal(true);
    setDecisionLoading(true);
    const res = await onSimulateDecision();
    setDecision(res);
    setDecisionLoading(false);
  };

  const handleReport = async () => {
    setReportModal(true);
    setReportLoading(true);
    const res = await onGenerateReport();
    setClinicalReport(res);
    setReportLoading(false);
  };

  const handleDownloadReport = () => {
    if (!clinicalReport) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Clinical Report - MedTwin AI</title><style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1a1a1a;line-height:1.6}h1{font-size:22px;border-bottom:2px solid #3b82f6;padding-bottom:8px}h2{font-size:15px;color:#6b7280;margin-top:20px;margin-bottom:4px}p,li{font-size:14px}.disclaimer{font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px;margin-top:24px;font-style:italic}@media print{body{margin:0}}</style></head><body><h1>🩺 Clinical Session Report</h1><p><strong>Date:</strong> ${clinicalReport.date || new Date().toLocaleDateString()}</p><h2>Patient Summary</h2><p>${clinicalReport.patient_summary}</p><h2>Presenting Symptoms</h2><ul>${(clinicalReport.presenting_symptoms || []).map((s: string) => `<li>${s}</li>`).join("")}</ul><h2>Follow-Up Assessment</h2><p>${clinicalReport.follow_up_assessment}</p><h2>Diagnosis</h2><p><strong>${clinicalReport.diagnosis}</strong></p><h2>Risk Assessment</h2><p>${clinicalReport.risk_assessment}</p><h2>Recommended Actions</h2><ul>${(clinicalReport.recommended_actions || []).map((a: string) => `<li>${a}</li>`).join("")}</ul>${clinicalReport.notes ? `<h2>Notes</h2><p>${clinicalReport.notes}</p>` : ""}<p class="disclaimer">${clinicalReport.disclaimer || "This is an AI-generated report and should not replace professional medical advice."}</p></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const copyEmergencyNumber = (number: string) => {
    navigator.clipboard.writeText(number);
    toast.success(`Copied ${number} to clipboard`);
  };

  const findSpecialist = (query: string) => {
    setFindingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.open(`https://www.google.com/maps/search/${query}/@${pos.coords.latitude},${pos.coords.longitude},14z`, "_blank");
          setFindingLocation(false);
        },
        () => {
          window.open(`https://www.google.com/maps/search/${query}+near+me`, "_blank");
          setFindingLocation(false);
        },
        { timeout: 5000 }
      );
    } else {
      window.open(`https://www.google.com/maps/search/${query}+near+me`, "_blank");
      setFindingLocation(false);
    }
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Main result card */}
      <Card className={cn("glass-card overflow-hidden", isCritical && "border-critical/30")}>
        {isCritical && (
          <div className="bg-critical px-4 py-2 flex items-center gap-2 text-critical-foreground text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Emergency Alert — Seek immediate medical attention
          </div>
        )}
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="font-display text-xl mb-2">{result.condition}</CardTitle>
              <RiskBadge level={result.risk_level} />
            </div>
            <RiskScoreGauge level={result.risk_level} score={result.risk_score} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-secondary/30 border border-secondary/50">
            <p className="text-sm font-medium text-muted-foreground mb-1">Assessment</p>
            <p className="text-foreground">{result.reasoning}</p>
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border-l-4 border-l-primary">
            <p className="text-sm font-semibold text-primary mb-1 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Recommended Action
            </p>
            <p className="text-foreground">{result.recommended_action}</p>
          </div>

          {result.session_comparison?.has_previous && (
            <div className="p-3 rounded-lg bg-info/5 border border-info/20 flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-info mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-info">What Changed?</p>
                <p className="text-sm text-foreground">{result.session_comparison.insight}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Find Specialized Care */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" /> Find Specialized Care
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {specialists.map((spec) => (
              <Button
                key={spec.specialty}
                variant="outline"
                size="sm"
                className="gap-2 hover:border-primary hover:text-primary"
                onClick={() => findSpecialist(spec.query)}
                disabled={findingLocation}
              >
                <MapPin className="h-3.5 w-3.5" />
                Find {spec.specialty} nearby
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Uses your location to find the nearest specialist on Google Maps.</p>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setShowExplanation(!showExplanation)} className="gap-2">
          <HelpCircle className="h-4 w-4" /> Why this?
          {showExplanation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        <Button variant="outline" onClick={handleDecision} className="gap-2">
          <Hospital className="h-4 w-4" /> Should I go to hospital?
        </Button>
        <Button variant="outline" onClick={handleReport} className="gap-2">
          <FileText className="h-4 w-4" /> Clinical Report
        </Button>
        {isCritical && (
          <>
            <a href="tel:911" className="inline-flex">
              <Button variant="emergency" className="gap-2">
                <Phone className="h-4 w-4" /> Call 911
              </Button>
            </a>
            <Button variant="outline" onClick={() => copyEmergencyNumber("911")} className="gap-2">
              <Copy className="h-4 w-4" /> Copy 911
            </Button>
          </>
        )}
        <Button variant="ghost" onClick={onReset} className="gap-2 ml-auto">
          <RefreshCw className="h-4 w-4" /> New Analysis
        </Button>
      </div>

      {/* Explanation panel */}
      {showExplanation && result.explanation && (
        <Card className="glass-card animate-fade-in">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" /> AI Explanation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Key Triggers</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {result.explanation.key_triggers?.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">History Influence</p>
              <p>{result.explanation.history_influence}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Reasoning Logic</p>
              <p>{result.explanation.reasoning_logic}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decision Modal */}
      <Dialog open={decisionModal} onOpenChange={setDecisionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Hospital className="h-5 w-5 text-primary" /> Decision Simulation
            </DialogTitle>
          </DialogHeader>
          {decisionLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">AI is evaluating...</span>
            </div>
          ) : decision ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-secondary">
                <p className="font-semibold text-lg">{decision.decision}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Reasoning</p>
                <p className="text-sm">{decision.reason}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Clinical Report Modal */}
      <Dialog open={reportModal} onOpenChange={setReportModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Clinical Session Report
            </DialogTitle>
          </DialogHeader>
          {reportLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Generating report...</span>
            </div>
          ) : clinicalReport ? (
            <div className="space-y-4 text-sm">
              <div><p className="font-medium text-muted-foreground">Patient Summary</p><p>{clinicalReport.patient_summary}</p></div>
              <div><p className="font-medium text-muted-foreground">Presenting Symptoms</p><ul className="list-disc list-inside">{clinicalReport.presenting_symptoms?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
              <div><p className="font-medium text-muted-foreground">Follow-Up Assessment</p><p>{clinicalReport.follow_up_assessment}</p></div>
              <div><p className="font-medium text-muted-foreground">Diagnosis</p><p className="font-semibold">{clinicalReport.diagnosis}</p></div>
              <div><p className="font-medium text-muted-foreground">Risk Assessment</p><p>{clinicalReport.risk_assessment}</p></div>
              <div><p className="font-medium text-muted-foreground">Recommended Actions</p><ul className="list-disc list-inside">{clinicalReport.recommended_actions?.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul></div>
              {clinicalReport.notes && <div><p className="font-medium text-muted-foreground">Notes</p><p>{clinicalReport.notes}</p></div>}
              <p className="text-xs text-muted-foreground italic border-t pt-3">{clinicalReport.disclaimer}</p>
              <Button variant="hero" className="w-full gap-2 mt-2" onClick={handleDownloadReport}>
                <Download className="h-4 w-4" /> Download as PDF
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
