import { GuestOnly } from "@/components/shell/auth-guard";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <GuestOnly>{children}</GuestOnly>;
}
