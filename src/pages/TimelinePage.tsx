import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/pages/AuthPage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge, RiskScoreBar } from "@/components/RiskBadge";
import { Clock, Activity, AlertTriangle, FileText, Stethoscope } from "lucide-react";
import { format } from "date-fns";

const eventIcons: Record<string, React.ElementType> = {
  symptom: Activity,
  diagnosis: Stethoscope,
  report: FileText,
  alert: AlertTriangle,
  note: Clock,
};

export default function TimelinePage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("health_timeline")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setEvents(data || []);
        setLoading(false);
      });
  }, [user]);

  if (authLoading) return null;
  if (!user) return <AuthPage />;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" /> Health Timeline
        </h1>
        {loading ? (
          <p className="text-muted-foreground text-center py-12">Loading...</p>
        ) : events.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No health events yet. Start by analyzing your symptoms.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event, i) => {
              const Icon = eventIcons[event.event_type] || Activity;
              const meta = event.metadata as any;
              const riskLevel = meta?.risk_level;
              const riskScore = meta?.risk_score;
              return (
                <Card key={event.id} className="shadow-card animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <CardContent className="py-4 flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{event.title}</p>
                        {riskLevel && <RiskBadge level={riskLevel} />}
                      </div>
                      {riskLevel && (
                        <div className="mt-2 max-w-xs">
                          <RiskScoreBar level={riskLevel} score={riskScore} />
                        </div>
                      )}
                      {event.description && (
                        <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{event.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(event.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
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
