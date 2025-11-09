import { Config } from "./types.ts";

/**
 * Loads and validates the configuration from a JSON file
 * @param configPath Path to the configuration file
 * @returns Validated configuration object
 * @throws Error if the configuration is invalid or cannot be loaded
 */
export async function loadConfig(configPath: string): Promise<Config> {
  try {
    // Read the configuration file
    const configText = await Deno.readTextFile(configPath);
    const config: Config = JSON.parse(configText);

    // Validate the configuration
    validateConfig(config);

    // Apply defaults for missing optional fields
    return applyDefaults(config);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in configuration file: ${error.message}`);
    }

    throw new Error(`Error loading configuration: ${error.message}`);
  }
}

/**
 * Validates that the configuration has all required fields and values
 * @param config Configuration object to validate
 * @throws Error if the configuration is invalid
 */
function validateConfig(config: Partial<Config>): void {
  // Check required fields
  if (!config.feeds || !Array.isArray(config.feeds) || config.feeds.length === 0) {
    throw new Error("Configuration must include at least one feed");
  }

  // Validate each feed
  for (const feed of config.feeds) {
    if (!feed.id) {
      throw new Error("Each feed must have an id");
    }

    if (!feed.url) {
      throw new Error(`Feed "${feed.id}" is missing a URL`);
    }

    try {
      new URL(feed.url);
    } catch {
      throw new Error(`Feed "${feed.id}" has an invalid URL: ${feed.url}`);
    }

    // Check feed type if specified
    if (
      feed.type && !["rss", "atom", "arxiv", "doi", "github", "youtube", "url"].includes(feed.type)
    ) {
      throw new Error(`Feed "${feed.id}" has an invalid type: ${feed.type}`);
    }
  }

  // Validate topics
  if (!config.topics || !Array.isArray(config.topics)) {
    throw new Error("Configuration must include an array of topics");
  }

  // Validate numeric parameters
  if (typeof config.summaryLength !== "number" || config.summaryLength <= 0) {
    throw new Error("summaryLength must be a positive number");
  }

  if (typeof config.maxItemsPerWeek !== "number" || config.maxItemsPerWeek <= 0) {
    throw new Error("maxItemsPerWeek must be a positive number");
  }

  // Validate output configuration
  if (!config.output) {
    throw new Error("Configuration must include output settings");
  }

  if (!config.output.directory) {
    throw new Error("Output configuration must specify a directory");
  }

  if (!config.output.filename) {
    throw new Error("Output configuration must specify a filename");
  }
}

/**
 * Applies default values for missing optional configuration fields
 * @param config Partial configuration object
 * @returns Complete configuration with defaults applied
 */
function applyDefaults(config: Partial<Config>): Config {
  return {
    feeds: config.feeds || [],
    topics: config.topics || [],
    summaryLength: config.summaryLength || 150,
    maxItemsPerWeek: config.maxItemsPerWeek || 10,
    output: {
      directory: config.output?.directory || "./output",
      filename: config.output?.filename || "weekly_summary.md",
    },
    database: config.database || {
      path: "./denote.db",
    },
    llm: config.llm || {
      url: "http://localhost:8080",
      model: "mistral",
    },
  };
}

/**
 * Creates a default configuration file if one doesn't exist
 * @param configPath Path to write the configuration file
 * @returns true if a new configuration was created, false if one already existed
 */
export async function createDefaultConfig(configPath: string): Promise<boolean> {
  try {
    // Check if the file already exists
    await Deno.stat(configPath);
    return false; // File exists, didn't create a new one
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }

    // Create a default configuration
    const defaultConfig: Config = {
      feeds: [
        { id: "arxiv_ai", url: "http://export.arxiv.org/rss/cs.AI" },
        { id: "answerai_blog", url: "https://www.answer.ai/index.xml" },
      ],
      topics: ["ai", "llm", "machine learning", "deep learning"],
      summaryLength: 150,
      maxItemsPerWeek: 10,
      output: {
        directory: "./output",
        filename: "weekly_summary.md",
      },
      database: {
        path: "./denote.db",
      },
      llm: {
        url: "http://localhost:8080",
        model: "mistral",
      },
    };

    // Create the output directory if it doesn't exist
    try {
      await Deno.mkdir(defaultConfig.output.directory, { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        throw error;
      }
    }

    // Write the configuration file
    await Deno.writeTextFile(
      configPath,
      JSON.stringify(defaultConfig, null, 2),
    );

    return true;
  }
}
