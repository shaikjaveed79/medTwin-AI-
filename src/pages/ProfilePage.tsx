import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/pages/AuthPage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Save, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { TwinDashboard } from "@/components/TwinDashboard";
import { useTwinState } from "@/hooks/useTwinState";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { twinState, loading: twinLoading } = useTwinState();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newAllergy, setNewAllergy] = useState("");
  const [newCondition, setNewCondition] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setProfile(data || { age: null, blood_type: "", allergies: [], chronic_conditions: [] });
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        age: profile.age,
        blood_type: profile.blood_type,
        allergies: profile.allergies || [],
        chronic_conditions: profile.chronic_conditions || [],
        display_name: profile.display_name,
      })
      .eq("user_id", user.id);

    if (error) toast.error("Failed to save");
    else toast.success("Profile saved!");
    setSaving(false);
  };

  const addItem = (field: "allergies" | "chronic_conditions", value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    const arr = profile[field] || [];
    if (!arr.includes(value.trim())) {
      setProfile({ ...profile, [field]: [...arr, value.trim()] });
    }
    setter("");
  };

  const removeItem = (field: "allergies" | "chronic_conditions", value: string) => {
    setProfile({ ...profile, [field]: (profile[field] || []).filter((x: string) => x !== value) });
  };

  if (authLoading) return null;
  if (!user) return <AuthPage />;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6 text-primary" /> Digital Twin Profile
        </h1>

        {/* Twin Dashboard */}
        <TwinDashboard twinState={twinState} loading={twinLoading} />

        {loading ? (
          <p className="text-muted-foreground text-center py-12">Loading...</p>
        ) : (
          <div className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base font-display">Basic Information</CardTitle>
                <CardDescription>This data helps MedTwin AI provide personalized analysis.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Display Name</label>
                    <Input value={profile.display_name || ""} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Age</label>
                    <Input type="number" value={profile.age || ""} onChange={(e) => setProfile({ ...profile, age: e.target.value ? parseInt(e.target.value) : null })} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Blood Type</label>
                  <Input value={profile.blood_type || ""} onChange={(e) => setProfile({ ...profile, blood_type: e.target.value })} placeholder="e.g. O+, A-, B+" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base font-display">Allergies</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(profile.allergies || []).map((a: string) => (
                    <Badge key={a} variant="secondary" className="gap-1">{a} <X className="h-3 w-3 cursor-pointer" onClick={() => removeItem("allergies", a)} /></Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Add allergy..." value={newAllergy} onChange={(e) => setNewAllergy(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem("allergies", newAllergy, setNewAllergy)} />
                  <Button variant="outline" size="icon" onClick={() => addItem("allergies", newAllergy, setNewAllergy)}><Plus className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base font-display">Chronic Conditions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(profile.chronic_conditions || []).map((c: string) => (
                    <Badge key={c} variant="secondary" className="gap-1">{c} <X className="h-3 w-3 cursor-pointer" onClick={() => removeItem("chronic_conditions", c)} /></Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Add condition..." value={newCondition} onChange={(e) => setNewCondition(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem("chronic_conditions", newCondition, setNewCondition)} />
                  <Button variant="outline" size="icon" onClick={() => addItem("chronic_conditions", newCondition, setNewCondition)}><Plus className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>

            <Button variant="hero" size="lg" className="w-full gap-2" onClick={save} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
