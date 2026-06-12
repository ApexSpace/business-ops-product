import { isFormsBuilderRoute } from "@/lib/config/navigation/full-screen-editor-routes";

/** Form builder routes use the full-screen editor shell (no app sidebar/topbar). */
export function isFormBuilderPath(pathname: string): boolean {
  return isFormsBuilderRoute(pathname);
}
