import { execFileSync } from "node:child_process";

if (process.env.VERCEL_ENV === "production") {
  execFileSync(process.execPath, ["--import", "tsx", "scripts/migrate.ts"], { stdio: "inherit" });
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  if (email && name) {
    execFileSync(process.execPath, ["--import", "tsx", "scripts/create-admin.ts", "--email", email, "--name", name], { stdio: "inherit" });
  }
} else {
  console.log(`Skipping database migrations for ${process.env.VERCEL_ENV ?? "local"} builds.`);
}
