import type { FeedItem } from "./types.ts";

export class TopicFilter {
  /**
   * Checks if a feed item matches any of the provided topics
   * Uses case-insensitive keyword matching in title, description, and content
   */
  matchesTopics(item: FeedItem, topics: string[]): boolean {
    const searchText = [
      item.title,
      item.description,
      item.content || "",
    ].join(" ").toLowerCase();

    return topics.some((topic) => {
      const regex = new RegExp(`\\b${topic.toLowerCase()}\\b`, "i");
      return regex.test(searchText);
    });
  }

  /**
   * Filters an array of items to only those matching the topics
   */
  filterItems(items: FeedItem[], topics: string[]): FeedItem[] {
    return items.filter((item) => this.matchesTopics(item, topics));
  }
}
