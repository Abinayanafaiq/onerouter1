import { auth } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const name = session?.user?.name ?? "—";
  const email = session?.user?.email ?? "—";
  const role = (session?.user as { role?: string } | undefined)?.role ?? "USER";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Manage your account and workspace preferences.
        </p>
      </header>

      {/* Profile */}
      <section className="glass animate-fade-up-delay-1 rounded-2xl p-6">
        <h2 className="text-sm font-semibold tracking-tight">Profile</h2>
        <div className="mt-4 flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-accent/80 to-[#6366F1]/80 text-base font-bold text-black">
            {(name || email).slice(0, 2).toUpperCase()}
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">{name}</div>
            <div className="text-xs text-muted-foreground">{email}</div>
            <span className="mt-1.5 inline-block rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {role === "ADMIN" ? "Administrator" : "Developer"}
            </span>
          </div>
        </div>
      </section>

      {/* Sections (coming soon) */}
      <section className="grid gap-4 sm:grid-cols-2">
        {[
          {
            title: "Security",
            desc: "Password, two-factor authentication, and active sessions.",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
                <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            ),
          },
          {
            title: "Notifications",
            desc: "Email alerts for low balance, usage spikes, and billing.",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
          {
            title: "Usage limits",
            desc: "Set monthly spend caps and per-key rate limits.",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
                <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0ZM12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
          {
            title: "Danger zone",
            desc: "Export data or permanently delete your workspace.",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-9 0v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
        ].map((s) => (
          <div key={s.title} className="glass card-hover rounded-2xl p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-muted-foreground">
                {s.icon}
              </span>
              <h3 className="text-sm font-semibold tracking-tight">{s.title}</h3>
              <span className="ml-auto rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-muted-foreground">
                Soon
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
