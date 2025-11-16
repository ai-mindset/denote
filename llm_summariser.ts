import { PrettyConsole } from "./pretty_console.ts";
import type { FeedItem } from "./types.ts";

interface LLMConfig {
  url: string;
  model: string;
  parameters: {
    max_tokens: number;
    temperature: number;
    top_p: number;
    top_k: number;
  };
}

export class LLMSummariser {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Summarise a single feed item using Ollama
   */
  async summariseItem(item: FeedItem, maxLength: number = 150): Promise<string> {
    const prompt = this.buildPrompt(item, maxLength);

    try {
      const response = await fetch(this.config.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.model,
          prompt: prompt,
          stream: false,
          options: {
            num_predict: this.config.parameters.max_tokens,
            temperature: this.config.parameters.temperature,
            top_p: this.config.parameters.top_p,
            top_k: this.config.parameters.top_k,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response.trim();
    } catch (error) {
      console.error(`Error summarising "${item.title}":`, error);
      return `[Summary failed] ${item.description.substring(0, maxLength)}...`;
    }
  }

  /**
   * Build the prompt for summarisation
   */
  private buildPrompt(item: FeedItem, maxLength: number): string {
    const content = item.content || item.description;
    return `Summarise the following scientific article in ${maxLength} words or less. Focus on the key findings and relevance to AI and drug discovery:

Title: ${item.title}

Content: ${content}

Summary:`;
  }

  /**
   * Summarise multiple items sequentially
   */
  async summariseItems(items: FeedItem[], maxLength: number = 150): Promise<Map<string, string>> {
    const summaries = new Map<string, string>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      PrettyConsole.progress(i + 1, items.length, item.title.substring(0, 50));

      const summary = await this.summariseItem(item, maxLength);
      summaries.set(item.link, summary);
    }

    return summaries;
  }
}
