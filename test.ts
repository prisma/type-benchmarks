import { execa } from "execa";
import { readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const benchmarkDir = dirname(fileURLToPath(import.meta.url));
const updateSnapshots = shouldUpdateSnapshots();
const { shouldOnlyGenerate, shouldSkipGenerate } = getGenerateOptions();
const testFilter = getTestFilter();

const results: {
  test: string;
  success: boolean;
  skipped?: boolean;
}[] = [];

let hasAnyFailure = false;

if (!shouldSkipGenerate) {
  await runGenerate(benchmarkDir);
}

if (shouldOnlyGenerate) {
  process.exit(0);
}

const benchFiles = await getBenchmarkFiles(benchmarkDir);
for (const benchFile of benchFiles) {
  if (testFilter && !benchFile.includes(testFilter)) {
    console.log(`Skipping ${benchFile} - does not match filter: ${testFilter}`);
    results.push({
      test: benchFile,
      success: false,
      skipped: true,
    });
    continue;
  }
  results.push(
    await runBenchmark({ benchFile, updateSnapshots, cwd: benchmarkDir }),
  );
}

printResults(results, updateSnapshots);

process.exit(hasAnyFailure ? 1 : 0);

function shouldUpdateSnapshots() {
  const args = process.argv.slice(2);
  const updateSnapshots =
    args.includes("-u") || args.includes("--updateSnapshots");

  if (updateSnapshots) {
    console.log("ℹ️ 🎥 Updating snapshots...");
  }
  return updateSnapshots;
}

function getGenerateOptions() {
  const args = process.argv.slice(2);
  const shouldOnlyGenerate = args.includes("--onlyGenerate");
  const shouldSkipGenerate = args.includes("--skipGenerate");

  if (shouldOnlyGenerate && shouldSkipGenerate) {
    throw new Error("Cannot run generate and skip generate at the same time");
  }

  return {
    shouldOnlyGenerate,
    shouldSkipGenerate,
  };
}

function getTestFilter() {
  const args = process.argv.slice(2);
  const filterArg = args.find((arg) => !arg.startsWith("-"));
  return filterArg;
}

async function getBenchmarkFiles(dir: string) {
  const benchmarkFiles = [];
  for (const item of await readdir(dir)) {
    const fileStat = await stat(join(dir, item));
    if (fileStat.isFile() && item.endsWith(".bench.ts")) {
      benchmarkFiles.push(item);
    }
  }
  return benchmarkFiles;
}

async function runGenerate(dir: string) {
  console.log(`Running generate command in ${dir}...`);
  await execa("prisma", ["generate"], {
    cwd: dir,
    stdio: "inherit",
  });
}

async function runBenchmark({
  benchFile,
  cwd,
  updateSnapshots,
}: {
  benchFile: string;
  cwd: string;
  updateSnapshots: boolean;
}) {
  console.log(`Running ${benchFile}...`);
  try {
    await execa("node", [benchFile], {
      cwd,
      stdio: "inherit",
      env: { ATTEST_updateSnapshots: updateSnapshots ? "true" : "false" },
    });
    return {
      test: benchFile,
      success: true,
    };
  } catch {
    hasAnyFailure = true;
    return {
      test: benchFile,
      success: false,
    };
  }
}

function printResults(
  results: { test: string; success: boolean; skipped?: boolean }[],
  updateSnapshots: boolean,
) {
  console.log("========================");
  console.log("\nResults:");
  console.log("========================");
  for (const result of results) {
    const status = result.skipped
      ? "⏩ Skipped"
      : result.success
        ? "✅ Success"
        : "❌ Failed";
    console.log(`${status} - ${result.test}`);
  }
  console.log("========================");
  if (updateSnapshots) {
    console.log("✅ 🎥 Updated snapshots");
    console.log("========================");
  }
}
