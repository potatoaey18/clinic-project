import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fullName } from "@/lib/format";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  Building2,
  Settings,
  Stethoscope,
  CalendarClock,
  ShieldCheck,
  Star,
  History,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Patients", url: "/patients", icon: Users },
  { title: "Appointments", url: "/appointments", icon: CalendarClock },
  { title: "My Schedule", url: "/schedule", icon: CalendarDays },
  { title: "Consultations", url: "/consultations", icon: ClipboardList },
];

const admin = [
  { title: "Clinics", url: "/clinics", icon: Building2 },
  { title: "Audit log", url: "/audit", icon: ShieldCheck },
  { title: "Settings", url: "/settings", icon: Settings },
];

type PatientRef = { id: string; first_name: string; last_name: string };

export function AppSidebar({ userId }: { userId: string }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) =>
    url === "/dashboard" ? currentPath === url : currentPath === url || currentPath.startsWith(url + "/");

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_favorites")
        .select("patient:patients(id, first_name, last_name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []).map((r) => r.patient).filter((p): p is PatientRef => !!p);
    },
  });

  const { data: recentlyViewed = [] } = useQuery({
    queryKey: ["recently-viewed", userId],
    queryFn: async () => {
      const { data: logs } = await supabase
        .from("audit_logs")
        .select("entity_id")
        .eq("user_id", userId)
        .eq("entity", "patient")
        .eq("action", "view")
        .order("created_at", { ascending: false })
        .limit(20);
      const ids: string[] = [];
      for (const l of logs ?? []) {
        if (l.entity_id && !ids.includes(l.entity_id)) ids.push(l.entity_id);
        if (ids.length >= 5) break;
      }
      if (ids.length === 0) return [];
      const { data: patients } = await supabase.from("patients").select("id, first_name, last_name").in("id", ids);
      const byId = new Map((patients ?? []).map((p) => [p.id, p]));
      return ids.map((id) => byId.get(id)).filter((p): p is PatientRef => !!p);
    },
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2 font-semibold tracking-tight">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Stethoscope className="h-4 w-4" />
          </div>
          {!collapsed && <span>MedFolio</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Clinical</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && favorites.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Favorites</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {favorites.map((p) => (
                  <SidebarMenuItem key={p.id}>
                    <SidebarMenuButton asChild isActive={currentPath === `/patients/${p.id}`}>
                      <Link to="/patients/$patientId" params={{ patientId: p.id }} className="flex items-center gap-2">
                        <Star className="h-4 w-4 shrink-0 fill-current text-amber-500" />
                        <span className="truncate">{fullName(p)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!collapsed && recentlyViewed.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Recently viewed</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {recentlyViewed.map((p) => (
                  <SidebarMenuItem key={p.id}>
                    <SidebarMenuButton asChild isActive={currentPath === `/patients/${p.id}`}>
                      <Link to="/patients/$patientId" params={{ patientId: p.id }} className="flex items-center gap-2">
                        <History className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{fullName(p)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Practice</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {admin.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
