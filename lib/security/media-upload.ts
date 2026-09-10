import { randomUUID } from "node:crypto";
import sharp from "sharp";

export async function normalizeMediaUpload(file: { data: Buffer; name: string; mimetype: string; size: number }) {
  const max = 10 * 1024 * 1024;
  if (!file.size || file.size > max || !file.data.length || file.data.length > max) {
    throw new Error("Görsel en fazla 10 MB olabilir ve boş olamaz.");
  }
  try {
    const image = sharp(file.data, { limitInputPixels: 40_000_000, failOn: "warning" });
    const meta = await image.metadata();
    const allowed = { jpeg: ["image/jpeg", /\.jpe?g$/i], png: ["image/png", /\.png$/i], webp: ["image/webp", /\.webp$/i] } as const;
    const format = meta.format as keyof typeof allowed;
    if (!allowed[format] || allowed[format][0] !== file.mimetype || !allowed[format][1].test(file.name) || (meta.pages || 1) !== 1) throw new Error("Format");
    // Decode all pixels, strip metadata and trailing payloads, never keep user filenames.
    const data = await image.rotate().resize({ width: 3840, height: 3840, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
    return { ...file, data, size: data.length, name: `${randomUUID()}.webp`, mimetype: "image/webp" };
  } catch {
    throw new Error("Geçerli, tek kareli JPG, PNG veya WebP yükleyin (en fazla 40 megapiksel).");
  }
}
