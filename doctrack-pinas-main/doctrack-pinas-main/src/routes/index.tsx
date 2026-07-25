import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Activity, ShieldCheck, Stethoscope, Users2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedFolio — Clinic Management System for the Philippines" },
      {
        name: "description",
        content:
          "Modern cloud EMR for small clinics, private practices and freelance doctors in the Philippines. Manage patients, consultations, prescriptions and lab results from anywhere.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="h-4 w-4" />
          </div>
          MedFolio
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>
              Get started
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-24">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Built for Filipino clinics & freelance doctors
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            The clinic record system your practice actually enjoys using.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Replace paper charts with a secure, cloud-based EMR. Manage patients,
            consultations, prescriptions and lab results across every clinic you practice in
            — from any device.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth">I have an account</Link>
            </Button>
          </div>
        </section>

        <section className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Users2,
              title: "Multi-clinic ready",
              text: "One account, every clinic. See your patients and schedule across all practices.",
            },
            {
              icon: Activity,
              title: "Full patient history",
              text: "SOAP notes, vitals trends, prescriptions and labs on one timeline.",
            },
            {
              icon: ShieldCheck,
              title: "PH Data Privacy Act",
              text: "Row-level security, encrypted storage and audit-ready by design.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-md border border-border bg-card p-6"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} MedFolio</span>
          <span>Made for clinics in the Philippines</span>
        </div>
      </footer>
    </div>
  );
}
