import type { Metadata } from "next";

import { SettingsView } from "@/components/features/settings/settings-view";

export const metadata: Metadata = {
  title: "Settings",
  description: "Appearance, profile, and account.",
};

export default function Page() {
  return <SettingsView />;
}
