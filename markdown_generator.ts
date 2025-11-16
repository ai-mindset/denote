import type { FeedItem } from "./types.ts";

interface ItemWithSummary extends FeedItem {
  summary: string;
}

export class MarkdownGenerator {
  /**
   * Generate a markdown report from feed items with summaries
   */
  generateReport(items: ItemWithSummary[], startDate: Date, endDate: Date): string {
    const markdown: string[] = [];

    // Header
    markdown.push(`# Weekly AI & Drug Discovery Summary`);
    markdown.push(`**Period:** ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`);
    markdown.push(`**Generated:** ${this.formatDate(new Date())}`);
    markdown.push(`\n---\n`);

    // Group items by feed
    const groupedItems = this.groupByFeed(items);

    // Generate section for each feed
    for (const [feedId, feedItems] of groupedItems.entries()) {
      markdown.push(`## ${this.formatFeedName(feedId)}\n`);

      for (const item of feedItems) {
        markdown.push(`### [${item.title}](${item.link})\n`);
        markdown.push(`**Published:** ${this.formatDate(item.pubDate)}\n`);
        markdown.push(`${item.summary}\n`);
        markdown.push(`---\n`);
      }
    }

    // Footer
    markdown.push(`\n*Total items: ${items.length}*`);

    return markdown.join("\n");
  }

  /**
   * Group items by their feed ID
   */
  private groupByFeed(items: ItemWithSummary[]): Map<string, ItemWithSummary[]> {
    const grouped = new Map<string, ItemWithSummary[]>();

    for (const item of items) {
      if (!grouped.has(item.feedId)) {
        grouped.set(item.feedId, []);
      }
      grouped.get(item.feedId)!.push(item);
    }

    // Sort items within each group by date (newest first)
    for (const [_, feedItems] of grouped) {
      feedItems.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
    }

    return grouped;
  }

  /**
   * Format feed ID into a readable name
   */
  private formatFeedName(feedId: string): string {
    const names: Record<string, string> = {
      "arxiv_ai": "arXiv - Artificial Intelligence",
      "arxiv_cl": "arXiv - Computation and Language",
      "biorxiv_ai": "bioRxiv - AI & Bioinformatics",
      "arxiv_comp_bio": "arXiv - Computational Biology",
      "hacker_news": "Hacker News",
      "answerai_blog": "Answer.AI Blog",
      "huggingface_blog": "Hugging Face Blog",
    };
    return names[feedId] || feedId;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Generate filename with date
   */
  generateFilename(outputDir: string, date: Date): string {
    const dateStr = this.formatDate(date);
    return `${outputDir}/weekly_summary_${dateStr}.md`;
  }

  /**
   * Write markdown report to file
   */
  async writeReport(
    items: ItemWithSummary[],
    outputDir: string,
    startDate: Date,
    endDate: Date,
  ): Promise<string> {
    const markdown = this.generateReport(items, startDate, endDate);
    const filename = this.generateFilename(outputDir, new Date());

    // Ensure output directory exists
    await Deno.mkdir(outputDir, { recursive: true });

    await Deno.writeTextFile(filename, markdown);
    console.log(`\n✅ Report written to: ${filename}`);

    return filename;
  }
}
