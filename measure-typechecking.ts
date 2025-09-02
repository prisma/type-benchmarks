import path from "node:path";
import fs from "node:fs";

import ts from "typescript";

interface TimingResult {
  file: string;
  typeCheckTime: number;
  totalTime: number;
  diagnosticsCount: number;
  success: boolean;
  error?: string;
}

function measureTypeChecking(fileName: string): TimingResult {
  const fullPath = path.resolve(fileName);

  if (!fs.existsSync(fullPath)) {
    return {
      file: fileName,
      typeCheckTime: 0,
      totalTime: 0,
      diagnosticsCount: 0,
      success: false,
      error: `File not found: ${fullPath}`,
    };
  }

  const startTotal = performance.now();

  try {
    // Find and read tsconfig.json properly
    const configPath = ts.findConfigFile(
      "./",
      ts.sys.fileExists,
      "tsconfig.json",
    );
    if (!configPath) {
      throw new Error("Could not find a valid 'tsconfig.json'.");
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const compilerOptions = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath),
    ).options;

    // Create program
    const program = ts.createProgram([fullPath], compilerOptions);

    // Measure type checking specifically
    const startTypeCheck = performance.now();

    // Get diagnostics (this triggers type checking)
    const diagnostics = [
      ...program.getSemanticDiagnostics(),
      ...program.getSyntacticDiagnostics(),
      ...program.getGlobalDiagnostics(),
    ];

    const endTypeCheck = performance.now();
    const endTotal = performance.now();

    return {
      file: fileName,
      typeCheckTime: endTypeCheck - startTypeCheck,
      totalTime: endTotal - startTotal,
      diagnosticsCount: diagnostics.length,
      success: true,
    };
  } catch (error) {
    const endTotal = performance.now();
    return {
      file: fileName,
      typeCheckTime: 0,
      totalTime: endTotal - startTotal,
      diagnosticsCount: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function runBenchmark(files: string[], iterations: number = 5): void {
  console.log("TypeScript Type Checking Performance Benchmark");
  console.log("=".repeat(60));
  console.log(`Running ${iterations} iterations per file\n`);

  const results: Record<string, TimingResult[]> = {};

  // Warm up TypeScript compiler
  console.log("🔥 Warming up compiler...");
  for (const file of files) {
    measureTypeChecking(file);
  }

  // Run actual measurements
  for (const file of files) {
    console.log(`📊 Measuring ${file}...`);
    results[file] = [];

    for (let i = 0; i < iterations; i++) {
      const result = measureTypeChecking(file);
      results[file].push(result);

      if (!result.success) {
        console.error(`❌ Error in ${file}: ${result.error}`);
        break;
      }
    }
  }

  // Calculate and display results
  console.log("\n" + "=".repeat(60));
  console.log("RESULTS");
  console.log("=".repeat(60));

  const summaryData: Array<{
    File: string;
    "Avg Type Check (ms)": string;
    "Min (ms)": string;
    "Max (ms)": string;
    Diagnostics: number;
  }> = [];

  for (const [file, fileResults] of Object.entries(results)) {
    if (fileResults.length === 0 || !fileResults[0].success) {
      summaryData.push({
        File: file,
        "Avg Type Check (ms)": "ERROR",
        "Min (ms)": "-",
        "Max (ms)": "-",
        Diagnostics: 0,
      });
      continue;
    }

    const typeCheckTimes = fileResults.map((r) => r.typeCheckTime);
    const avg =
      typeCheckTimes.reduce((a, b) => a + b, 0) / typeCheckTimes.length;
    const min = Math.min(...typeCheckTimes);
    const max = Math.max(...typeCheckTimes);
    const diagnostics = fileResults[0].diagnosticsCount;

    summaryData.push({
      File: file,
      "Avg Type Check (ms)": avg.toFixed(2),
      "Min (ms)": min.toFixed(2),
      "Max (ms)": max.toFixed(2),
      Diagnostics: diagnostics,
    });
  }

  console.table(summaryData);

  // Performance comparison
  if (summaryData.length > 1) {
    console.log("\n" + "=".repeat(60));
    console.log("PERFORMANCE COMPARISON (vs fastest)");
    console.log("=".repeat(60));

    const validData = summaryData.filter(
      (d) => d["Avg Type Check (ms)"] !== "ERROR",
    );
    const fastest = validData.reduce((a, b) =>
      parseFloat(a["Avg Type Check (ms)"]) <
      parseFloat(b["Avg Type Check (ms)"])
        ? a
        : b,
    );
    const fastestTime = parseFloat(fastest["Avg Type Check (ms)"]);

    const comparisonData: Array<{
      File: string;
      "Relative Speed": string;
      "Absolute Diff (ms)": string;
    }> = validData
      .map((data) => {
        const avgTime = parseFloat(data["Avg Type Check (ms)"]);
        const ratio = avgTime / fastestTime;
        const diff = avgTime - fastestTime;

        return {
          File: data.File,
          "Relative Speed":
            ratio === 1 ? "BASELINE" : `${ratio.toFixed(2)}x slower`,
          "Absolute Diff (ms)": `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}`,
        };
      })
      .sort(
        (a, b) =>
          parseFloat(a["Absolute Diff (ms)"]) -
          parseFloat(b["Absolute Diff (ms)"]),
      );

    console.table(comparisonData);
  }

  console.log("\n📈 Tips for interpretation:");
  console.log("  - Lower times = better performance");
  console.log(
    "  - High variance (max-min) may indicate inconsistent performance",
  );
  console.log("  - Diagnostics count shows type errors/warnings found");
  console.log(
    `  - Each measurement ran ${iterations} times (excluding warmup)`,
  );
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(
      "Usage: node measure-typechecking.ts <file1> [file2] [file3] ...",
    );
    console.log("\nExample:");
    console.log(
      "  node measure-typechecking.ts prisma.query.bench.ts drizzle.query.bench.ts drizzle.relational.bench.ts",
    );
    process.exit(1);
  }

  // Parse iterations argument
  let iterations = 5;
  let files = args;

  const iterArg = args.find((arg) => arg.startsWith("--iterations="));
  if (iterArg) {
    iterations = parseInt(iterArg.split("=")[1]) || 5;
    files = args.filter((arg) => !arg.startsWith("--iterations="));
  }

  runBenchmark(files, iterations);
}

main();
