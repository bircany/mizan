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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
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
  } catch (error) {
    return {
      message: getErrorMessage(error, "Görev kaydedilemedi. Bağış alanı, saha görevlisi ve zorunlu alanları kontrol edin."),
      success: false,
    };
  }
}
