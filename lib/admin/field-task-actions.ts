"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/admin/data";
import { getPayloadClient } from "@/lib/payload";

export type FieldTaskActionState = {
  message: string | null;
  success: boolean;
};

function text(formData: FormData, name: string, required = false) {
  const value = String(formData.get(name) || "").trim();
  if (required && !value) throw new Error(`${name} zorunludur.`);
  return value;
}

export async function saveFieldTask(_: FieldTaskActionState, formData: FormData): Promise<FieldTaskActionState> {
  await requireAdminUser(["super_admin", "approver"]);

  try {
    const id = text(formData, "id");
    const dueAt = text(formData, "dueAt");
    const payload = await getPayloadClient();
    const data = {
      assignedTo: text(formData, "assignedTo", true),
      campaign: text(formData, "campaign", true),
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      location: text(formData, "location", true),
      notes: text(formData, "notes"),
      title: text(formData, "title", true),
    };

    if (id) {
      await payload.update({ collection: "field-tasks", data, id });
    } else {
      await payload.create({ collection: "field-tasks", data });
    }

    revalidatePath("/panel/saha");
    revalidatePath("/panel/saha/teslimler");
    revalidatePath("/panel");
    return { message: id ? "Saha görevi güncellendi." : "Saha görevi oluşturuldu.", success: true };
  } catch {
    return { message: "Görev kaydedilemedi. Kampanya, saha görevlisi ve zorunlu alanları kontrol edin.", success: false };
  }
}
