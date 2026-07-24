import { ContentManagementPage } from "@/components/admin/content-management-page";
import { CONTENT_DEFINITIONS, getContentRecords } from "@/lib/admin/content";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";

export default async function CampaignContentPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentCampaigns);
  const payload = await getPayloadClient();
  const categoriesResult = await payload.find({ collection: "categories", limit: 100, sort: "sortOrder", pagination: false, where: { isActive: { equals: true } } });
  const records = await getContentRecords("campaigns");
  const categoryOptions = categoriesResult.docs.map((category) => {
    const record = category as unknown as Record<string, unknown>;
    const title =
      typeof record.name === "string"
        ? record.name
        : record.name && typeof record.name === "object" && "tr" in record.name
          ? String((record.name as { tr?: unknown }).tr || "")
          : "";

    return {
      label: title || (typeof record.slug === "string" && record.slug ? record.slug : `Kategori ${String(record.id)}`),
      value: String(record.id),
    };
  });

  const definition = {
    ...CONTENT_DEFINITIONS.campaigns,
    fields: CONTENT_DEFINITIONS.campaigns.fields.map((field) =>
      field.name === "category" ? { ...field, options: categoryOptions } : field,
    ),
  };

  return <ContentManagementPage currentPath="/panel/icerik/bagis-alanlari" definition={definition} records={records} user={user} />;
}
