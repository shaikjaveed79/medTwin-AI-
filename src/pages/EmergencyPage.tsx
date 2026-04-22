import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/pages/AuthPage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Phone, MapPin, AlertTriangle, Plus, Trash2, Users, Send, Copy, Check, MessageCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EmergencyContact {
  id: string;
  name: string;
  phone_number: string;
  relationship: string | null;
  email?: string | null;
}

interface SOSAlert {
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  contactsNotified: string[];
}

export default function EmergencyPage() {
  const { user, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRelation, setNewRelation] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [sosAlert, setSosAlert] = useState<SOSAlert | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const fetchContacts = () => {
    if (!user) return;
    supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setContacts((data as EmergencyContact[]) || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  const addContact = async () => {
    if (!user || !newName.trim() || !newPhone.trim()) return;
    const { error } = await supabase.from("emergency_contacts").insert({
      user_id: user.id,
      name: newName.trim(),
      phone_number: newPhone.trim(),
      relationship: newRelation.trim() || null,
      email: newEmail.trim() || null,
    });
    if (error) {
      toast.error("Failed to add contact");
    } else {
      toast.success("Emergency contact added");
      setNewName("");
      setNewPhone("");
      setNewRelation("");
      setNewEmail("");
      setShowAdd(false);
      fetchContacts();
    }
  };

  const deleteContact = async (id: string) => {
    await supabase.from("emergency_contacts").delete().eq("id", id);
    toast.success("Contact removed");
    fetchContacts();
  };

  const copyNumber = (number: string) => {
    navigator.clipboard.writeText(number);
    setCopiedNumber(number);
    toast.success(`Copied ${number}`);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  const handleSOS = () => {
    const alert: SOSAlert = {
      timestamp: new Date().toLocaleString(),
      latitude: null,
      longitude: null,
      contactsNotified: contacts.map(c => c.name),
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          alert.latitude = pos.coords.latitude;
          alert.longitude = pos.coords.longitude;
          setSosAlert({ ...alert });
        },
        () => setSosAlert(alert)
      );
    } else {
      setSosAlert(alert);
    }
  };

  const getWhatsAppUrl = () => {
    const loc = sosAlert?.latitude && sosAlert?.longitude
      ? `📍 Location: https://maps.google.com/?q=${sosAlert.latitude},${sosAlert.longitude}`
      : "📍 Location: Unable to determine";
    const msg = encodeURIComponent(`🚨 EMERGENCY SOS ALERT\n\nI need immediate help!\n${loc}\n\nSent via MedTwin AI`);
    return `https://wa.me/?text=${msg}`;
  };

  if (authLoading) return null;
  if (!user) return <AuthPage />;

  const emergencyNumbers = [
    { name: "Emergency Services", number: "911" },
    { name: "Poison Control", number: "1-800-222-1222" },
    { name: "Suicide & Crisis Lifeline", number: "988" },
  ];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-critical" /> Emergency & SOS
        </h1>

        {/* SOS Card */}
        <Card className="border-critical/30 bg-critical/5 shadow-elevated">
          <CardHeader>
            <CardTitle className="font-display text-critical flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Emergency SOS
            </CardTitle>
            <CardDescription>
              Triggers an alert with your location. Share via WhatsApp to notify your contacts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="emergency" size="lg" className="w-full text-lg py-6" onClick={handleSOS}>
              <Phone className="h-5 w-5 mr-2" /> ACTIVATE SOS
            </Button>
            {sosAlert && (
              <div className="p-4 rounded-lg bg-critical/10 border border-critical/20 animate-fade-in space-y-3">
                <p className="font-semibold text-critical flex items-center gap-2">
                  <Send className="h-4 w-4" /> SOS Alert Activated
                </p>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>⏰ {sosAlert.timestamp}</p>
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {sosAlert.latitude && sosAlert.longitude
                      ? `${sosAlert.latitude.toFixed(4)}, ${sosAlert.longitude.toFixed(4)}`
                      : "Location unavailable"}
                  </p>
                  <p>
                    {sosAlert.contactsNotified.length > 0
                      ? `Contacts: ${sosAlert.contactsNotified.join(", ")}`
                      : "No emergency contacts configured"}
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="hero" className="w-full gap-2">
                      <MessageCircle className="h-4 w-4" /> Share via WhatsApp
                    </Button>
                  </a>
                  {sosAlert.latitude && sosAlert.longitude && (
                    <a href={`https://maps.google.com/?q=${sosAlert.latitude},${sosAlert.longitude}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-2">
                        <MapPin className="h-4 w-4" /> Map
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Emergency Contacts
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="gap-1">
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : contacts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No emergency contacts yet. Add contacts to enable SOS alerts.
              </p>
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-sm">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {contact.phone_number}
                      {contact.relationship && ` · ${contact.relationship}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={`tel:${contact.phone_number}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Call (mobile only)">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                      </Button>
                    </a>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyNumber(contact.phone_number)} title="Copy number">
                      {copiedNumber === contact.phone_number ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteContact(contact.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Emergency Numbers */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Emergency Numbers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {emergencyNumbers.map((contact) => (
              <div key={contact.number} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="font-medium text-sm">{contact.name}</span>
                <div className="flex items-center gap-2">
                  <a href={`tel:${contact.number}`} className="text-primary font-semibold text-sm">{contact.number}</a>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyNumber(contact.number)} title="Copy number">
                    {copiedNumber === contact.number ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Find Nearby Hospitals */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Find Nearby Hospitals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href="https://www.google.com/maps/search/hospitals+near+me" target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full gap-2">
                <ExternalLink className="h-4 w-4" /> Open Google Maps — Hospitals Near Me
              </Button>
            </a>
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p className="font-medium">When calling emergency services:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>State your location clearly</li>
                <li>Describe the medical emergency</li>
                <li>Stay on the line until instructed otherwise</li>
                <li>Have your ID and medication list ready</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Add Contact Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Add Emergency Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input placeholder="Phone number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              <Input
                type="email"
                placeholder="Email (for visual-analysis alerts)"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Input placeholder="Relationship (optional)" value={newRelation} onChange={(e) => setNewRelation(e.target.value)} />
              <Button variant="hero" className="w-full" onClick={addContact} disabled={!newName.trim() || !newPhone.trim()}>
                Save Contact
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
