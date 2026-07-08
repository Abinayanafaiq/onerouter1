import { setDefaultResultOrder } from "dns";

export async function register() {
  setDefaultResultOrder("ipv4first");
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureAdminUser } = await import("@/app/lib/auth");
    await ensureAdminUser();
    console.log("[instrumentation] Admin user ensured.");
  }
}