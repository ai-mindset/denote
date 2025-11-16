export interface FeedConfig {
  id: string;
  url: string;
  type: string;
}

export interface FeedItem {
  feedId: string;
  title: string;
  link: string;
  description: string;
  pubDate: Date;
  content?: string;
}

export interface Config {
  feeds: FeedConfig[];
  topics: string[];
  summaryLength: number;
  maxItemsPerWeek: number;
  output: {
    directory: string;
    filename: string;
  };
  database: {
    path: string;
  };
  llm: {
    url: string;
    model: string;
    parameters: {
      max_tokens: number;
      temperature: number;
      top_p: number;
      top_k: number;
    };
  };
}

export interface StoredFeedItem {
  link: string;
  feed_id: string;
  title: string;
  description: string;
  content: string;
  pub_date: string;
  processed_at: string;
  summary: string;
}
