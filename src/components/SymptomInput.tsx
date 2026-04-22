import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, Plus, X, Sparkles, Search, Thermometer, Wind, Zap, Heart, Frown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SYMPTOM_CATEGORIES = [
  { label: "Pain", icon: Zap, color: "border-critical/30 text-critical hover:bg-critical/10", symptoms: ["Headache", "Chest pain", "Back pain", "Stomach pain", "Joint pain"] },
  { label: "Respiratory", icon: Wind, color: "border-info/30 text-info hover:bg-info/10", symptoms: ["Cough", "Shortness of breath", "Sore throat", "Nasal congestion"] },
  { label: "General", icon: Thermometer, color: "border-warning/30 text-warning hover:bg-warning/10", symptoms: ["Fever", "Fatigue", "Nausea", "Dizziness", "Chills"] },
  { label: "Cardiac", icon: Heart, color: "border-critical/30 text-critical hover:bg-critical/10", symptoms: ["Palpitations", "Irregular heartbeat", "Swollen legs"] },
  { label: "Other", icon: Frown, color: "border-muted-foreground/30 text-muted-foreground hover:bg-muted", symptoms: ["Anxiety", "Insomnia", "Loss of appetite", "Blurred vision"] },
];

const ALL_SYMPTOMS = SYMPTOM_CATEGORIES.flatMap((c) => c.symptoms);

interface SymptomInputProps {
  onSubmit: (symptoms: string[], description: string) => void;
  loading: boolean;
}

export function SymptomInput({ onSubmit, loading }: SymptomInputProps) {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return SYMPTOM_CATEGORIES;
    const q = search.toLowerCase();
    return SYMPTOM_CATEGORIES.map((c) => ({
      ...c,
      symptoms: c.symptoms.filter((s) => s.toLowerCase().includes(q)),
    })).filter((c) => c.symptoms.length > 0);
  }, [search]);

  const addSymptom = (s: string) => {
    if (!symptoms.includes(s)) setSymptoms([...symptoms, s]);
  };
  const removeSymptom = (s: string) => setSymptoms(symptoms.filter((x) => x !== s));
  const addCustom = () => {
    if (customSymptom.trim() && !symptoms.includes(customSymptom.trim())) {
      setSymptoms([...symptoms, customSymptom.trim()]);
      setCustomSymptom("");
    }
  };

  return (
    <Card className="glass-card animate-slide-up overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="font-display text-xl">What are you experiencing?</CardTitle>
            <CardDescription>Select or type your symptoms for AI analysis.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search symptoms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>

        {/* Category chips */}
        {filteredCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.label} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat.label}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.symptoms.map((s) => (
                  <Badge
                    key={s}
                    variant={symptoms.includes(s) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all hover:scale-105 px-3 py-1.5",
                      !symptoms.includes(s) && cat.color
                    )}
                    onClick={() => (symptoms.includes(s) ? removeSymptom(s) : addSymptom(s))}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}

        {/* Custom symptom */}
        <div className="flex gap-2">
          <Input
            placeholder="Add custom symptom..."
            value={customSymptom}
            onChange={(e) => setCustomSymptom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            className="bg-background/50"
          />
          <Button variant="outline" size="icon" onClick={addCustom}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected symptoms */}
        {symptoms.length > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Selected ({symptoms.length})</p>
              <div className="flex flex-wrap gap-2">
                {symptoms.map((s) => (
                  <Badge key={s} variant="default" className="gap-1 animate-scale-in">
                    {s}
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeSymptom(s)} />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <Textarea
          placeholder="Describe how you're feeling in more detail (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="bg-background/50"
        />

        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={() => onSubmit(symptoms, description)}
          disabled={symptoms.length === 0 || loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-spin" /> Analyzing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Brain className="h-4 w-4" /> Analyze with MedTwin AI
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
