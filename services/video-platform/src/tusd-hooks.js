import path from "node:path";

import { diskStatus } from "./disk.js";
import { HttpError } from "./errors.js";
import { logger } from "./logger.js";
import { uploadMimeTypes, verifyUploadToken } from "./security/upload-token.js";
import { assertExistingPathWithin } from "./storage.js";
import { consumeUploadGrant, finishUpload, markUploadRejected } from "./upload-repository.js";

function reject(statusCode, code, message) {
  return {
    HTTPResponse: {
      StatusCode: statusCode,
      Header: { "Content-Type": "application/json; charset=utf-8" },
      Body: JSON.stringify({ error: code, message }),
    },
    RejectUpload: true,
  };
}

function uploadFromHook(payload) {
  const upload = payload?.Event?.Upload;
  if (!upload || typeof upload !== "object") throw new HttpError(400, "invalid_hook", "Tus hook yükleme bilgisi eksik.");
  return upload;
}

function cleanFilename(value) {
  return path.basename(String(value || "video"))
    .replace(/[\u0000-\u001f\u007f]/g, "_")
    .slice(0, 180) || "video";
}

export async function resolveFinishedUploadPath(storageRoot, uploadId, suppliedPath) {
  // tusd and video-api mount the same Docker volume at different container
  // paths. Trust the already validated upload ID, not tusd's container-local
  // absolute path, and resolve the file inside video-api's own mount.
  if (path.basename(suppliedPath) !== uploadId) {
    throw new HttpError(409, "upload_path_mismatch", "Upload depolama yolu eşleşmiyor.");
  }
  return assertExistingPathWithin(storageRoot, path.join(storageRoot, uploadId));
}

export async function handlePreCreate(payload, dependencies) {
  const upload = uploadFromHook(payload);
  if (upload.SizeIsDeferred || !Number.isSafeInteger(upload.Size) || upload.Size <= 0) {
    return reject(400, "upload_length_required", "Video boyutu yükleme başlamadan önce belirtilmelidir.");
  }
  if (upload.Size > dependencies.uploadConfig.maxBytes) {
    return reject(413, "upload_too_large", "Video boyutu 2 GB sınırını aşıyor.");
  }

  const metadata = upload.MetaData || {};
  const token = String(metadata.token || "");
  const mimeType = String(metadata.filetype || "").toLowerCase();
  if (!uploadMimeTypes.has(mimeType)) {
    return reject(415, "unsupported_media_type", "Yalnız MP4, MOV ve WebM videolar yüklenebilir.");
  }

  const currentDisk = await diskStatus(dependencies.storage.uploads, dependencies.retentionConfig);
  if (currentDisk.uploadsBlocked) {
    return reject(507, "disk_capacity_block", "Sunucuda güvenli boş alan kalmadığı için yeni upload geçici olarak durduruldu.");
  }

  try {
    const claims = verifyUploadToken(token, dependencies.uploadConfig);
    if (upload.Size > claims.maxBytes || !claims.allowedMime.includes(mimeType)) {
      return reject(403, "upload_scope_mismatch", "Dosya, upload yetkisinin boyut veya tür kapsamıyla eşleşmiyor.");
    }
    const record = await consumeUploadGrant(claims, {
      size: upload.Size,
      mimeType,
    });
    return {
      ChangeFileInfo: {
        ID: record.upload_id,
        MetaData: {
          filename: cleanFilename(metadata.filename),
          filetype: mimeType,
          trustedVideoId: String(record.id),
          trustedGroupId: String(record.group_id),
        },
      },
    };
  } catch (error) {
    if (error instanceof HttpError) return reject(error.statusCode, error.code, error.message);
    throw error;
  }
}

export async function handlePostFinish(payload, dependencies) {
  const upload = uploadFromHook(payload);
  const uploadId = String(upload.ID || "");
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(uploadId)) {
    throw new HttpError(400, "invalid_upload_id", "Tus upload kimliği geçersiz.");
  }
  if (!Number.isSafeInteger(upload.Size) || upload.Size <= 0 || upload.Offset !== upload.Size) {
    await markUploadRejected(uploadId, "Upload tamamlanmadı veya boyut bilgisi geçersiz.");
    throw new HttpError(409, "incomplete_upload", "Upload tamamlanmadı.");
  }
  const suppliedPath = upload.Storage?.Path;
  if (upload.Storage?.Type !== "filestore" || typeof suppliedPath !== "string") {
    await markUploadRejected(uploadId, "Beklenmeyen tusd depolama sürücüsü.");
    throw new HttpError(409, "invalid_upload_storage", "Upload depolama bilgisi geçersiz.");
  }
  if (path.basename(suppliedPath) !== uploadId) {
    await markUploadRejected(uploadId, "Tus depolama yolu upload kimliğiyle eşleşmiyor.");
    throw new HttpError(409, "upload_path_mismatch", "Upload depolama yolu eşleşmiyor.");
  }
  await resolveFinishedUploadPath(dependencies.storage.uploads, uploadId, suppliedPath);
  const result = await finishUpload({
    id: uploadId,
    size: upload.Size,
    offset: upload.Offset,
  });
  logger.info("Tus upload completed", {
    videoId: result.id,
    groupId: result.group_id,
    uploadId,
    idempotent: Boolean(result.idempotent),
  });
  return {};
}

export async function dispatchTusHook(payload, hookName, dependencies) {
  const type = String(payload?.Type || "");
  if (hookName && type !== hookName) throw new HttpError(400, "hook_type_mismatch", "Tus hook türü eşleşmiyor.");
  if (type === "pre-create") return handlePreCreate(payload, dependencies);
  if (type === "post-finish") return handlePostFinish(payload, dependencies);
  throw new HttpError(400, "unsupported_hook", "Desteklenmeyen tus hook türü.");
}
