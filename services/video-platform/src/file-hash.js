import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export function hashFile(pathname) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const input = createReadStream(pathname);
    input.on("error", reject);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("end", () => resolve(hash.digest("hex")));
  });
}
