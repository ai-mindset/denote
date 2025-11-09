import { RankedItem, SummarizedItem } from "./types.ts";

/**
 * Ranks content items based on relevance to topics and recency
 * @param items Array of summarised items to rank
 * @param topics List of topics/keywords to prioritise
 * @param maxItems Maximum number of items to return (defaults to 10)
 * @returns Array of ranked items, sorted by relevance score
 */
export function rankItems(
  items: SummarizedItem[],
  topics: string[],
  maxItems = 10,
): RankedItem[] {
  // First, calculate scores for each item
  const rankedItems: RankedItem[] = items.map((item) => {
    // Find matching topics in the content and title
    const content = `${item.title} ${item.summary} ${item.content}`.toLowerCase();
    const matchingTopics = matchTopics(content, topics);

    // Calculate a relevance score
    const score = scoreRelevance(item, matchingTopics);

    return {
      ...item,
      score,
      matchingTopics,
    };
  });

  // Sort by score (highest first)
  rankedItems.sort((a, b) => b.score - a.score);

  // Return the top N items
  return rankedItems.slice(0, maxItems);
}

/**
 * Find topics that match in the content
 * @param content The content to search in (lowercase)
 * @param topics Array of topics to match
 * @returns Array of matching topics
 */
export function matchTopics(content: string, topics: string[]): string[] {
  const matches: string[] = [];

  for (const topic of topics) {
    const topicLower = topic.toLowerCase();

    // Check for exact match
    if (content.includes(topicLower)) {
      matches.push(topic);
      continue;
    }

    // Check for word boundary matches
    // This is a simple approach - in a real implementation we might use
    // more sophisticated NLP techniques like stemming or word embeddings
    const words = topicLower.split(/\s+/);

    if (words.length > 1) {
      // For multi-word topics, check if most words match
      let matchCount = 0;
      for (const word of words) {
        if (word.length > 3 && content.includes(word)) {
          matchCount++;
        }
      }

      // If most words match, consider it a match
      if (matchCount >= words.length * 0.7) {
        matches.push(topic);
      }
    }
  }

  return matches;
}

/**
 * Calculate a relevance score for an item
 * @param item The content item
 * @param matchingTopics Array of matching topics
 * @returns Score between 0 and 100
 */
export function scoreRelevance(
  item: SummarizedItem,
  matchingTopics: string[],
): number {
  // Base score from topic matches (0-80)
  const topicScore = Math.min(matchingTopics.length * 20, 80);

  // Recency score (0-20)
  const now = new Date();
  const ageInDays = (now.getTime() - item.date.getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay for older items
  const recencyScore = 20 * Math.exp(-0.05 * ageInDays);

  // Combine scores
  const totalScore = topicScore + recencyScore;

  return totalScore;
}

/**
 * Group ranked items by matching topics
 * @param items Array of ranked items
 * @returns Object with topics as keys and arrays of items as values
 */
export function groupByTopics(items: RankedItem[]): Record<string, RankedItem[]> {
  const groups: Record<string, RankedItem[]> = {};

  // Initialize groups for each topic that has matches
  const allMatchingTopics = new Set<string>();
  items.forEach((item) => {
    item.matchingTopics.forEach((topic) => allMatchingTopics.add(topic));
  });

  // Create empty arrays for each topic
  allMatchingTopics.forEach((topic) => {
    groups[topic] = [];
  });

  // Add "Other" group for items with no matching topics
  groups["Other"] = [];

  // Assign items to groups
  items.forEach((item) => {
    if (item.matchingTopics.length === 0) {
      // If no topics match, add to "Other"
      groups["Other"].push(item);
    } else {
      // Add to each matching topic group
      item.matchingTopics.forEach((topic) => {
        groups[topic].push(item);
      });
    }
  });

  return groups;
}

/**
 * Select the highest scoring items from each topic group
 * @param groups Grouped items by topic
 * @param maxItems Maximum total items to select
 * @param maxPerTopic Maximum items per topic
 * @returns Array of selected items, sorted by score
 */
export function selectTopItemsByGroup(
  groups: Record<string, RankedItem[]>,
  maxItems = 10,
  maxPerTopic = 3,
): RankedItem[] {
  const selected: RankedItem[] = [];
  const selectedIds = new Set<string>();

  // Sort each group by score
  Object.keys(groups).forEach((topic) => {
    groups[topic].sort((a, b) => b.score - a.score);
  });

  // Get topics sorted by highest scoring item
  const topics = Object.keys(groups).sort((a, b) => {
    const aScore = groups[a][0]?.score ?? 0;
    const bScore = groups[b][0]?.score ?? 0;
    return bScore - aScore;
  });

  // Select items from each topic, giving priority to higher ranked topics
  let round = 0;
  while (selected.length < maxItems && round < maxPerTopic) {
    for (const topic of topics) {
      if (selected.length >= maxItems) break;

      const topicItems = groups[topic];
      if (round < topicItems.length) {
        const item = topicItems[round];

        // Only add if we haven't already selected this item
        if (!selectedIds.has(item.id)) {
          selected.push(item);
          selectedIds.add(item.id);
        }
      }
    }

    round++;
  }

  // Sort by score
  selected.sort((a, b) => b.score - a.score);

  return selected;
}
