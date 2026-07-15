"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { USER_ROLES, type UserRole } from "@/lib/auth/roles";
import { getPayloadClient } from "@/lib/payload";

export type UserActionState = {
  message: string | null;
  success: boolean;
};

function text(formData: FormData, name: string, required = false) {
  const value = String(formData.get(name) || "").trim();
  if (required && !value) throw new Error(`${name} zorunludur.`);
  return value;
}

function role(formData: FormData): UserRole {
  const value = text(formData, "role", true);
  if (!USER_ROLES.includes(value as UserRole)) throw new Error("Geçersiz rol.");
  return value as UserRole;
}

function password(formData: FormData, required: boolean) {
  const value = String(formData.get("password") || "");
  if (!value && !required) return undefined;
  if (value.length < 12) throw new Error("Şifre en az 12 karakter olmalıdır.");
  return value;
}

export async function savePanelUser(_: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await requireAdminUser(PANEL_ROUTE_ACCESS.users);

  try {
    const payload = await getPayloadClient();
    const id = text(formData, "id");
    const nextRole = role(formData);
    const isActive = formData.get("isActive") === "on";
    const data = {
      email: text(formData, "email", true).toLocaleLowerCase("tr-TR"),
      isActive,
      name: text(formData, "name", true),
      role: nextRole,
    };

    if (id) {
      if (String(actor.id) === id && (!isActive || nextRole !== "super_admin")) {
        return { message: "Kendi hesabınızı pasifleştiremez veya süper yönetici rolünüzü kaldıramazsınız.", success: false };
      }

      const nextPassword = password(formData, false);
      await payload.update({ collection: "users", data: nextPassword ? { ...data, password: nextPassword } : data, id });
    } else {
      const nextPassword = password(formData, true);
      await payload.create({ collection: "users", data: { ...data, password: nextPassword } });
    }

    revalidatePath("/panel/kullanicilar");
    return { message: id ? "Personel hesabı güncellendi." : "Yeni personel hesabı oluşturuldu.", success: true };
  } catch {
    return { message: "Hesap kaydedilemedi. E-posta adresinin benzersiz olduğunu ve tüm alanları kontrol edin.", success: false };
  }
}
