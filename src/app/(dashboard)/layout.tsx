import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { PageWrapper } from "@/components/motion/page-wrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>
        <PageWrapper>{children}</PageWrapper>
      </AppShell>
    </AuthGuard>
  );
}
