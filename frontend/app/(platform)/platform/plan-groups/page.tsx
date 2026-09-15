import { redirect } from "next/navigation";

/** Plan groups removed from product surface — Tiers are the sellable unit. */
export default function PlanGroupsRedirectPage() {
  redirect("/platform/tiers");
}
