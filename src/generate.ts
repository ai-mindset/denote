import { Config, RankedItem } from "./types.ts";
import { groupByTopics } from "./ranker.ts";

/**
 * Generate a weekly digest markdown file from ranked content items
 * @param items Ranked content items
 * @param config Application configuration
 */
export async function generateDigest(
  items: RankedItem[],
  config: Config,
): Promise<void> {
  console.log(`Generating digest with ${items.length} items`);

  // Format the items into markdown
  const markdown = formatMarkdown(items, `Weekly Digest - ${getWeekRange()}`);

  // Ensure the output directory exists
  await ensureDir(config.output.directory);

  // Write the markdown to a file
  const outputPath = `${config.output.directory}/${config.output.filename}`;
  await Deno.writeTextFile(outputPath, markdown);

  console.log(`Digest saved to ${outputPath}`);
}

/**
 * Format content items into a markdown digest
 * @param items Ranked content items
 * @param title Title for the digest
 * @returns Formatted markdown string
 */
export function formatMarkdown(items: RankedItem[], title: string): string {
  // Start with the title
  let markdown = `# ${escapeMarkdown(title)}\n\n`;

  // Handle empty digest
  if (items.length === 0) {
    markdown += "No articles this week. Check back next week!\n";
    return markdown;
  }

  // Add highlights section (top 3 items)
  markdown += "## Highlights\n\n";

  const highlights = items.slice(0, Math.min(3, items.length));
  for (const item of highlights) {
    markdown += `- **[${escapeMarkdown(item.title)}](${item.url})**: ${
      escapeMarkdown(
        item.summary.split(".")[0],
      )
    }.\n`;
  }

  markdown += "\n";

  // Add summaries section
  markdown += "## Summaries\n\n";

  for (const item of items) {
    markdown += `### ${escapeMarkdown(item.title)}\n\n`;
    markdown += `${escapeMarkdown(item.summary)}\n\n`;
    markdown += `Source: [${escapeMarkdown(item.source)}](${item.url})`;

    if (item.author) {
      markdown += ` - ${escapeMarkdown(item.author)}`;
    }

    markdown += `\n\n`;
  }

  // Add further reading section, grouped by source
  markdown += "## Further Reading\n\n";

  // Group by source
  const sourceGroups: Record<string, RankedItem[]> = {};
  for (const item of items) {
    if (!sourceGroups[item.source]) {
      sourceGroups[item.source] = [];
    }
    sourceGroups[item.source].push(item);
  }

  // List items by source
  for (const source of Object.keys(sourceGroups).sort()) {
    markdown += `### ${escapeMarkdown(source)}\n\n`;
    for (const item of sourceGroups[source]) {
      markdown += `- [${escapeMarkdown(item.title)}](${item.url})\n`;
    }
    markdown += "\n";
  }

  // Add topic groups section
  const topicGroups = groupByTopics(items);
  if (Object.keys(topicGroups).length > 1) {
    markdown += "## Topics\n\n";

    for (const topic of Object.keys(topicGroups).sort()) {
      if (topicGroups[topic].length === 0) continue;
      if (topic === "Other" && topicGroups[topic].length === 0) continue;

      markdown += `### ${escapeMarkdown(topic)}\n\n`;
      for (const item of topicGroups[topic]) {
        markdown += `- [${escapeMarkdown(item.title)}](${item.url})\n`;
      }
      markdown += "\n";
    }
  }

  // Add footer
  const now = new Date();
  markdown += `---\n\n`;
  markdown += `Generated on ${
    now.toISOString().split("T")[0]
  } by [denote](https://github.com/yourusername/denote)`;

  return markdown;
}

/**
 * Escape special markdown characters in text
 * @param text Text to escape
 * @returns Escaped text
 */
function escapeMarkdown(text: string): string {
  return text
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\*/g, "\\*")
    .replace(/\_/g, "\\_")
    .replace(/\~/g, "\\~")
    .replace(/\`/g, "\\`")
    .replace(/\</g, "&lt;")
    .replace(/\>/g, "&gt;")
    .replace(/\&/g, "&amp;");
}

/**
 * Get a string representing the current week range
 * @returns String like "1 Jan - 7 Jan, 2025" (day-month format)
 */
function getWeekRange(): string {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of the week (Sunday)

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // End of the week (Saturday)

  // Format dates in British style (day month)
  const formatOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  const startStr = startOfWeek.toLocaleDateString("en-GB", formatOptions);
  const endStr = endOfWeek.toLocaleDateString("en-GB", formatOptions);
  const yearStr = endOfWeek.toLocaleDateString("en-GB", { year: "numeric" });

  return `${startStr} - ${endStr}, ${yearStr}`;
}

/**
 * Ensure a directory exists, creating it if needed
 * @param dir Directory path
 */
async function ensureDir(dir: string): Promise<void> {
  try {
    const stat = await Deno.stat(dir);
    if (!stat.isDirectory) {
      throw new Error(`Path exists but is not a directory: ${dir}`);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      await Deno.mkdir(dir, { recursive: true });
    } else {
      throw error;
    }
  }
}
