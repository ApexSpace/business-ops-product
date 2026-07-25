import {
  FormsHostProvider,
  PLATFORM_FORMS_HOST,
} from "@/features/forms/forms-host-context";
import { FormBuilderPage } from "@/features/forms/pages/form-builder-page";

export default function PlatformFormsNewPage() {
  return (
    <FormsHostProvider value={PLATFORM_FORMS_HOST}>
      <FormBuilderPage mode="create" />
    </FormsHostProvider>
  );
}
