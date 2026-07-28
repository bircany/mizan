import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { seoPlugin } from "@payloadcms/plugin-seo";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { AuditLogs } from "./payload/collections/AuditLogs";
import { Campaigns } from "./payload/collections/Campaigns";
import { Categories } from "./payload/collections/Categories";
import { ChildDonationSettings } from "./payload/collections/ChildDonationSettings";
import { ContactMessages } from "./payload/collections/ContactMessages";
import { DonationIntents } from "./payload/collections/DonationIntents";
import { DonationParticipants } from "./payload/collections/DonationParticipants";
import { DonationFulfillments } from "./payload/collections/DonationFulfillments";
import { Donations } from "./payload/collections/Donations";
import { DeliveryMessages } from "./payload/collections/DeliveryMessages";
import { Media } from "./payload/collections/Media";
import { News } from "./payload/collections/News";
import { NewsCategories } from "./payload/collections/NewsCategories";
import { OperationGroupMembers } from "./payload/collections/OperationGroupMembers";
import { OperationGroups } from "./payload/collections/OperationGroups";
import { OperationVideos } from "./payload/collections/OperationVideos";
import { Pages } from "./payload/collections/Pages";
import { PanelSettings } from "./payload/collections/PanelSettings";
import { PaymentEvents } from "./payload/collections/PaymentEvents";
import { PaymentSessions } from "./payload/collections/PaymentSessions";
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
    ContactMessages,
    ChildDonationSettings,
    Campaigns,
    NewsCategories,
    News,
    Pages,
    PanelSettings,
    DonationIntents,
    DonationParticipants,
    PaymentSessions,
    PaymentEvents,
    Donations,
    OperationGroups,
    OperationGroupMembers,
    OperationVideos,
    DeliveryMessages,
    DonationFulfillments,
    RefundRequests,
    AuditLogs,
  ],
  db: postgresAdapter({
    pool: buildPostgresPoolConfig(databaseUrl),
    // Supabase schema changes are deployed only through reviewed SQL migrations.
    push: false,
  }),
  editor: lexicalEditor(),
  sharp,
  localization: {
    locales: ["tr", "en", "ar"],
    defaultLocale: "tr",
    fallback: true,
  },
  typescript: {
    declare: false,
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
