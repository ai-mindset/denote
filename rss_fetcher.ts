import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
import type { FeedConfig, FeedItem } from "./types.ts";

export class RSSFetcher {
  async fetchFeed(feedConfig: FeedConfig): Promise<FeedItem[]> {
    try {
      const response = await fetch(feedConfig.url);
      const xmlText = await response.text();
      return this.parseRSS(xmlText, feedConfig.id);
    } catch (error) {
      console.error(`Error fetching ${feedConfig.id}:`, error);
      return [];
    }
  }

  private parseRSS(xmlText: string, feedId: string): FeedItem[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/html");

    if (!doc) return [];

    const items = doc.querySelectorAll("rdf\\:RDF > item, item, entry");
    const feedItems: FeedItem[] = [];

    items.forEach((item) => {
      let title = this.getTextContent(item, "title");
      title = title.replace(/<!?\[CDATA\[|\]\]>|!\[CDATA\[/g, "").replace(/&lt;|&gt;/g, "").trim();

      let link = this.getTextContent(item, "link");
      if (!link) {
        link = item.getAttribute("rdf:about") || item.getAttribute("about") || "";
      }

      let description = this.getTextContent(item, "description, summary, dc\\:description");
      description = description
        .replace(/<!--\s*\[CDATA\[/g, "")
        .replace(/\]\]-->/g, "")
        .replace(/<!?\[CDATA\[/g, "")
        .replace(/!\[CDATA\[/g, "")
        .replace(/\]\]>/g, "")
        .trim();

      const pubDateStr = this.getTextContent(item, "pubDate, published, updated, dc\\:date, prism\\:publicationdate");
      const content = this.getTextContent(item, "content\\:encoded, content");

      if (title && link) {
        feedItems.push({
          feedId,
          title,
          link,
          description: description || "",
          pubDate: pubDateStr ? new Date(pubDateStr) : new Date(),
          content: content || description || "",
        });
      }
    });

    return feedItems;
  }

  private getTextContent(element: Element, selectors: string): string {
    const selectorList = selectors.split(",").map((s) => s.trim());
    for (const selector of selectorList) {
      const el = element.querySelector(selector);
      if (el) {
        const content = el.innerHTML || el.textContent;
        if (content) return content.trim();
      }
    }
    return "";
  }

  async fetchAllFeeds(feeds: FeedConfig[]): Promise<FeedItem[]> {
    const promises = feeds.map((feed) => this.fetchFeed(feed));
    const results = await Promise.all(promises);
    return results.flat();
  }
}
