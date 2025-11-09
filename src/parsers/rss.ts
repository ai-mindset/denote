import { ContentItem } from "../types.ts";
import { parseFeed } from "@mikaelporttila/rss";

/**
 * Parse RSS/Atom feed content into normalized ContentItems
 * @param content The RSS/Atom XML content as a string
 * @param source The source identifier (feed id)
 * @returns Array of parsed content items
 * @throws Error if parsing fails
 */
export async function parseRss(content: string, source: string): Promise<ContentItem[]> {
  try {
    // Parse the feed using @mikaelporttila/rss
    const feed = await parseFeed(content);

    if (!feed) {
      throw new Error("Failed to parse feed");
    }

    const items: ContentItem[] = [];

    // Convert feed entries to ContentItems
    for (let i = 0; i < feed.entries.length; i++) {
      const entry = feed.entries[i];

      // Extract the entry ID or generate a fallback
      const id = entry.id || `${source}_${i}`;

      // Extract the title with fallback
      const title = entry.title?.value || "Untitled";

      // Extract the link (if available)
      let link = "";
      if (entry.links && entry.links.length > 0) {
        link = entry.links[0].href || "";
      }

      // Extract the content with fallbacks
      let content = "";
      if (entry.content) {
        content = entry.content.value || "";
      } else if (entry.description) {
        content = entry.description.value || "";
      }

      // Extract author information
      let author = "";
      if (entry.authors && entry.authors.length > 0) {
        author = entry.authors[0].name || "";
      }

      // Parse date with fallback
      let date: Date;
      if (entry.published) {
        date = new Date(entry.published);
      } else if (entry.updated) {
        date = new Date(entry.updated);
      } else {
        date = new Date(); // Use current date as fallback
      }

      // Extract categories/tags
      const tags: string[] = [];
      if (entry.categories) {
        for (const category of entry.categories) {
          if (category.term) {
            tags.push(category.term);
          } else if (category.value) {
            tags.push(category.value);
          }
        }
      }

      items.push({
        id,
        title,
        url: link,
        date,
        source,
        content,
        author,
        tags,
      });
    }

    return items;
  } catch (error) {
    throw new Error(`Failed to parse RSS feed: ${error.message}`);
  }
}
