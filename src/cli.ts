import { run } from "./main.ts";

/**
 * Main CLI entry point for denote
 */
async function main() {
  const args = Deno.args;
  let configPath = "./config.json";
  let fetchOnly = false;
  let generateOnly = false;
  let showHelp = false;
  let noStream = false;

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--config" || args[i] === "-c") && i + 1 < args.length) {
      configPath = args[++i];
    } else if (args[i] === "--fetch-only" || args[i] === "-f") {
      fetchOnly = true;
    } else if (args[i] === "--generate-only" || args[i] === "-g") {
      generateOnly = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      showHelp = true;
    } else if (args[i] === "--run-all" || args[i] === "-a") {
      // Run everything (neither fetch-only nor generate-only)
      fetchOnly = false;
      generateOnly = false;
    } else if (args[i] === "--no-stream" || args[i] === "-n") {
      noStream = true;
    }
  }

  // Show help if requested
  if (showHelp) {
    printHelp();
    Deno.exit(0);
  }

  try {
    // Run the application
    await run(configPath, fetchOnly, generateOnly, !noStream);
  } catch (error: unknown) {
    console.error(`Error running denote: ${error instanceof Error ? error.message : error}`);
    Deno.exit(1);
  }
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log("denote - a lightweight, self-hosted weekly TL;DR summariser");
  console.log("");
  console.log("Usage:");
  console.log("  deno run --allow-net --allow-read --allow-write src/cli.ts [options]");
  console.log("");
  console.log("Options:");
  console.log("  --config, -c <path> Path to the configuration file (default: ./config.json)");
  console.log("  --fetch-only, -f    Only fetch new content without generating a digest");
  console.log("  --generate-only, -g Only generate a digest without fetching new content");
  console.log("  --run-all, -a       Run both fetch and generate (default behavior)");
  console.log("  --no-stream, -n     Disable streaming output during LLM processing");
  console.log("  --help, -h          Show this help information");
}

// Run if invoked directly
if (import.meta.main) {
  main();
}

export { main, printHelp };
