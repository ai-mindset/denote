import { RSSFetcher } from "./rss_fetcher.ts";
import { TopicFilter } from "./topic_filter.ts";
import { FeedDatabase } from "./database.ts";
import { LLMSummariser } from "./llm_summariser.ts";
import { MarkdownGenerator } from "./markdown_generator.ts";
import { parseCliArgs } from "./cli.ts";
import { PrettyConsole } from "./pretty_console.ts";
import type { Config } from "./types.ts";

// Parse CLI arguments
const cliArgs = parseCliArgs();

PrettyConsole.header("RSS Feed Summariser");
PrettyConsole.info(`Looking back ${cliArgs.days} days`);

// Load config from CLI argument
const configText = await Deno.readTextFile(cliArgs.config);
const config: Config = JSON.parse(configText); // Fetch all feeds

PrettyConsole.section("Fetching feeds");
const fetcher = new RSSFetcher();
const allItems = await fetcher.fetchAllFeeds(config.feeds);
PrettyConsole.success(`Found ${allItems.length} total items`);

// Filter to recent items
const lookbackDate = new Date();
lookbackDate.setDate(lookbackDate.getDate() - cliArgs.days);
const recentItems = allItems.filter((item) => item.pubDate >= lookbackDate);
PrettyConsole.info(`${recentItems.length} items from the last ${cliArgs.days} days`);

// Filter by topics
PrettyConsole.section("Filtering by topics");
const topicFilter = new TopicFilter();
const relevantItems = topicFilter.filterItems(recentItems, config.topics);
PrettyConsole.success(`${relevantItems.length} relevant items matched`);

// Check database for new items
PrettyConsole.section("Checking database");
const db = new FeedDatabase(config.database.path);
const newItems = db.filterNewItems(relevantItems);
PrettyConsole.info(`${newItems.length} new items to process`);

if (newItems.length === 0) {
  PrettyConsole.info("No new items to summarise. Exiting.");
  db.close();
  Deno.exit(0);
}

// Summarise new items
PrettyConsole.section("Summarising with LLM");
const summariser = new LLMSummariser(config.llm);
const summaries = await summariser.summariseItems(newItems, config.summaryLength);

// Store items with summaries in database
PrettyConsole.section("Storing in database");
for (const item of newItems) {
  const summary = summaries.get(item.link);
  db.insertItem(item, summary);
}
PrettyConsole.success(`Stored ${newItems.length} items`);

// Generate markdown report
PrettyConsole.section("Generating report");
const mdGenerator = new MarkdownGenerator();
const itemsWithSummaries = newItems.map((item) => ({
  ...item,
  summary: summaries.get(item.link) || "",
}));

await mdGenerator.writeReport(
  itemsWithSummaries,
  config.output.directory,
  lookbackDate,
  new Date(),
);

// Summary
PrettyConsole.header("Summary");
PrettyConsole.summary([
  ["Total items fetched", allItems.length],
  ["Relevant items", relevantItems.length],
  ["New items processed", newItems.length],
  ["Days looked back", cliArgs.days],
]);

db.close();
