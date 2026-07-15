import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { seoPlugin } from "@payloadcms/plugin-seo";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";

import { AuditLogs } from "./payload/collections/AuditLogs";
import { Campaigns } from "./payload/collections/Campaigns";
import { Categories } from "./payload/collections/Categories";
import { DonationIntents } from "./payload/collections/DonationIntents";
import { DonationFulfillments } from "./payload/collections/DonationFulfillments";
import { Donations } from "./payload/collections/Donations";
import { DonorReports } from "./payload/collections/DonorReports";
import { FieldTasks } from "./payload/collections/FieldTasks";
import { Media } from "./payload/collections/Media";
import { News } from "./payload/collections/News";
import { Pages } from "./payload/collections/Pages";
import { PaymentEvents } from "./payload/collections/PaymentEvents";
import { PaymentSessions } from "./payload/collections/PaymentSessions";
import { ProofAssets } from "./payload/collections/ProofAssets";
import { ProofSubmissions } from "./payload/collections/ProofSubmissions";
import { RefundRequests } from "./payload/collections/RefundRequests";
import { Users } from "./payload/collections/Users";
import { ensureLocalEnvLoaded } from "./lib/env";
import { buildPostgresPoolConfig } from "./lib/postgres";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
ensureLocalEnvLoaded();
const databaseUrl =
  process.env.PAYLOAD_DATABASE_URI || process.env.DATABASE_URL || "";

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || "mizan-dev-secret",
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: " - Mizan Dernegi",
    },
  },
  collections: [
    Users,
    Media,
    Categories,
    Campaigns,
    News,
    Pages,
    DonationIntents,
    PaymentSessions,
    PaymentEvents,
    Donations,
    DonationFulfillments,
    RefundRequests,
    FieldTasks,
    ProofSubmissions,
    ProofAssets,
    DonorReports,
    AuditLogs,
  ],
  db: postgresAdapter({
    pool: buildPostgresPoolConfig(databaseUrl),
    // Supabase schema changes are deployed only through reviewed SQL migrations.
    push: false,
  }),
  editor: lexicalEditor(),
  localization: {
    locales: ["tr", "en", "ar"],
    defaultLocale: "tr",
    fallback: true,
  },
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  plugins: [
    seoPlugin({
      collections: ["campaigns", "news", "pages"],
      uploadsCollection: "media",
      generateTitle: ({ doc }) => {
        const title =
          typeof doc?.title === "string" ? doc.title : doc?.title?.tr || "Mizan Dernegi";
        return `${title} - Mizan Dernegi`;
      },
    }),
  ],
});
