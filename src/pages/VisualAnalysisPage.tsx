import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { AuthPage } from "@/pages/AuthPage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useVisualAnalyses, VisualAnalysis } from "@/hooks/useVisualAnalyses";
import { Camera, Upload, AlertTriangle, CheckCircle2, ArrowUp, ArrowDown, Minus, Trash2, Mail, ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";

const urgencyColor = (u: string | null) =>
  u === "high" ? "bg-critical text-critical-foreground"
  : u === "medium" ? "bg-warning text-warning-foreground"
  : "bg-success/20 text-success-foreground";

const healingIcon = (s?: string) =>
  s === "improving" ? <ArrowDown className="h-3 w-3 text-success" />
  : s === "worsening" ? <ArrowUp className="h-3 w-3 text-critical" />
  : <Minus className="h-3 w-3 text-info" />;

export default function VisualAnalysisPage() {
  const { user, loading: authLoading } = useAuth();
  const { analyses, analyzing, analyzePhoto, deleteAnalysis } = useVisualAnalyses();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [bodyLocation, setBodyLocation] = useState("");
  const [notes, setNotes] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (authLoading) return null;
  if (!user) return <AuthPage />;

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast.error("Please select a photo first");
      return;
    }
    const { data, error } = await analyzePhoto(file, bodyLocation, notes);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      toast.success("Analysis complete");
      setFile(null);
      setPreview(null);
      setBodyLocation("");
      setNotes("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" /> Visual Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track skin conditions and wound healing. AI alerts your emergency contact if signs of infection appear.
          </p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Upload Photo</CardTitle>
            <CardDescription>Same body region over time = better tracking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview ? (
              <div className="relative rounded-lg overflow-hidden border">
                <img src={preview} alt="preview" className="w-full max-h-80 object-contain bg-muted" />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => { setFile(null); setPreview(null); if (inputRef.current) inputRef.current.value = ""; }}
                >
                  Replace
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 hover:bg-secondary/40 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Tap to upload or take photo</p>
                <p className="text-xs text-muted-foreground">JPG or PNG, up to 10 MB</p>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <div className="space-y-2">
              <Label>Body location</Label>
              <Input
                placeholder="e.g. left forearm, right ankle"
                value={bodyLocation}
                onChange={(e) => setBodyLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="When did it start? Any pain, itching, discharge?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button variant="hero" className="w-full gap-2" onClick={handleAnalyze} disabled={!file || analyzing}>
              <Sparkles className="h-4 w-4" />
              {analyzing ? "Analyzing..." : "Analyze Photo"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5" /> History
          </h2>
          {analyses.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No analyses yet. Upload a photo above to get started.
              </CardContent>
            </Card>
          ) : (
            analyses.map((a) => <AnalysisCard key={a.id} a={a} onDelete={() => deleteAnalysis(a.id, a.photo_url)} />)
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function AnalysisCard({ a, onDelete }: { a: VisualAnalysis; onDelete: () => void }) {
  const f = a.ai_findings;
  return (
    <Card className="shadow-card animate-fade-in">
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-3">
          {a.signed_url && (
            <img src={a.signed_url} alt="" className="h-24 w-24 object-cover rounded-lg border flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={urgencyColor(a.urgency)}>{a.urgency} urgency</Badge>
              {a.infection_signs && (
                <Badge variant="outline" className="border-critical text-critical gap-1">
                  <AlertTriangle className="h-3 w-3" /> infection signs
                </Badge>
              )}
              {f.healing_status && f.healing_status !== "unknown" && (
                <Badge variant="outline" className="gap-1">
                  {healingIcon(f.healing_status)} {f.healing_status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {a.body_location || "No location"} · {new Date(a.created_at).toLocaleDateString()}
            </p>
            {f.description && <p className="text-sm">{f.description}</p>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>

        {f.alert_doctor && (
          <div className="p-3 rounded-lg bg-critical/10 border border-critical/30 space-y-1">
            <p className="text-xs font-semibold text-critical flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> DOCTOR ATTENTION RECOMMENDED
            </p>
            <p className="text-sm">{f.alert_reason}</p>
            {a.alert_recipient ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                <Mail className="h-3 w-3" /> Alert flagged for {a.alert_recipient}
                {!a.alert_sent && " — email delivery requires email setup in chat"}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground pt-1">
                Add an emergency contact with an email to enable automatic alerts.
              </p>
            )}
          </div>
        )}

        {f.patient_message && (
          <p className="text-sm p-3 rounded-lg bg-secondary/50">{f.patient_message}</p>
        )}

        {f.recommendations && f.recommendations.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">RECOMMENDATIONS</p>
            <ul className="text-sm space-y-0.5 list-disc list-inside">
              {f.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {f.comparison_notes && (
          <p className="text-xs text-muted-foreground italic">Compared to previous: {f.comparison_notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
