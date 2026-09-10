import sharp from "sharp";
import { ManualDonationError } from "./manual-validation";

export async function validateManualProof(value: unknown) {
  if (!(value instanceof File) || value.size < 1 || value.size > 10 * 1024 * 1024) throw new ManualDonationError("Dekont en fazla 10 MB olabilir; boş dosya yüklenemez.");
  const bytes = Buffer.from(await value.arrayBuffer());
  if (bytes.subarray(0,5).toString() === "%PDF-") {
    if (value.type !== "application/pdf" || !/\.pdf$/i.test(value.name) || !bytes.subarray(-2048).includes(Buffer.from("%%EOF"))) throw new ManualDonationError("PDF dosyası geçersiz veya dosya türüyle eşleşmiyor.");
    // PDF is only served as a download, never embedded as active page content.
    return {bytes,mime:"application/pdf",extension:"pdf"};
  }
  try {
    const image = sharp(bytes,{limitInputPixels:40_000_000,failOn:"warning"});
    const metadata = await image.metadata();
    const jpeg = metadata.format === "jpeg";
    if (!(jpeg || metadata.format === "png") || value.type !== (jpeg ? "image/jpeg" : "image/png") || !(jpeg ? /\.jpe?g$/i : /\.png$/i).test(value.name)) throw new Error("Format mismatch");
    if ((metadata.pages || 1) > 1) throw new Error("Animated proof");
    const normalized = await image.rotate().resize({width:2400,height:2400,fit:"inside",withoutEnlargement:true}).jpeg({quality:90}).toBuffer();
    return {bytes:normalized,mime:"image/jpeg",extension:"jpg"};
  } catch { throw new ManualDonationError("Dekont geçerli JPG, PNG veya PDF olmalıdır. Görseller en fazla 40 megapiksel olabilir."); }
}
