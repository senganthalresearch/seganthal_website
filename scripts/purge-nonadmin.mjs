import mongodb from "mongodb";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import path from "node:path";

const mode = process.argv[2];
const { MongoClient, BSON: { EJSON } } = mongodb;
if (!["--backup-only", "--apply"].includes(mode)) throw new Error("Use --backup-only or --apply <backup-file>.");
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
await client.connect();
try {
  const database = client.db(process.env.MONGODB_DB || "senganthal");
  const owners = (process.env.ADMIN_EMAILS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!owners.length) throw new Error("ADMIN_EMAILS must contain at least one administrator.");
  const adminRecords = await database.collection("members").find({ role: "admin" }, { projection: { email: 1 } }).toArray();
  const adminEmails = [...new Set([...owners, ...adminRecords.map(value => value.email).filter(Boolean)])];
  const nonAdminMembers = await database.collection("members").find({ role: { $ne: "admin" }, email: { $nin: adminEmails } }, { projection: { email: 1 } }).toArray();
  const removedEmails = nonAdminMembers.map(value => value.email).filter(Boolean);
  const collections = (await database.listCollections({}, { nameOnly: true }).toArray()).map(value => value.name);
  const outputDirectory = path.join(process.cwd(), ".data", "purge-backups");
  await mkdir(outputDirectory, { recursive: true });
  if (mode === "--backup-only") {
    const documents = {};
    for (const name of collections) documents[name] = await database.collection(name).find({}).toArray();
    const manifest = { database: database.databaseName, createdAt: new Date().toISOString(), adminEmails, nonAdminMembers: removedEmails.length, documents };
    const bytes = gzipSync(Buffer.from(EJSON.stringify(manifest)));
    const digest = createHash("sha256").update(bytes).digest("hex");
    const file = path.join(outputDirectory, `before-paid-launch-${new Date().toISOString().replace(/[:.]/g, "-")}.json.gz`);
    await writeFile(file, bytes, { flag: "wx", mode: 0o600 });
    await writeFile(`${file}.sha256`, `${digest}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ backup: file, sha256: digest, adminCount: adminEmails.length, nonAdminMembers: removedEmails.length, collectionCounts: Object.fromEntries(Object.entries(documents).map(([key, rows]) => [key, rows.length])) }));
  } else {
    const file = process.argv[3];
    if (!file) throw new Error("Pass the backup file path after --apply.");
    const absolute = path.resolve(file);
    if (!absolute.startsWith(outputDirectory + path.sep)) throw new Error("Backup must be in .data/purge-backups.");
    const bytes = await readFile(absolute);
    const expected = (await readFile(`${absolute}.sha256`, "utf8")).trim();
    if (createHash("sha256").update(bytes).digest("hex") !== expected) throw new Error("Backup checksum mismatch.");
    const backup = EJSON.parse(gunzipSync(bytes).toString("utf8"));
    const backedUpEmails = (backup.documents.members || []).filter(value => value.role !== "admin" && !adminEmails.includes(value.email)).map(value => value.email).sort();
    if (backup.database !== database.databaseName || JSON.stringify([...backup.adminEmails].sort()) !== JSON.stringify([...adminEmails].sort()) || JSON.stringify(backedUpEmails) !== JSON.stringify([...removedEmails].sort())) {
      throw new Error("Database or member set changed after backup. Create a fresh backup before purging.");
    }
    const activeSubscriptions = await database.collection("subscriptions").countDocuments({ email: { $in: removedEmails }, status: { $in: ["active", "authenticated", "pending", "halted"] } });
    if (activeSubscriptions) throw new Error("Cancel non-admin subscriptions before purging accounts.");
    const results = {};
    const byEmail = ["users", "presence", "messages", "phoneCredentials", "subscriptions"];
    const byOwner = ["preferences", "portfolio", "visits", "watchlist", "transactions", "ledgers", "stakeScans", "reports"];
    for (const name of byEmail) if (collections.includes(name)) results[name] = (await database.collection(name).deleteMany({ email: { $nin: adminEmails } })).deletedCount;
    const removedSubscriptions = (backup.documents.subscriptions || []).filter(value => removedEmails.includes(value.email)).map(value => value.subscriptionId).filter(Boolean);
    if (collections.includes("paymentEvents") && removedSubscriptions.length) results.paymentEvents = (await database.collection("paymentEvents").deleteMany({ subscriptionId: { $in: removedSubscriptions } })).deletedCount;
    for (const name of byOwner) if (collections.includes(name)) results[name] = (await database.collection(name).deleteMany({ owner: { $nin: adminEmails } })).deletedCount;
    if (collections.includes("audit")) results.audit = (await database.collection("audit").deleteMany({ $or: [{ actor: { $exists: true, $nin: adminEmails } }, { target: { $exists: true, $nin: adminEmails } }] })).deletedCount;
    if (collections.includes("rateLimits")) results.rateLimits = (await database.collection("rateLimits").deleteMany({})).deletedCount;
    results.members = (await database.collection("members").deleteMany({ role: { $ne: "admin" }, email: { $nin: adminEmails } })).deletedCount;
    const remainingAdmins = await database.collection("members").countDocuments({ role: "admin" });
    if (remainingAdmins !== adminRecords.length) throw new Error("Administrator count changed during purge. Check the backup.");
    console.log(JSON.stringify({ database: database.databaseName, preservedAdminCount: adminEmails.length, remainingAdminRecords: remainingAdmins, deleted: results }));
  }
} finally { await client.close(); }
