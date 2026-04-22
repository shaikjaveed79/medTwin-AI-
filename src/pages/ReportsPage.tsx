import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/pages/AuthPage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Upload, Loader2, Trash2, Brain, User, Stethoscope, AlertTriangle, CheckCircle2, ArrowDown, ArrowUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchReports = () => {
    if (!user) return;
    supabase
      .from("medical_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setReports(data || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or image file (JPG/PNG)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setUploading(true);

    try {
      // Read file as base64 for AI processing
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip the data URL prefix to get raw base64
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("medical_reports")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("medical_reports")
        .getPublicUrl(filePath);

      // Send actual file to AI for real extraction + analysis
      const { data: aiData, error: aiError } = await supabase.functions.invoke("medtwin-analyze", {
        body: {
          stage: "report-analyze",
          fileBase64,
          fileMimeType: file.type,
          reportName: file.name,
        },
      });

      const structuredData = aiError ? null : aiData;
      const extractedText = structuredData?.extracted_text || `[Report: ${file.name}] AI extraction failed.`;

      // Save to database
      const { error: dbError } = await supabase.from("medical_reports").insert({
        user_id: user.id,
        report_name: file.name,
        report_type: file.type,
        file_url: urlData.publicUrl,
        extracted_text: extractedText,
        structured_data: structuredData as any,
      });

      if (dbError) throw dbError;

      // Add to timeline
      await supabase.from("health_timeline").insert({
        user_id: user.id,
        event_type: "report",
        title: `Report uploaded: ${file.name}`,
        description: structuredData?.notes || "Medical report processed and added to your digital twin.",
      });

      toast.success("Report uploaded and analyzed by MedTwin AI!");
      fetchReports();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload report");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteReport = async (id: string) => {
    await supabase.from("medical_reports").delete().eq("id", id);
    toast.success("Report deleted");
    fetchReports();
  };

  if (authLoading) return null;
  if (!user) return <AuthPage />;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Medical Reports
        </h1>

        {/* Upload card */}
        <Card className="shadow-elevated mb-6">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Upload className="h-4 w-4" /> Upload Medical Report
            </CardTitle>
            <CardDescription>
              Upload PDFs or images — MedTwin AI will extract data and integrate it into your digital twin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              variant="hero"
              size="lg"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <><Upload className="h-4 w-4" /> Choose File (PDF, JPG, PNG)</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Reports list */}
        {loading ? (
          <p className="text-muted-foreground text-center py-12">Loading...</p>
        ) : reports.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No medical reports yet. Upload your first report above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const sd = (report.structured_data as any) || {};
              const patient = sd.patient_explanation;
              const doctor = sd.doctor_explanation;
              const metrics: any[] = sd.simplified_metrics || [];
              const hasDual = patient || doctor;

              const statusColor = (s: string) => {
                if (s === "high") return "bg-destructive/10 text-destructive border-destructive/30";
                if (s === "low") return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
                if (s === "critical") return "bg-destructive text-destructive-foreground border-destructive";
                if (s === "normal") return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30";
                return "bg-muted text-muted-foreground border-border";
              };
              const statusIcon = (s: string) => {
                if (s === "high") return <ArrowUp className="h-3 w-3" />;
                if (s === "low") return <ArrowDown className="h-3 w-3" />;
                if (s === "critical") return <AlertTriangle className="h-3 w-3" />;
                if (s === "normal") return <CheckCircle2 className="h-3 w-3" />;
                return null;
              };

              return (
                <Card key={report.id} className="shadow-card">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="h-4 w-4 text-secondary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{report.report_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(report.created_at), "MMM d, yyyy")}
                              {sd.report_type && <> · <span className="font-medium">{sd.report_type}</span></>}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteReport(report.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>

                        {sd.conditions_detected?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {sd.conditions_detected.map((c: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                            ))}
                          </div>
                        )}

                        {metrics.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground">Key Findings</p>
                            <div className="space-y-1">
                              {metrics.map((m, i) => (
                                <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-md border ${statusColor(m.status)}`}>
                                  <span className="mt-0.5">{statusIcon(m.status)}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between gap-2">
                                      <span className="font-semibold">{m.name}</span>
                                      <span className="font-mono text-[10px] opacity-80">{m.value}</span>
                                    </div>
                                    {m.reference_range && (
                                      <p className="text-[10px] opacity-70">Normal: {m.reference_range}</p>
                                    )}
                                    {m.plain_meaning && (
                                      <p className="text-[11px] mt-0.5 opacity-90">{m.plain_meaning}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {hasDual && (
                          <Tabs defaultValue="patient" className="mt-3">
                            <TabsList className="grid w-full grid-cols-2 h-8">
                              <TabsTrigger value="patient" className="text-xs gap-1">
                                <User className="h-3 w-3" /> For You
                              </TabsTrigger>
                              <TabsTrigger value="doctor" className="text-xs gap-1">
                                <Stethoscope className="h-3 w-3" /> For Doctor
                              </TabsTrigger>
                            </TabsList>
                            <TabsContent value="patient" className="mt-2 space-y-2">
                              {patient?.summary && (
                                <p className="text-xs leading-relaxed">{patient.summary}</p>
                              )}
                              {patient?.what_it_means && (
                                <div className="text-xs">
                                  <span className="font-semibold">What this means: </span>
                                  <span className="text-muted-foreground">{patient.what_it_means}</span>
                                </div>
                              )}
                              {patient?.key_concerns?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold mb-1">Things to watch:</p>
                                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                                    {patient.key_concerns.map((c: string, i: number) => <li key={i}>{c}</li>)}
                                  </ul>
                                </div>
                              )}
                              {patient?.recommended_next_steps?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold mb-1">Next steps:</p>
                                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                                    {patient.recommended_next_steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                  </ul>
                                </div>
                              )}
                              {patient?.reassurance && (
                                <p className="text-xs italic text-primary bg-primary/5 p-2 rounded-md">{patient.reassurance}</p>
                              )}
                            </TabsContent>
                            <TabsContent value="doctor" className="mt-2 space-y-2">
                              {doctor?.clinical_summary && (
                                <p className="text-xs leading-relaxed font-mono">{doctor.clinical_summary}</p>
                              )}
                              {doctor?.abnormal_findings?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold mb-1">Abnormal findings:</p>
                                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                                    {doctor.abnormal_findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                                  </ul>
                                </div>
                              )}
                              {doctor?.differential_considerations?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold mb-1">Differential considerations:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {doctor.differential_considerations.map((d: string, i: number) => (
                                      <Badge key={i} variant="secondary" className="text-[10px]">{d}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {doctor?.suggested_workup?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold mb-1">Suggested workup:</p>
                                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                                    {doctor.suggested_workup.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                  </ul>
                                </div>
                              )}
                              {doctor?.red_flags?.length > 0 && (
                                <div className="bg-destructive/10 border border-destructive/30 p-2 rounded-md">
                                  <p className="text-xs font-semibold text-destructive flex items-center gap-1 mb-1">
                                    <AlertTriangle className="h-3 w-3" /> Red flags
                                  </p>
                                  <ul className="text-xs text-destructive space-y-0.5 list-disc list-inside">
                                    {doctor.red_flags.map((r: string, i: number) => <li key={i}>{r}</li>)}
                                  </ul>
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        )}

                        {!hasDual && sd.notes && (
                          <p className="text-xs text-muted-foreground flex items-start gap-1 mt-2">
                            <Brain className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                            {sd.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
