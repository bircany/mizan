import { getPayload } from "payload";
if (process.env.MIZAN_LOCAL_ACCEPTANCE !== "1" || process.env.PAYLOAD_DATABASE_URI !== "postgresql://postgres@127.0.0.1:55440/mizan_acceptance_local") throw new Error("Local only");
const { default: config } = await import("../payload.config");
const payload = await getPayload({ config });
for (const role of ["admin", "field_operator"] as const) {
  const email = role === "admin" ? "admin@mizan.local" : "saha@mizan.local";
  const existing = await payload.find({ collection: "users", where: { email: { equals: email } }, overrideAccess: true, limit: 1 });
  if (!existing.docs.length) await payload.create({ collection: "users", overrideAccess: true, data: { email, name: `Yerel Test ${role}`, password: "Mizan-Yerel-Test-2026!", role, isActive: true } });
  console.log(`Yerel hesap hazır: ${email}`);
}
await payload.destroy();
process.exit(0);
