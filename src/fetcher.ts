import { ContentItem, Database, Feed, FetchResult } from "./types.ts";
import { parseRss } from "./parsers/rss.ts";

/**
 * Fetches content from a feed and stores it in the database
 * @param feed The feed configuration
 * @param db Database instance for storing fetched items
 * @returns Result of the fetch operation
 */
export async function fetchContent(
  feed: Feed,
  db: Database,
  customFetch?: (url: string) => Promise<string>,
): Promise<FetchResult> {
  console.log(`Fetching content from ${feed.id}: ${feed.url}`);

  try {
    // Fetch the feed content
    const content = await (customFetch ? customFetch(feed.url) : (await fetch(feed.url)).text());

    // Determine the feed type
    const type = feed.type || detectFeedType(feed.url, content);

    // Parse the content based on the feed type
    const items = await parseSource(type, content, feed.id);

    // Filter out items that already exist in the database
    const newItems: ContentItem[] = [];
    for (const item of items) {
      if (!(await db.hasItem(item.id))) {
        newItems.push(item);
        // Store the new item in the database
        await db.addItem(item);
      }
    }

    return {
      success: true,
      items: newItems,
    };
  } catch (error) {
    console.error(`Error fetching content from ${feed.id}:`, error);
    return {
      success: false,
      items: [],
      error: error.message,
    };
  }
}

/**
 * Detects the feed type based on URL and content
 * @param url The feed URL
 * @param content The feed content
 * @returns Detected feed type
 */
export function detectFeedType(url: string, content: string): string {
  // Check URL patterns first
  if (url.includes("arxiv.org")) {
    return "arxiv";
  }

  if (url.includes("doi.org") || url.includes("dx.doi.org")) {
    return "doi";
  }

  if (url.includes("github.com") && url.includes("/releases")) {
    return "github";
  }

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube";
  }

  // Check content patterns
  if (content.includes("<rss") || content.includes("<channel")) {
    return "rss";
  }

  if (content.includes("<feed") && content.includes('xmlns="http://www.w3.org/2005/Atom"')) {
    return "atom";
  }

  // Default to URL if no specific type detected
  return "url";
}

/**
 * Parse content based on source type
 * @param type The source type
 * @param content The raw content
 * @param source The source identifier
 * @returns Array of parsed content items
 */
export async function parseSource(
  type: string,
  content: string,
  source: string,
): Promise<ContentItem[]> {
  switch (type) {
    case "rss":
    case "atom":
      return await parseRss(content, source);
    // Additional parser cases would be added here
    /*
    case "arxiv":
      return await parseArxiv(content, source);
    case "doi":
      return await parseDoi(content, source);
    case "github":
      return await parseGithub(content, source);
    case "youtube":
      return await parseYoutube(content, source);
    case "url":
      return await parseUrl(content, source);
    */
    default:
      throw new Error(`Unsupported source type: ${type}`);
  }
}

/**
 * Fetches content from all feeds in a configuration
 * @param feeds Array of feed configurations
 * @param db Database instance for storing fetched items
 * @returns Array of fetch results
 */
export async function fetchAllFeeds(
  feeds: Feed[],
  db: Database,
): Promise<FetchResult[]> {
  const results: FetchResult[] = [];

  for (const feed of feeds) {
    const result = await fetchContent(feed, db);
    results.push(result);
  }

  return results;
}
