import { redirect } from "next/navigation";

import { PanelLoginForm } from "@/components/admin/panel-login-form";
import { getAdminSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Personel Girişi | Mizan Derneği",
  robots: { index: false, follow: false },
};

export default async function PanelLoginPage() {
  const user = await getAdminSession();

  if (user?.role) {
    redirect("/panel");
  }

  return <PanelLoginForm />;
}
