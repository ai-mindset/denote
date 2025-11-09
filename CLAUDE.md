# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Denote is a lightweight, self-hosted weekly TL;DR summariser built with Deno. It fetches articles, papers, podcasts, and videos from various sources, generates concise 150-word summaries using a local LLM, and delivers a ready-to-read markdown digest.

## Architecture

Denote follows a modular pipeline architecture:

```
Sources (RSS/Atom, arXiv, YouTube, GitHub, URLs)
    ↓
Fetcher (fetcher.ts) - Downloads and stores articles
    ↓
SQLite Database - Persistent storage
    ↓
Summarizer (summarizer.ts) - On-device LLM summarization
    ↓
Ranker (ranker.ts) - Ranks content by relevance
    ↓
Markdown Generator (generate.ts) - Creates weekly digest
    ↓
Output File (weekly_summary.md) - Saved to disk
```

### Key Components

1. **Fetcher** (`src/fetcher.ts`)
   - Retrieves content from configured sources
   - Manages database storage of fetched items
   - Handles different source types via specialised parsers

2. **Summariser** (`src/summarizer.ts`)
   - Connects to local LLM server (llama.cpp with mistral model)
   - Generates concise 150-word summaries
   - Maintains context and summary quality

3. **Ranker** (`src/ranker.ts`)
   - Applies user-defined topic filtering
   - Prioritises content by relevance
   - Selects top N items for the weekly digest

4. **Generator** (`src/generate.ts`)
   - Creates formatted markdown output
   - Structures digest with highlights, summaries, and further reading

5. **Parsers** (`src/parsers/`)
   - Specialised parsers for different source types
   - Normalise content from diverse sources into a common format

## Development Commands

```bash
# Install dependencies
deno task install

# Run complete pipeline (both fetch and generate)
deno run --allow-net --allow-read --allow-write src/main.ts

# Run fetch only
deno run --allow-net --allow-read --allow-write src/main.ts --fetch-only

# Run generate only
deno run --allow-net --allow-read --allow-write src/main.ts --generate-only

# Use custom configuration file
deno run --allow-net --allow-read --allow-write src/main.ts --config custom_config.json

# Run tests
deno task test

# Run unit tests only
deno task test:unit

# Check code coverage
deno task test:coverage
```

## Configuration

Configuration is managed through `config.json`:

```json
{
  "feeds": [
    { "id": "arxiv_ai", "url": "http://export.arxiv.org/rss/cs.AI" },
    { "id": "answerai_blog", "url": "https://www.answer.ai/index.xml" }
  ],
  "topics": ["ai", "llms", "machine learning", "deep learning"],
  "summaryLength": 150,
  "maxItemsPerWeek": 10,
  "output": {
    "directory": "./output",
    "filename": "weekly_summary.md"
  },
  "database": {
    "path": "./denote.db"
  },
  "llm": {
    "url": "http://localhost:8080",
    "model": "mistral",
    "parameters": {
      "max_tokens": 512,
      "temperature": 0.7
    }
  }
}
```

The configuration supports the following options:

- `feeds`: Array of content sources to fetch from
  - `id`: Unique identifier for the feed
  - `url`: URL to fetch the feed from
  - `type` (optional): Feed type, auto-detected if not specified
- `topics`: Keywords to prioritise in content ranking
- `summaryLength`: Target summary length in words
- `maxItemsPerWeek`: Maximum number of items to include per digest
- `output`: Where to save the generated digest
- `database`: SQLite database configuration
- `llm`: Configuration for the local LLM server connection

## Testing

When implementing new parsers or features, you should:

1. Create unit tests in the `tests/` directory
2. Test with a small sample of real-world feeds
3. Verify output format matches expected digest structure

To run tests:
```bash
deno test
```

## Implementation Details

### Data Models

The core data models used throughout the application:

1. **ContentItem**: Represents a fetched article/paper/post with metadata
   ```typescript
   interface ContentItem {
     id: string;           // Unique identifier
     title: string;        // Article title
     url: string;          // Original source URL
     date: Date;           // Publication date
     source: string;       // Source name or feed ID
     content: string;      // Main content text
     author?: string;      // Optional author information
     tags?: string[];      // Optional categories/tags
   }
   ```

2. **SummarizedItem**: ContentItem with added summary
   ```typescript
   interface SummarizedItem extends ContentItem {
     summary: string;      // Generated summary
     summarized: boolean;  // Whether summarization was successful
   }
   ```

3. **RankedItem**: SummarizedItem with relevance score
   ```typescript
   interface RankedItem extends SummarizedItem {
     score: number;         // Relevance score (0-100)
     matchingTopics: string[]; // Topics matched in content
   }
   ```

### Key Technical Features

1. **Feed Auto-Detection**: The system detects feed types (RSS/Atom/etc.) based on URL patterns and content.

2. **Smart Deduplication**: The SQLite database prevents duplicate processing by tracking item IDs.

3. **Local LLM Integration**: Summarisation uses a local LLM server for privacy and to avoid API costs.
   ```typescript
   // Example prompt format
   const prompt = `Summarise the following content in about ${length} words.
   The summary should be concise, factual, and capture the key points.

   Title: ${item.title}
   Source: ${item.source}
   Content:
   ${item.content}

   Summary:`;
   ```

4. **Topic Relevance Scoring**: Ranking algorithm combines topic matching and recency.
   ```typescript
   // Score calculation
   const topicScore = Math.min(matchingTopics.length * 20, 80);
   const recencyScore = 20 * Math.exp(-0.05 * ageInDays);
   const totalScore = topicScore + recencyScore;
   ```

5. **Structured Digest Format**:
   - **Highlights**: Top 3 items with single-sentence summaries
   - **Summaries**: Full summaries of all selected items
   - **Further Reading**: Items grouped by source with direct links
   - **Topics**: Items organised by matching topics

6. **Robust Error Handling**: Graceful fallbacks if fetching, parsing, or summarisation fails.

7. **Testable Architecture**: Modular design with clear interfaces for easier testing.