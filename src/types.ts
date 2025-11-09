/**
 * Type definitions for the denote project
 */

/**
 * Configuration for a content source feed
 */
export interface Feed {
  /** Unique identifier for the feed */
  id: string;
  /** URL to fetch the feed from */
  url: string;
  /** Optional feed type (auto-detected if not specified) */
  type?: "rss" | "atom" | "arxiv" | "doi" | "github" | "youtube" | "url";
  /** Optional custom parser options */
  options?: Record<string, unknown>;
}

/**
 * Main application configuration
 */
export interface Config {
  /** Array of content source feeds */
  feeds: Feed[];
  /** List of topics/keywords to focus on */
  topics: string[];
  /** Target summary length in words */
  summaryLength: number;
  /** Maximum number of items to include per digest */
  maxItemsPerWeek: number;
  /** Output configuration */
  output: {
    /** Directory to save generated digests */
    directory: string;
    /** Filename for the digest */
    filename: string;
  };
  /** Optional database configuration */
  database?: {
    /** Path to SQLite database file */
    path: string;
  };
  /** Optional LLM configuration */
  llm?: {
    /** URL to the LLM server */
    url: string;
    /** Model to use */
    model: string;
    /** Additional model parameters */
    parameters?: Record<string, unknown>;
  };
}

/**
 * Content item fetched from a source
 */
export interface ContentItem {
  /** Unique identifier for the item */
  id: string;
  /** Title of the item */
  title: string;
  /** URL to the original content */
  url: string;
  /** Publication date of the item */
  date: Date;
  /** Source name or feed id */
  source: string;
  /** Main content text */
  content: string;
  /** Optional author information */
  author?: string;
  /** Optional tags or categories */
  tags?: string[];
  /** Optional summary (if already available) */
  summary?: string;
}

/**
 * Item with added summary
 */
export interface SummarizedItem extends ContentItem {
  /** Generated summary of the content */
  summary: string;
  /** Whether summarisation was successful */
  summarized: boolean;
}

/**
 * Ranked item with score
 */
export interface RankedItem extends SummarizedItem {
  /** Relevance score (0-100) */
  score: number;
  /** Matching topics found in the content */
  matchingTopics: string[];
}

/**
 * Result of a fetch operation
 */
export interface FetchResult {
  /** Whether the fetch was successful */
  success: boolean;
  /** Array of fetched items (if successful) */
  items: ContentItem[];
  /** Error message (if unsuccessful) */
  error?: string;
}

/**
 * Result of a summarisation operation
 */
export interface SummaryResult {
  /** Whether summarisation was successful */
  success: boolean;
  /** Generated summary */
  summary: string;
  /** Error message (if unsuccessful) */
  error?: string;
}

/**
 * Callback function for streaming responses
 */
export type StreamCallback = (chunk: string) => void;

/**
 * Interface for LLM client
 */
export interface LlmClient {
  /** Generate text from a prompt */
  generate(prompt: string, streamCallback?: StreamCallback): Promise<string>;
  /** Close the LLM client connection */
  close(): Promise<void>;
}

/**
 * Database interface for content storage
 */
export interface Database {
  /** Add a new content item to the database */
  addItem(item: ContentItem): Promise<void>;
  /** Check if an item already exists in the database */
  hasItem(id: string): Promise<boolean>;
  /** Get recent items from the database */
  getRecentItems(days?: number): Promise<ContentItem[]>;
  /** Close the database connection */
  close(): Promise<void>;
}
