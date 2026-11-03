export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setDefaultResultOrder } = await import("dns");
    setDefaultResultOrder("ipv4first");
    const { isMaintenanceMode } = await import("@/app/lib/maintenance");
    if (isMaintenanceMode()) {
      console.log("[instrumentation] Maintenance mode aktif, database dilewati.");
      return;
    }
    const { ensureAdminUser } = await import("@/app/lib/auth");
    await ensureAdminUser();
    console.log("[instrumentation] Admin user ensured.");
  }
}