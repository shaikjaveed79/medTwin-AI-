import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, X, Clock } from "lucide-react";

type SaveData = {
  name: string;
  dosage: string | null;
  frequency: string;
  times_per_day: number;
  reminder_times: string[];
  notes: string | null;
  start_date: string;
  end_date: string | null;
  active: boolean;
  color: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (data: SaveData) => Promise<unknown> | unknown;
};

export function MedicationForm({ open, onOpenChange, onSave }: Props) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [notes, setNotes] = useState("");
  const [times, setTimes] = useState<string[]>(["09:00"]);

  const reset = () => {
    setName("");
    setDosage("");
    setNotes("");
    setTimes(["09:00"]);
  };

  const updateTime = (i: number, v: string) => {
    const next = [...times];
    next[i] = v;
    setTimes(next);
  };

  const addTime = () => setTimes([...times, "20:00"]);
  const removeTime = (i: number) => setTimes(times.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onSave({
      name: name.trim().slice(0, 100),
      dosage: dosage.trim().slice(0, 50) || null,
      frequency: times.length === 1 ? "daily" : times.length === 2 ? "twice_daily" : "custom",
      times_per_day: times.length,
      reminder_times: times,
      notes: notes.trim().slice(0, 500) || null,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null,
      active: true,
      color: "primary",
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add medication</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="med-name">Name</Label>
            <Input id="med-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Metformin" maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="med-dosage">Dosage</Label>
            <Input id="med-dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 500mg" maxLength={50} />
          </div>

          <div className="space-y-2">
            <Label>Reminder times</Label>
            <div className="space-y-2">
              {times.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input type="time" value={t} onChange={(e) => updateTime(i, e.target.value)} />
                  {times.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTime(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addTime} className="gap-2">
                <Plus className="h-4 w-4" /> Add another time
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="med-notes">Notes</Label>
            <Textarea id="med-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Take with food..." maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
