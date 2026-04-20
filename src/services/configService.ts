import type { ResolvedAppConfig } from "@/types/app";
import { callBackend } from "@/services/backendClient";

export async function getAppConfig(): Promise<ResolvedAppConfig> {
  return callBackend<ResolvedAppConfig>("get_app_config");
}
