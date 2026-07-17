// Compatibility alias for clients that append `/v1/models` to the API host.
import { GET as packageGet, OPTIONS as packageOptions } from "../../models/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return packageOptions();
}

export function GET(request: Request) {
  return packageGet(request);
}
