import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { AuthPage } from "@/pages/AuthPage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFollowUps, FollowUp } from "@/hooks/useFollowUps";
import { MessageCircle, Plus, Send, Trash2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

const TRIGGERS = [
  { value: "post_surgery", label: "After a surgery / procedure" },
  { value: "new_medication", label: "Started a new medication" },
  { value: "post_diagnosis", label: "Recent diagnosis" },
  { value: "general", label: "General check-in" },
];

export default function FollowUpsPage() {
  const { user, loading: authLoading } = useAuth();
  const { followUps, loading, busy, startFollowUp, sendReply, dismiss, remove } = useFollowUps();

  const [openNew, setOpenNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [trigger, setTrigger] = useState(TRIGGERS[0].value);
  const [context, setContext] = useState("");
  const [active, setActive] = useState<FollowUp | null>(null);
  const [reply, setReply] = useState("");

  if (authLoading) return null;
  if (!user) return <AuthPage />;

  const handleStart = async () => {
    if (!subject.trim()) {
      toast.error("Please add a subject");
      return;
    }
    const fu = await startFollowUp(subject.trim(), trigger, context.trim());
    if (fu) {
      setOpenNew(false);
      setSubject("");
      setContext("");
      setActive(fu);
    }
  };

  const handleSend = async () => {
    if (!active || !reply.trim()) return;
    const updated = await sendReply(active, reply);
    if (updated) {
      setActive(updated);
      setReply("");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <MessageCircle className="h-7 w-7 text-primary" /> AI Check-ins
            </h1>
            <p className="text-muted-foreground mt-1">
              Conversational follow-ups after a procedure, new prescription, or diagnosis.
            </p>
          </div>
          <Button onClick={() => setOpenNew(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New check-in
          </Button>
        </div>

        {!loading && followUps.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No check-ins yet. Start one to track recovery, side effects, or adherence.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {followUps.map((f) => (
            <Card
              key={f.id}
              className="cursor-pointer transition hover:shadow-elevated"
              onClick={() => setActive(f)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{f.subject}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {TRIGGERS.find((t) => t.value === f.trigger_type)?.label || f.trigger_type}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={f.status === "completed" ? "outline" : f.status === "dismissed" ? "secondary" : "default"}
                    className="shrink-0"
                  >
                    {f.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {f.messages[f.messages.length - 1]?.content || "—"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {f.last_checked_at ? `Last update ${formatDistanceToNow(new Date(f.last_checked_at), { addSuffix: true })}` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* New check-in dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start a check-in</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What's this about?</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Knee surgery recovery"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Context (optional)</Label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. Right knee replacement on April 12. Currently on oxycodone PRN."
                maxLength={500}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button onClick={handleStart} disabled={busy || !subject.trim()}>
              {busy ? "Starting..." : "Start check-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conversation drawer */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg p-0 gap-0 max-h-[85vh] flex flex-col">
          {active && (
            <>
              <DialogHeader className="p-4 border-b">
                <div className="flex items-start justify-between gap-2 pr-6">
                  <div className="min-w-0">
                    <DialogTitle className="truncate">{active.subject}</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {TRIGGERS.find((t) => t.value === active.trigger_type)?.label} · {format(new Date(active.created_at), "MMM d")}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {active.messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {active.status === "completed" && (
                    <div className="flex items-center gap-2 text-xs text-success justify-center pt-2">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Check-in complete
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-3 border-t space-y-2">
                {active.status === "open" && (
                  <div className="flex gap-2">
                    <Input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type your reply..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !busy && reply.trim()) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      disabled={busy}
                    />
                    <Button onClick={handleSend} disabled={busy || !reply.trim()} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  {active.status === "open" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { dismiss(active.id); setActive(null); }}
                      className="gap-1 text-xs"
                    >
                      <X className="h-3 w-3" /> Dismiss
                    </Button>
                  ) : <span />}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { remove(active.id); setActive(null); }}
                    className="gap-1 text-xs text-critical"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
