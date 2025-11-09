# Denote - Weekly TL;DR Summariser

A lightweight, self-hosted tool that fetches text from various sources, generates concise 150-word summaries using a local LLM, and delivers a ready-to-read markdown digest.

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Running Denote](#running-denote)
- [Scheduling and Automation](#scheduling-and-automation)
- [Output Format](#output-format)
- [Development](#development)
- [Contributing](#contributing)
- [Licence](#licence)

## Features

- **Source agnostic** - RSS/Atom, arXiv/DOI, YouTube podcasts, GitHub releases, custom URLs
- **Local processing** - SQLite storage, Deno-native fetcher, and on-device LLM summarisation (e.g. Mistral via llama.cpp)
- **Cost-effective** - Runs locally, or on a tiny VPS ($\lt$ £5/mo)
- **Weekly digest** - Generates a markdown file under 2-3 minutes read time
- **Simple delivery** - The digest is saved to a configurable folder on disk; no email or external services required
- **Topic filtering** - Focus on content relevant to your interests
- **Smart deduplication** - Never see the same content twice

## Architecture Overview

Denote follows a modular pipeline architecture:

```
Sources (RSS/Atom, arXiv, YouTube, GitHub, URLs)
    ↓
Fetcher (fetcher.ts) - Downloads and stores articles
    ↓
SQLite Database - Persistent storage
    ↓
Summariser (summariser.ts) - On-device LLM summarisation
    ↓
Ranker (ranker.ts) - Ranks content by relevance
    ↓
Markdown Generator (generate.ts) - Creates weekly digest
    ↓
Output File (weekly_summary.md) - Saved to disk
```

The key components interact as follows:

1. **Fetcher**: Retrieves content from configured sources and stores it in the database
2. **Summariser**: Processes content with a local LLM to create concise summaries
3. **Ranker**: Prioritises content based on topic matching and recency
4. **Generator**: Creates a formatted markdown digest from the top-ranked items

## Getting Started

### Prerequisites

- Deno >= 2.0
- SQLite (bundled with Deno)
- Local LLM server (e.g. [llama.cpp](https://github.com/ggerganov/llama.cpp)) with a suitable model like Mistral

### LLM Setup with Mistral

To use Denote with the Mistral model:

1. Download the Mistral model in GGUF format from [HuggingFace](https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/tree/main) (e.g., `mistral-7b-instruct-v0.2.Q4_K_M.gguf` for a good balance of quality and size)

2. Run the llama-cpp server with your downloaded model:
   ```bash
   llama-server -m path/to/mistral-7b-instruct-v0.2.Q4_K_M.gguf -c 2048 --port 8080
   ```

3. Ensure your config.json points to the server:
   ```json
   "llm": {
     "url": "http://localhost:8080/completion",
     "model": "mistral"
   }
   ```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/denote.git
   cd denote
   ```

2. Install dependencies:
   ```bash
   deno task install
   ```

3. Create a configuration file or use the default:
   ```bash
   # A default config.json is provided
   # You can edit it to add your sources
   nano config.json
   ```

4. Create the output directory:
   ```bash
   mkdir -p ./output
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

## Running Denote

### Complete Pipeline

Run both fetch and generate steps:

```bash
deno run --allow-net --allow-read --allow-write src/main.ts
```

### Fetch Only

Fetch new content without generating a digest:

```bash
deno run --allow-net --allow-read --allow-write src/main.ts --fetch-only
```

### Generate Only

Generate a digest from previously fetched content:

```bash
deno run --allow-read --allow-write src/main.ts --generate-only
```

### Custom Configuration

Specify a different configuration file:

```bash
deno run --allow-net --allow-read --allow-write src/main.ts --config custom_config.json
```

## Scheduling and Automation

Set up automated fetch and digest generation with cron:

```bash
# Daily fetch at 3 AM
0 3 * * * cd /path/to/denote && deno run --allow-net --allow-read --allow-write src/main.ts --fetch-only

# Weekly digest on Sunday at 10 PM
0 22 * * 0 cd /path/to/denote && deno run --allow-read --allow-write src/main.ts --generate-only
```

## Output Format

The generated digest (`output/weekly_summary.md`) includes:

### Example Output

```markdown
# Weekly Digest - 3 Nov - 9 Nov 2025

## Highlights

- **Deno 2.0 released** - Native support for WebGPU, improved tooling.
- **Paper: "Universal Language Model Fine-tuning for Text Classification"** - An effective transfer learning method for NLP tasks.
- **New Features in TypeScript 6.0** - Improved type inference and faster compilation.

## Summaries

### Deno 2.0 Release Notes
Deno 2.0 represents a major update to the secure JavaScript/TypeScript runtime. This release introduces native support for WebGPU, allowing developers to leverage GPU acceleration directly within their Deno applications. Performance improvements include 30% faster startup time and reduced memory usage. The bundled TypeScript compiler has been updated, and npm compatibility has been further enhanced with automatic detection and installation of native dependencies. The permission system has been refined with more granular controls and better UX for permission prompts. Breaking changes are minimal but include the removal of several previously deprecated APIs.

Source: [Deno Blog](https://deno.com/blog/v2-release)

### Universal Language Model Fine-tuning for Text Classification
...

## Further Reading

### Deno Blog
- [Deno 2.0 Release Notes](https://deno.com/blog/v2-release)
- [The Future of Server Components in Deno](https://deno.com/blog/server-components)

### arXiv
- [Universal Language Model Fine-tuning for Text Classification](https://arxiv.org/abs/1801.06146)
- [Efficient Transformers: A Survey](https://arxiv.org/abs/2009.06732)

## Topics

### Machine Learning
- [Universal Language Model Fine-tuning for Text Classification](https://arxiv.org/abs/1801.06146)
- [Efficient Transformers: A Survey](https://arxiv.org/abs/2009.06732)

### TypeScript
- [New Features in TypeScript 6.0](https://devblogs.microsoft.com/typescript/ts60-features)
- [Deno 2.0 Release Notes](https://deno.com/blog/v2-release)
```

## Development

### Directory Structure

```
denote/
├── src/                # Source code
│   ├── parsers/        # Source-specific parsers
│   ├── fetcher.ts      # Content fetching
│   ├── summariser.ts   # LLM summarisation
│   ├── ranker.ts       # Content ranking
│   ├── generate.ts     # Markdown generation
│   ├── db.ts           # Database utilities
│   ├── types.ts        # TypeScript types
│   └── main.ts         # Main application
├── tests/              # Test files
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/            # End-to-end tests
├── config.json         # Configuration
└── output/             # Generated digests
```

### Running Tests

```bash
# Run all tests
deno task test

# Run unit tests only
deno task test:unit

# Run with code coverage
deno task test:coverage
```

## Contributing

- **New source types** - Add parsers under `src/parsers/`.
- **Alternative summarisers** - Replace the LLM connection in `src/summariser.ts`.
- **Ranking tweaks** - Edit `src/ranker.ts` to incorporate additional heuristics.

Pull requests are welcome! Please keep the code style consistent and add tests for new modules.

## Licence

MIT © 2025 denote contributors.
