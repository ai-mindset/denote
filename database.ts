import { Database } from "@db/sqlite";

import type { FeedItem, StoredFeedItem } from "./types.ts";

export class FeedDatabase {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  private initDatabase() {
    // Create table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feed_items (
        link TEXT PRIMARY KEY,
        feed_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        pub_date TEXT NOT NULL,
        processed_at TEXT NOT NULL,
        summary TEXT
      )
    `);
  }

  /**
   * Check if an item has already been processed
   */
  itemExists(link: string): boolean {
    const result = this.db.prepare(
      "SELECT COUNT(*) as count FROM feed_items WHERE link = ?",
    ).value(link);

    return result ? (result[0] as number) > 0 : false;
  }

  /**
   * Insert a new feed item into the database
   */
  insertItem(item: FeedItem, summary?: string) {
    this.db.prepare(
      `INSERT OR IGNORE INTO feed_items
       (link, feed_id, title, description, content, pub_date, processed_at, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      item.link,
      item.feedId,
      item.title,
      item.description,
      item.content || "",
      item.pubDate.toISOString(),
      new Date().toISOString(),
      summary || "",
    );
  }

  /**
   * Filter out items that have already been processed
   */
  filterNewItems(items: FeedItem[]): FeedItem[] {
    return items.filter((item) => !this.itemExists(item.link));
  }

  /**
   * Get all items from the last N days
   */
  getRecentItems(days: number): StoredFeedItem[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.db.prepare(
      "SELECT * FROM feed_items WHERE pub_date >= ? ORDER BY pub_date DESC",
    ).all(cutoffDate.toISOString());
  }

  printAllItems() {
    const items = this.db.prepare("SELECT title, feed_id, pub_date FROM feed_items").all();
    console.table(items);
  }

  close() {
    this.db.close();
  }
}
