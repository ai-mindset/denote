import { ContentItem, Database } from "./types.ts";
import { DB } from "sqlite";

/**
 * SQLite database implementation for denote
 */
export class SqliteDatabase implements Database {
  private db: DB;

  /**
   * Create a new database connection
   * @param dbPath Path to the SQLite database file
   */
  constructor(private dbPath: string) {}

  /**
   * Initialize the database, creating tables if they don't exist
   */
  async init(): Promise<void> {
    console.log(`Initializing database at ${this.dbPath}`);

    // Create a new SQLite database connection
    this.db = new DB(this.dbPath);

    // Create tables
    await this.createTables();
  }

  /**
   * Create the necessary database tables
   */
  private async createTables(): Promise<void> {
    console.log("Creating database tables if they don't exist");

    // Create items table
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        date TEXT NOT NULL,
        source TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT,
        summary TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // Create tags table
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        item_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (item_id, tag),
        FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
      );
    `);
  }

  /**
   * Add a new content item to the database
   * @param item The content item to add
   */
  async addItem(item: ContentItem): Promise<void> {
    console.log(`Adding item to database: ${item.url} - ${item.title}`);

    // Format the date as an ISO string
    const dateStr = item.date instanceof Date ? item.date.toISOString() : new Date().toISOString();

    // Current timestamp for created_at
    const createdAt = new Date().toISOString();

    // Insert the item into the database
    this.db.query(
      `INSERT INTO items (id, title, url, date, source, content, author, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id,
        item.title,
        item.url,
        dateStr,
        item.source,
        item.content || "",
        item.author || "",
        item.summary || "",
        createdAt,
      ],
    );

    // If the item has tags, insert them too
    if (item.tags && item.tags.length > 0) {
      console.log(`Adding ${item.tags.length} tags for item ${item.id}`);

      for (const tag of item.tags) {
        this.db.query(
          `INSERT INTO tags (item_id, tag) VALUES (?, ?);`,
          [item.id, tag],
        );
      }
    }
  }

  /**
   * Check if an item already exists in the database
   * @param id The item ID to check
   * @returns true if the item exists, false otherwise
   */
  async hasItem(id: string): Promise<boolean> {
    console.log(`Checking if item exists: ${id}`);

    const result = this.db.query(
      `SELECT 1 FROM items WHERE id = ? LIMIT 1;`,
      [id],
    );

    return result.length > 0;
  }

  /**
   * Get recent items from the database
   * @param days Number of days to look back (defaults to 7)
   * @returns Array of recent content items
   */
  async getRecentItems(days = 7): Promise<ContentItem[]> {
    console.log(`Getting items from the last ${days} days`);

    // Calculate the date from 'days' ago
    const date = new Date();
    date.setDate(date.getDate() - days);
    const dateStr = date.toISOString();

    // Query for recent items
    const items = this.db.queryEntries<{
      id: string;
      title: string;
      url: string;
      date: string;
      source: string;
      content: string;
      author: string;
      summary: string;
      created_at: string;
    }>(
      `SELECT * FROM items
       WHERE date >= ?
       ORDER BY date DESC;`,
      [dateStr],
    );

    // For each item, get its tags
    const result: ContentItem[] = [];
    for (const item of items) {
      const tags = this.db.queryEntries<{ tag: string }>(
        `SELECT tag FROM tags WHERE item_id = ?;`,
        [item.id],
      ).map((t) => t.tag);

      result.push({
        id: item.id,
        title: item.title,
        url: item.url,
        date: new Date(item.date),
        source: item.source,
        content: item.content,
        author: item.author,
        summary: item.summary,
        tags,
      });
    }

    return result;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    console.log("Closing database connection");
    this.db.close();
  }
}

/**
 * Initialize a new database connection
 * @param dbPath Path to the SQLite database file
 * @returns Initialized database instance
 */
export async function initDb(dbPath: string): Promise<Database> {
  const db = new SqliteDatabase(dbPath);
  await db.init();
  return db;
}
