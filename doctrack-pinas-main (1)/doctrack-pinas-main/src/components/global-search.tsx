import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Stethoscope, CalendarClock, Building2, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { searchEverything } from "@/lib/search";
import { fullName, formatDate } from "@/lib/format";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", query],
    queryFn: () => searchEverything(query),
    enabled: open && query.trim().length > 1,
  });

  function go(fn: () => void) {
    fn();
    setOpen(false);
    setQuery("");
  }

  const hasResults = !!data && (data.patients.length + data.consultations.length + data.appointments.length + data.clinics.length > 0);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-full max-w-64 justify-start gap-2 text-muted-foreground font-normal"
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search everything…</span>
        <span className="sm:hidden">Search…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search patients, consultations, appointments, clinics…" value={query} onValueChange={setQuery} />
        <CommandList>
          {query.trim().length <= 1 ? (
            <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
          ) : isFetching ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Searching…</div>
          ) : !hasResults ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : (
            <>
              {data!.patients.length > 0 && (
                <CommandGroup heading="Patients">
                  {data!.patients.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`patient-${p.id}`}
                      onSelect={() => go(() => navigate({ to: "/patients/$patientId", params: { patientId: p.id } }))}
                    >
                      <Users className="text-muted-foreground" />
                      <span>{fullName(p)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{p.clinic?.name ?? ""}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {data!.consultations.length > 0 && (
                <CommandGroup heading="Consultations">
                  {data!.consultations.map((c) => {
                    const p = c.patient;
                    return (
                      <CommandItem
                        key={c.id}
                        value={`consult-${c.id}`}
                        onSelect={() => go(() => navigate({ to: "/patients/$patientId", params: { patientId: p!.id } }))}
                      >
                        <Stethoscope className="text-muted-foreground" />
                        <span>{p ? fullName(p) : "—"}</span>
                        <span className="ml-auto max-w-48 truncate text-xs text-muted-foreground">
                          {c.diagnosis ?? c.chief_complaint ?? formatDate(c.consult_date)}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              {data!.appointments.length > 0 && (
                <CommandGroup heading="Appointments">
                  {data!.appointments.map((a) => {
                    const p = a.patient;
                    return (
                      <CommandItem
                        key={a.id}
                        value={`appt-${a.id}`}
                        onSelect={() => go(() => navigate({ to: "/appointments" }))}
                      >
                        <CalendarClock className="text-muted-foreground" />
                        <span>{p ? fullName(p) : "—"}</span>
                        <span className="ml-auto max-w-48 truncate text-xs text-muted-foreground">{a.reason ?? formatDate(a.starts_at)}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              {data!.clinics.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Clinics">
                    {data!.clinics.map((c) => (
                      <CommandItem key={c.id} value={`clinic-${c.id}`} onSelect={() => go(() => navigate({ to: "/clinics" }))}>
                        <Building2 className="text-muted-foreground" />
                        <span>{c.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
