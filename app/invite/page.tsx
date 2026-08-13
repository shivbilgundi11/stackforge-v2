import type { Metadata } from "next";
import { Suspense } from "react";

import { InviteAccept } from "@/components/features/team/invite-accept";

/**
 * The invitation accept page (M21). Deliberately outside both route groups:
 * `(auth)` bounces signed-in users away and `(app)` bounces signed-out ones,
 * and all three acceptance paths land here — signed in, sign-in-first, and
 * signup-from-invite.
 */
export const metadata: Metadata = {
  title: "Team invitation",
  robots: { index: false },
};

// The token decides everything; there is nothing to prerender.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense>
      <InviteAccept />
    </Suspense>
  );
}
