import { auth } from "@/app/lib/auth";
import { getUsageFilterOptions } from "@/app/lib/usage-stats";
import { UsageAnalytics } from "./usage-analytics";

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const options = await getUsageFilterOptions(userId);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.045] to-transparent px-5 py-6 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent/[0.08] blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent sm:grid">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M4 19V9m6 10V5m6 14v-7m4 7H2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              <span className="h-px w-5 bg-accent/60" />
              Analitik workspace
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pemakaian & biaya</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Pantau konsumsi kredit, performa model, dan seluruh riwayat request AI dalam satu tampilan.
            </p>
          </div>
        </div>
      </div>
      <UsageAnalytics
        modelOptions={options.models}
        providerOptions={options.providers}
      />
    </div>
  );
}
