export type CampaignSaveIntent = "draft" | "publish" | "update";

export class CampaignInputError extends Error {}

/** UI intent is not authorization. The server action must separately require admin. */
export function validateCampaignSaveIntent(form: FormData) {
  const intent = form.get("saveIntent");
  const status = form.get("status");
  const id = form.get("id");
  if (
    !["draft", "active", "closed", "archived"].includes(String(status)) ||
    !["draft", "publish", "update"].includes(String(intent))
  ) {
    throw new CampaignInputError("Son kontrol adımında Taslak kaydet veya Yayınla işlemini seçin.");
  }
  if (
    (intent === "draft" && status !== "draft") ||
    (intent === "publish" && status !== "active") ||
    (intent === "update" && (typeof id !== "string" || !/^[1-9]\d*$/.test(id))) ||
    (!id && (status === "closed" || status === "archived"))
  ) {
    throw new CampaignInputError("Kaydetme işlemi kampanya durumuyla eşleşmiyor.");
  }
}
