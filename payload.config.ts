import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { seoPlugin } from "@payloadcms/plugin-seo";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { AuditLogs } from "./payload/collections/AuditLogs";
import { Campaigns } from "./payload/collections/Campaigns";
import { CampaignFundingPools } from "./payload/collections/CampaignFundingPools";
import { Categories } from "./payload/collections/Categories";
import { DonationIntents } from "./payload/collections/DonationIntents";
import { DonationFulfillments } from "./payload/collections/DonationFulfillments";
import { Donations } from "./payload/collections/Donations";
import { DonorReports } from "./payload/collections/DonorReports";
import { FieldTasks } from "./payload/collections/FieldTasks";
import { Media } from "./payload/collections/Media";
import { News } from "./payload/collections/News";
import { NewsCategories } from "./payload/collections/NewsCategories";
import { Pages } from "./payload/collections/Pages";
import { PaymentEvents } from "./payload/collections/PaymentEvents";
import { PaymentSessions } from "./payload/collections/PaymentSessions";
import { PanelSettings } from "./payload/collections/PanelSettings";
import { ProofAssets } from "./payload/collections/ProofAssets";
import { ProofSubmissions } from "./payload/collections/ProofSubmissions";
import { QurbaniAccessLinks } from "./payload/collections/QurbaniAccessLinks";
import { QurbaniAllocations } from "./payload/collections/QurbaniAllocations";
import { QurbaniCheckoutLines } from "./payload/collections/QurbaniCheckoutLines";
import { QurbaniCheckouts } from "./payload/collections/QurbaniCheckouts";
import { QurbaniCountries } from "./payload/collections/QurbaniCountries";
import { QurbaniDocuments } from "./payload/collections/QurbaniDocuments";
import { QurbaniFieldPackageItems } from "./payload/collections/QurbaniFieldPackageItems";
import { QurbaniFieldPackages } from "./payload/collections/QurbaniFieldPackages";
import { QurbaniInventoryHolds } from "./payload/collections/QurbaniInventoryHolds";
import { QurbaniJobs } from "./payload/collections/QurbaniJobs";
import { QurbaniMessages } from "./payload/collections/QurbaniMessages";
import { QurbaniOrders } from "./payload/collections/QurbaniOrders";
import { QurbaniPools } from "./payload/collections/QurbaniPools";
import { QurbaniPriceRevisions } from "./payload/collections/QurbaniPriceRevisions";
import { QurbaniProducts } from "./payload/collections/QurbaniProducts";
import { QurbaniSeasons } from "./payload/collections/QurbaniSeasons";
import { QurbaniShares } from "./payload/collections/QurbaniShares";
import { QurbaniStockBatchLines } from "./payload/collections/QurbaniStockBatchLines";
import { QurbaniStockBatches } from "./payload/collections/QurbaniStockBatches";
import { QurbaniVideos } from "./payload/collections/QurbaniVideos";
import { QurbaniRegions } from "./payload/collections/QurbaniRegions";
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
    CampaignFundingPools,
    NewsCategories,
    News,
    Pages,
    QurbaniSeasons,
    QurbaniCountries,
    QurbaniRegions,
    QurbaniProducts,
    QurbaniStockBatches,
    QurbaniStockBatchLines,
    QurbaniPriceRevisions,
    QurbaniPools,
    QurbaniCheckouts,
    QurbaniCheckoutLines,
    QurbaniInventoryHolds,
    QurbaniOrders,
    QurbaniShares,
    QurbaniAllocations,
    QurbaniFieldPackages,
    QurbaniFieldPackageItems,
    QurbaniDocuments,
    QurbaniVideos,
    QurbaniAccessLinks,
    QurbaniMessages,
    QurbaniJobs,
    DonationIntents,
    PaymentSessions,
    PanelSettings,
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
