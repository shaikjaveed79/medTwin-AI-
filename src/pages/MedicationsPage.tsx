import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/pages/AuthPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMedications } from "@/hooks/useMedications";
import { useFollowUps } from "@/hooks/useFollowUps";
import { MedicationForm } from "@/components/MedicationForm";
import { Pill, Plus, Check, X, Clock, Trash2, Bell, TrendingUp, Power, Info, AlertCircle, MessageCircle } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function MedicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    medications,
    logs,
    loading,
    todaySlots,
    adherenceRate,
    addMedication,
    updateMedication,
    deleteMedication,
    recordDose,
  } = useMedications();
  const { startFollowUp } = useFollowUps();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleAdd = async (data: Parameters<typeof addMedication>[0]) => {
    const created = await addMedication(data);
    if (created) {
      toast("Start an AI check-in to track tolerance & side effects?", {
        action: {
          label: "Start",
          onClick: async () => {
            const fu = await startFollowUp(
              `New medication: ${created.name}`,
              "new_medication",
              `Patient just started ${created.name}${created.dosage ? ` (${created.dosage})` : ""}, ${created.times_per_day}x/day. ${created.purpose || ""}`,
              created.id,
            );
            if (fu) navigate("/follow-ups");
          },
        },
        duration: 8000,
      });
    }
  };

  // Browser reminder notifications: fire when scheduled time hits and dose still pending
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
    const interval = setInterval(() => {
      const now = Date.now();
      todaySlots.forEach((slot) => {
        const diff = now - slot.scheduledFor.getTime();
        // Fire once within 60s window when due, only if not logged
        if (!slot.log && diff >= 0 && diff < 60_000 && Notification.permission === "granted") {
          new Notification(`Time for ${slot.medication.name}`, {
            body: slot.medication.dosage ? `Take ${slot.medication.dosage}` : "Tap to log this dose",
            tag: slot.key,
          });
          toast.info(`Reminder: ${slot.medication.name}`, {
            description: slot.medication.dosage || "Time to take your dose",
          });
        }
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, [todaySlots]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof logs>();
    logs.forEach((l) => {
      const d = new Date(l.scheduled_for);
      const key = format(d, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [logs]);

  const medById = useMemo(() => Object.fromEntries(medications.map((m) => [m.id, m])), [medications]);

  if (authLoading) return null;
  if (!user) return <AuthPage />;

  const dayLabel = (key: string) => {
    const d = new Date(key);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEE, MMM d");
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Pill className="h-7 w-7 text-primary" /> Medications
            </h1>
            <p className="text-muted-foreground mt-1">Track doses, get reminders, and monitor adherence.</p>
          </div>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add medication
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">7-day adherence</p>
                  <p className="text-3xl font-bold mt-1">{adherenceRate}%</p>
                </div>
                <TrendingUp className={`h-8 w-8 ${adherenceRate >= 80 ? "text-success" : adherenceRate >= 50 ? "text-warning" : "text-critical"}`} />
              </div>
              <Progress value={adherenceRate} className="mt-3" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Active medications</p>
              <p className="text-3xl font-bold mt-1">{medications.filter((m) => m.active).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Doses today</p>
              <p className="text-3xl font-bold mt-1">
                {todaySlots.filter((s) => s.log?.status === "taken").length}
                <span className="text-base text-muted-foreground font-normal">/{todaySlots.length}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Today's schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" /> Today's schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todaySlots.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No doses scheduled for today. Add a medication to get started.
              </p>
            )}
            {todaySlots.map((slot) => {
              const status = slot.log?.status;
              const overdue = !slot.log && slot.scheduledFor.getTime() < Date.now();
              return (
                <div
                  key={slot.key}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    status === "taken"
                      ? "bg-success/5 border-success/20"
                      : status === "skipped"
                        ? "bg-muted/40"
                        : overdue
                          ? "bg-warning/5 border-warning/30"
                          : "bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Pill className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{slot.medication.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {format(slot.scheduledFor, "h:mm a")}
                        {slot.medication.dosage && <span>• {slot.medication.dosage}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === "taken" && <Badge variant="outline" className="border-success text-success">Taken</Badge>}
                    {status === "skipped" && <Badge variant="outline">Skipped</Badge>}
                    {!status && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => recordDose(slot.medication.id, slot.scheduledFor, "skipped")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => recordDose(slot.medication.id, slot.scheduledFor, "taken")}
                          className="gap-1"
                        >
                          <Check className="h-4 w-4" /> Take
                        </Button>
                      </>
                    )}
                    {status && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => recordDose(slot.medication.id, slot.scheduledFor, status === "taken" ? "skipped" : "taken", slot.log!.id)}
                      >
                        Undo
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Medication list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your medications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {medications.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-6">No medications yet.</p>
            )}
            {medications.map((m) => (
              <div key={m.id} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{m.name}</p>
                      {!m.active && <Badge variant="secondary">Paused</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.dosage && <>{m.dosage} • </>}
                      {m.reminder_times.join(", ")}
                    </p>
                    {m.notes && <p className="text-xs text-muted-foreground mt-1 italic truncate">{m.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="AI check-in"
                      onClick={async () => {
                        const fu = await startFollowUp(
                          `Check-in: ${m.name}`,
                          "new_medication",
                          `Currently taking ${m.name}${m.dosage ? ` (${m.dosage})` : ""}, ${m.times_per_day}x/day. ${m.purpose || ""}`,
                          m.id,
                        );
                        if (fu) navigate("/follow-ups");
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={m.active ? "Pause" : "Resume"}
                      onClick={() => updateMedication(m.id, { active: !m.active })}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Delete" onClick={() => deleteMedication(m.id)}>
                      <Trash2 className="h-4 w-4 text-critical" />
                    </Button>
                  </div>
                </div>
                {m.purpose && (
                  <div className="rounded-md bg-primary/5 border border-primary/20 p-2 flex gap-2">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                      <span className="font-semibold">Why this medication: </span>
                      {m.purpose}
                    </p>
                  </div>
                )}
                {m.missed_dose_instructions && (
                  <div className="rounded-md bg-warning/5 border border-warning/20 p-2 flex gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                      <span className="font-semibold">If you miss a dose: </span>
                      {m.missed_dose_instructions}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Adherence history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Adherence history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {grouped.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No history yet.</p>
            )}
            {grouped.slice(0, 14).map(([day, dayLogs]) => {
              const taken = dayLogs.filter((l) => l.status === "taken").length;
              return (
                <div key={day} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{dayLabel(day)}</p>
                    <p className="text-xs text-muted-foreground">
                      {taken}/{dayLogs.length} taken
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dayLogs
                      .sort((a, b) => (a.scheduled_for < b.scheduled_for ? -1 : 1))
                      .map((l) => {
                        const med = medById[l.medication_id];
                        const color =
                          l.status === "taken"
                            ? "bg-success/15 text-success border-success/30"
                            : l.status === "skipped"
                              ? "bg-muted text-muted-foreground"
                              : "bg-warning/10 text-warning border-warning/30";
                        return (
                          <span
                            key={l.id}
                            className={`text-xs px-2 py-1 rounded-md border ${color}`}
                            title={`${med?.name || "Medication"} • ${l.status}`}
                          >
                            {format(new Date(l.scheduled_for), "h:mma")} · {med?.name?.split(" ")[0] || "Med"}
                          </span>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <MedicationForm open={open} onOpenChange={setOpen} onSave={handleAdd} />
    </AppLayout>
  );
}
