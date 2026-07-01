import { ConvexHttpClient } from "convex/browser";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const prodUrl =
  process.env.CONVEX_PROD_URL ?? "https://pastel-parakeet-569.convex.cloud";

const exportCmd =
  process.platform === "win32"
    ? "npx convex data users --format json"
    : "npx convex data users --format json";

const raw = execSync(exportCmd, { cwd: root, encoding: "utf8" });
const users = JSON.parse(raw);

if (!Array.isArray(users) || users.length === 0) {
  throw new Error("No users found in dev deployment.");
}

console.log(`Exporting ${users.length} user(s) from dev to prod (${prodUrl})...`);

const client = new ConvexHttpClient(prodUrl);

for (const user of users) {
  const payload = {
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    credentialsCustomized: user.credentialsCustomized ?? false,
    credentialPromptDismissed: user.credentialPromptDismissed ?? false,
    createdAt: user.createdAt,
  };

  const result = await client.mutation("seed:importUser", payload);
  console.log(`${user.email}: ${result.action}`);
}

console.log("User migration to prod complete.");
