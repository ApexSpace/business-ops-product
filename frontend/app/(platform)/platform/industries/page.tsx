import { redirect } from "next/navigation";

/** Industries UI hidden — MedSpa-only product. */
export default function IndustriesRedirectPage() {
  redirect("/platform/tiers");
}
