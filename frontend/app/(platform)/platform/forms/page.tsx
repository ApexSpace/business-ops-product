import {
  FormsHostProvider,
  PLATFORM_FORMS_HOST,
} from "@/features/forms/forms-host-context";
import { FormsListPage } from "@/features/forms/pages/forms-list-page";

export default function PlatformFormsPage() {
  return (
    <FormsHostProvider value={PLATFORM_FORMS_HOST}>
      <FormsListPage />
    </FormsHostProvider>
  );
}
