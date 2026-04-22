import { Activity, Brain, Camera, Clock, FileText, FlaskConical, Heart, MessageCircle, Pill, Shield, User, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTwinState } from "@/hooks/useTwinState";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const mainItems = [
  { title: "Analyze Symptoms", url: "/", icon: Brain },
  { title: "Treatment Simulator", url: "/simulator", icon: FlaskConical },
  { title: "Visual Analysis", url: "/visual-analysis", icon: Camera },
  { title: "Health Timeline", url: "/timeline", icon: Clock },
  { title: "Medical Reports", url: "/reports", icon: FileText },
  { title: "Medications", url: "/medications", icon: Pill },
  { title: "AI Check-ins", url: "/follow-ups", icon: MessageCircle },
  { title: "Digital Twin", url: "/profile", icon: User },
  { title: "Emergency", url: "/emergency", icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { twinState } = useTwinState();

  const scoreColor = twinState.health_score >= 70 ? "text-success" : twinState.health_score >= 40 ? "text-warning" : "text-critical";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-primary flex items-center justify-center">
                <Heart className="h-3 w-3 text-primary-foreground" />
              </div>
              {!collapsed && <span className="font-display font-bold text-base">MedTwin AI</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-gradient-primary/10 text-primary font-medium border-l-2 border-l-primary"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && twinState.session_count > 0 && (
          <div className="px-3 pb-2 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <span className={`text-xs font-bold ${scoreColor}`}>{twinState.health_score}</span>
            </div>
            <div>
              <p className="text-xs font-medium">Health Score</p>
              <p className="text-[10px] text-muted-foreground capitalize">{twinState.trend}</p>
            </div>
          </div>
        )}
        {!collapsed && user && (
          <div className="px-3 pb-2">
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2">
          <LogOut className="h-4 w-4" />
          {!collapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
