import type { Metadata } from "next";

import { Graveyard } from "@/components/features/catalog/graveyard";

export const metadata: Metadata = {
  title: "Tool Graveyard",
  description:
    "Tools that are deprecated or unsuitable for production, with the reason and what to use instead.",
};

export default function Page() {
  return <Graveyard />;
}
