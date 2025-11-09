/**
 * Test helper utilities for denote testing
 */

/**
 * Creates a mock RSS feed for testing
 * @param options Configuration for the mock feed
 * @returns XML string representing an RSS feed
 */
export function createMockRss(options: {
  title: string;
  items: Array<{
    title: string;
    link: string;
    description: string;
    pubDate: Date;
  }>;
}): string {
  const { title, items } = options;

  let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>https://example.com</link>
    <description>A test RSS feed</description>`;

  for (const item of items) {
    rss += `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
    </item>`;
  }

  rss += `
  </channel>
</rss>`;

  return rss;
}

/**
 * Creates a mock HTML page for testing
 * @param options Configuration for the mock HTML
 * @returns HTML string representing a web page
 */
export function createMockHtml(options: {
  title: string;
  content: string;
}): string {
  const { title, content } = options;

  return `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(title)}</title>
  <meta charset="utf-8">
</head>
<body>
  <article>
    <h1>${escapeHtml(title)}</h1>
    <div class="content">
      ${content}
    </div>
  </article>
</body>
</html>`;
}

/**
 * Creates a mock configuration file for testing
 * @param options Configuration options
 * @returns Configuration object
 */
export function createMockConfig(options?: {
  feeds?: Array<{ id: string; url: string }>;
  topics?: string[];
  summaryLength?: number;
  maxItemsPerWeek?: number;
  output?: { directory: string; filename: string };
}) {
  return {
    feeds: options?.feeds ?? [{ id: "test_feed", url: "https://example.com/test.rss" }],
    topics: options?.topics ?? ["test", "example"],
    summaryLength: options?.summaryLength ?? 150,
    maxItemsPerWeek: options?.maxItemsPerWeek ?? 5,
    output: options?.output ?? {
      directory: "./output",
      filename: "test_digest.md",
    },
  };
}

/**
 * Creates a temporary directory for test artifacts
 * @returns Path to the temporary directory
 */
export async function createTempTestDir(): Promise<string> {
  return await Deno.makeTempDir({ prefix: "denote_test_" });
}

/**
 * Escape special characters in XML
 * @param text The text to escape
 * @returns Escaped XML text
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Escape special characters in HTML
 * @param text The text to escape
 * @returns Escaped HTML text
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Mock LLM class for testing summarization
 */
export class MockLLM {
  constructor(private responseMode: "normal" | "error" | "fixed" = "normal") {}

  async generate(prompt: string): Promise<string> {
    if (this.responseMode === "error") {
      throw new Error("Mock LLM error");
    } else if (this.responseMode === "fixed") {
      return "This is a fixed mock summary for testing purposes.";
    } else {
      // Generate a simple summary by truncating the input
      const content = prompt.split("Content:")[1]?.split("Summary:")[0] ?? "";
      const words = content.split(/\s+/).filter((word) => word.length > 0);
      const summaryWords = words.slice(0, 30);

      return `Summary of: ${summaryWords.join(" ")}...`;
    }
  }

  async close(): Promise<void> {
    // No-op for mock
  }
}
