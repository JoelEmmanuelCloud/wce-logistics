import "./load-env";
import { closeDatabase } from "@/server/db";
import { JOB_NAMES, runJob, type JobName } from "@/server/jobs";

async function main() {
  const name = process.argv[2] as JobName;
  if (!JOB_NAMES.includes(name)) {
    throw new Error(`Usage: run-job <${JOB_NAMES.join(" | ")}>`);
  }
  try {
    console.log(await runJob(name));
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
