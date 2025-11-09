import { createDefaultConfig, loadConfig } from "./config.ts";
import { initDb } from "./db.ts";
import { fetchAllFeeds } from "./fetcher.ts";
import { connectToLlm, summariseItems } from "./summariser.ts";
import { groupByTopics, rankItems, selectTopItemsByGroup } from "./ranker.ts";
import { generateDigest } from "./generate.ts";
import { Config } from "./types.ts";

/**
 * Run the complete denote pipeline
 * @param configPath Path to the configuration file
 * @param fetchOnly Whether to only fetch new content without generating a digest
 * @param generateOnly Whether to only generate a digest without fetching new content
 * @param streamOutput Whether to stream LLM output (default: true)
 */
export async function run(
  configPath: string,
  fetchOnly = false,
  generateOnly = false,
  streamOutput = true,
): Promise<void> {
  try {
    console.log("Starting denote pipeline");

    // Ensure the configuration file exists
    await ensureConfig(configPath);

    // Load configuration
    const config = await loadConfig(configPath);
    console.log(`Loaded configuration with ${config.feeds.length} feeds`);

    // Initialize database
    const db = await initDb(config.database?.path || "./denote.db");
    console.log("Initialized database");

    try {
      // Run the pipeline based on options
      if (!generateOnly) {
        await runFetchPipeline(config, db);
      }

      if (!fetchOnly) {
        await runGeneratePipeline(config, db, streamOutput);
      }

      console.log("Pipeline completed successfully");
    } finally {
      // Always close the database
      await db.close();
    }
  } catch (error) {
    console.error("Error running denote pipeline:", error);
    Deno.exit(1);
  }
}

/**
 * Run the fetch pipeline to download new content
 * @param config Application configuration
 * @param db Database instance
 */
async function runFetchPipeline(config: Config, db: any): Promise<void> {
  console.log("Running fetch pipeline");

  // Fetch content from all feeds
  const results = await fetchAllFeeds(config.feeds, db);

  // Calculate stats
  let totalSuccess = 0;
  let totalItems = 0;
  let totalErrors = 0;

  for (const result of results) {
    if (result.success) {
      totalSuccess++;
      totalItems += result.items.length;
    } else {
      totalErrors++;
    }
  }

  console.log(`Fetch pipeline complete:`);
  console.log(`- Feeds processed: ${results.length}`);
  console.log(`- Successful feeds: ${totalSuccess}`);
  console.log(`- Failed feeds: ${totalErrors}`);
  console.log(`- New items fetched: ${totalItems}`);
}

/**
 * Run the generate pipeline to create a digest
 * @param config Application configuration
 * @param db Database instance
 * @param streamOutput Whether to stream LLM output
 */
async function runGeneratePipeline(config: Config, db: any, streamOutput = true): Promise<void> {
  console.log("Running generate pipeline");

  // Get recent items from the database
  const items = await db.getRecentItems(7);
  console.log(`Retrieved ${items.length} recent items from the database`);

  // Skip if no items
  if (items.length === 0) {
    console.log("No items to process, skipping digest generation");
    return;
  }

  // Connect to LLM
  const llm = await connectToLlm(
    config.llm?.url || "http://localhost:11434/api/generate",
    config.llm?.model || "mistral",
    config.llm?.parameters || {},
  );
  console.log("Connected to LLM");

  try {
    // Summarise items
    console.log(`Summarising ${items.length} items`);
    const summarisedItems = await summariseItems(
      items,
      llm,
      config.summaryLength,
      streamOutput,
    );

    // Rank items
    console.log("Ranking items by relevance");
    const rankedItems = rankItems(
      summarisedItems,
      config.topics,
      config.maxItemsPerWeek,
    );

    // Generate digest
    console.log(`Generating digest with ${rankedItems.length} items`);
    await generateDigest(rankedItems, config);

    console.log("Generate pipeline complete");
  } finally {
    // Always close the LLM client
    await llm.close();
  }
}

/**
 * Ensure a configuration file exists, creating a default if needed
 * @param configPath Path to the configuration file
 */
async function ensureConfig(configPath: string): Promise<void> {
  const created = await createDefaultConfig(configPath);
  if (created) {
    console.log(`Created default configuration at ${configPath}`);
  }
}

// Run if invoked directly
if (import.meta.main) {
  const args = Deno.args;
  let configPath = "./config.json";
  let fetchOnly = false;
  let generateOnly = false;
  let noStream = false;

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--config" || args[i] === "-c") && i + 1 < args.length) {
      configPath = args[++i];
    } else if (args[i] === "--fetch-only" || args[i] === "-f") {
      fetchOnly = true;
    } else if (args[i] === "--generate-only" || args[i] === "-g") {
      generateOnly = true;
    } else if (args[i] === "--no-stream" || args[i] === "-n") {
      noStream = true;
    } else if (args[i] === "--run-all" || args[i] === "-a") {
      fetchOnly = false;
      generateOnly = false;
    } else if (args[i] === "--help" || args[i] === "-h") {
      printHelp();
      Deno.exit(0);
    }
  }

  // Run the pipeline
  await run(configPath, fetchOnly, generateOnly, !noStream);
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log("denote - a lightweight, self-hosted weekly TL;DR summariser");
  console.log("");
  console.log("Usage:");
  console.log("  deno run --allow-net --allow-read --allow-write main.ts [options]");
  console.log("");
  console.log("Options:");
  console.log("  --config, -c <path> Path to the configuration file (default: ./config.json)");
  console.log("  --fetch-only, -f    Only fetch new content without generating a digest");
  console.log("  --generate-only, -g Only generate a digest without fetching new content");
  console.log("  --run-all, -a       Run both fetch and generate (default behavior)");
  console.log("  --no-stream, -n     Disable streaming output during LLM processing");
  console.log("  --help, -h          Show this help information");
}
