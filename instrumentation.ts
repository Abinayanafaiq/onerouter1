export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureAdminUser } = await import("@/app/lib/auth");
    await ensureAdminUser();
    console.log("[instrumentation] Admin user ensured.");
  }
}