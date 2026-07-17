// Some OpenAI clients append `/v1/chat/completions` to the configured API
// host. Keep this alias so `https://9inference.cloud/v1/package` works in
// those clients without duplicating the package billing pipeline.
import {
  OPTIONS as packageOptions,
  POST as packagePost,
} from "../../../chat/completions/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return packageOptions();
}

export function POST(request: Request) {
  return packagePost(request);
}
