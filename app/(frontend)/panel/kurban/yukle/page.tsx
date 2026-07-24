import { notFound } from "next/navigation";

import { ManagementShell } from "@/components/admin/management-shell";
import { QurbaniUploadSelector } from "@/components/admin/qurbani-upload-selector";
import { QurbaniVideoUploader } from "@/components/admin/qurbani-video-uploader";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getPayloadClient } from "@/lib/payload";
import { verifyQurbaniFieldToken } from "@/lib/qurbani/field-token";

export const dynamic = "force-dynamic";

function relationId(value: unknown) {
  return typeof value === "object" && value && "id" in value
    ? String((value as { id: string | number }).id)
    : String(value || "");
}

function relationTitle(value: unknown, fallback: string) {
  if (!value || typeof value !== "object") return fallback;
  const record = value as { title?: unknown; name?: unknown };
  return String(record.title || record.name || fallback);
}

export default async function QurbaniVideoUploadPage({ searchParams }: { searchParams: Promise<{ pool?: string; token?: string }> }) {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.qurbani);
  const { pool: poolId = "", token = "" } = await searchParams;
  const payload = await getPayloadClient();

  if (!poolId) {
    const result = await payload.find({
      collection: "qurbani-pools",
      where: { status: { in: ["assigned", "in_progress"] } },
      pagination: false,
      sort: "code",
      depth: 2,
      overrideAccess: true,
    });
    const pools = result.docs
      .filter((pool) => {
        if (user.role === "super_admin") return Boolean(pool.fieldTask);
        const task = typeof pool.fieldTask === "object" ? pool.fieldTask : null;
        return relationId(task?.assignedTo) === String(user.id);
      })
      .map((pool) => ({
        id: String(pool.id),
        code: String(pool.code || `Havuz ${pool.id}`),
        productTitle: relationTitle(pool.product, "Kurban"),
        taskTitle: relationTitle(pool.fieldTask, "Saha görevi"),
      }));
    return (
      <ManagementShell
        currentPath="/panel/kurban"
        name={user.name || user.email}
        role={user.role}
      >
        <QurbaniUploadSelector pools={pools} />
      </ManagementShell>
    );
  }

  const pool = await payload.findByID({ collection: "qurbani-pools", id: poolId, depth: 1, overrideAccess: true }).catch(() => null);
  if (!pool) notFound();
  const taskId = relationId(pool.fieldTask);
  const assignedTo = typeof pool.fieldTask === "object" && pool.fieldTask ? relationId(pool.fieldTask.assignedTo) : null;
  if (user.role === "field_operator" && String(assignedTo || "") !== String(user.id)) notFound();
  if (token) {
    const grant = verifyQurbaniFieldToken(token);
    if (!grant || grant.poolId !== String(pool.id) || grant.taskId !== taskId) notFound();
  }
  return <ManagementShell currentPath="/panel/kurban" name={user.name || user.email} role={user.role}><QurbaniVideoUploader poolCode={String(pool.code || "")} poolId={String(pool.id)} /></ManagementShell>;
}
