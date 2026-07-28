import { ensureLocalEnvLoaded } from "../lib/env";
import { purgeAllQurbaniData } from "../lib/qurbani/cleanup";

async function main() {
  ensureLocalEnvLoaded();

  const force = process.argv.includes("--yes");
  const includeCountries = process.argv.includes("--include-countries");

  if (!force) {
    console.log("Dry run only. Run again with --yes to delete qurbani-related records.");
    console.log("Example: tsx scripts/purge-qurbani-data.ts --yes");
    return;
  }

  const result = await purgeAllQurbaniData({ includeCountries });

  console.log("Qurbani cleanup completed.");
  console.log(`- total deleted: ${result.totalDeleted}`);
  console.log(`- seasons: ${result.seasonsDeleted}`);
  console.log(`- products: ${result.productsDeleted}`);
  console.log(`- orders: ${result.ordersDeleted}`);
  console.log(`- donations: ${result.donationsDeleted}`);
  console.log(`- donation intents: ${result.donationIntentsDeleted}`);
  console.log(`- ledger entries: ${result.ledgerEntriesDeleted}`);
}

main().catch((error) => {
  console.error("Qurbani cleanup failed:", error);
  process.exit(1);
});
