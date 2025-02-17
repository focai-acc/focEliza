import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve `__dirname` in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const provider = process.env.CHAIN_STATE_DB_PROVIDER || "sqlite";

// Prisma supports only the following providers
const allowedProviders = ["postgresql", "mysql", "sqlite", "mongodb", "sqlserver"];
if (!allowedProviders.includes(provider)) {
    console.error(`❌ Invalid Prisma provider: ${provider}`);
    process.exit(1);
}

// Read schema.prisma
const schemaPath = path.join(__dirname, "../prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf-8");

console.log(`🔹 Current database provider: ${provider}`);

// Ensure the correct replacement of the provider field
schema = schema.replace(/provider\s*=\s*env\(["']([\w\d_]+)["']\)/g, `provider = "${provider}"`);

// Write the updated schema.prisma
fs.writeFileSync(schemaPath, schema, "utf-8");

console.log(`✅ Prisma provider updated to ${provider}`);
