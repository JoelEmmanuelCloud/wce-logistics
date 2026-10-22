import { execFileSync } from "node:child_process";

if (process.env.VERCEL_ENV === "production") {
  execFileSync(process.execPath, ["--import", "tsx", "scripts/migrate.ts"], { stdio: "inherit" });
} else {
  console.log(`Skipping database migrations for ${process.env.VERCEL_ENV ?? "local"} builds.`);
}
