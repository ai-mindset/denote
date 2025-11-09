import { ContentItem, LlmClient, SummarizedItem, SummaryResult } from "./types.ts";

/**
 * Simple LLM client implementation for local server
 */
export class LocalLlmClient implements LlmClient {
  /**
   * Create a new LLM client
   * @param url The LLM server URL
   * @param model The model to use
   * @param parameters Additional model parameters
   */
  constructor(
    private url: string,
    private model: string,
    private parameters: Record<string, unknown> = {},
  ) {}

  /**
   * Generate text from a prompt using the LLM
   * @param prompt The prompt to send to the LLM
   * @param streamCallback Optional callback for streaming responses
   * @returns Generated text
   */
  async generate(prompt: string, streamCallback?: StreamCallback): Promise<string> {
    try {
      // Determine if we should stream based on whether a callback was provided
      const shouldStream = !!streamCallback;

      // Prepare request body for Ollama API
      const requestBody = {
        model: this.model,
        prompt: prompt,
        stream: shouldStream,
        options: {
          num_predict: this.parameters.max_tokens || 512,
          temperature: this.parameters.temperature || 0.7,
          top_p: this.parameters.top_p || 0.95,
          top_k: this.parameters.top_k || 40,
        },
      };

      // Send request to Ollama server
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`LLM server error: ${response.status} ${response.statusText}`);
      }

      // Handle streaming response
      if (shouldStream && streamCallback) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        if (!reader) {
          throw new Error("Failed to get response reader");
        }

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          try {
            // Ollama sends JSON objects in the stream
            const lines = chunk
              .split("\n")
              .filter((line) => line.trim() !== "");

            for (const line of lines) {
              const data = JSON.parse(line);
              const responseChunk = data.response || "";
              if (responseChunk) {
                streamCallback(responseChunk);
                fullText += responseChunk;
              }
            }
          } catch (e) {
            console.error("Error parsing streaming response:", e);
            // Still try to use the chunk even if JSON parsing fails
            streamCallback(chunk);
            fullText += chunk;
          }
        }

        return fullText;
      } else {
        // Handle non-streaming response
        const result = await response.json();
        // Ollama returns the response in a 'response' field
        return result.response || result.text || result.output || result.generated_text || "";
      }
    } catch (error) {
      throw new Error(`LLM generation failed: ${error.message}`);
    }
  }

  /**
   * Close the LLM client connection
   */
  async close(): Promise<void> {
    // Nothing to close for a simple HTTP client
  }
}

/**
 * Connect to an LLM server
 * @param url LLM server URL
 * @param model Model to use
 * @param parameters Additional model parameters
 * @returns LLM client instance
 */
export async function connectToLlm(
  url: string,
  model: string,
  parameters: Record<string, unknown> = {},
): Promise<LlmClient> {
  return new LocalLlmClient(url, model, parameters);
}

/**
 * Summarise a content item using an LLM
 * @param item The content item to summarise
 * @param llm The LLM client to use
 * @param length Target summary length in words (approximate)
 * @param streamCallback Optional callback for streaming the LLM output
 * @returns Summarisation result
 */
export async function summariseItem(
  item: ContentItem,
  llm: LlmClient,
  length = 150,
  streamCallback?: StreamCallback,
): Promise<SummaryResult> {
  // Check if content is too short to summarise
  if (item.content.length < length * 5) {
    // If the content is very short, just use it as the summary
    return {
      success: true,
      summary: item.content,
    };
  }

  try {
    // Prepare the prompt
    const prompt = createSummaryPrompt(item, length);

    // Generate the summary, optionally with streaming
    const response = await llm.generate(prompt, streamCallback);

    // Clean up the summary
    const summary = cleanupSummary(response);

    return {
      success: true,
      summary,
    };
  } catch (error) {
    console.error(`Error summarising item ${item.id}:`, error);

    // Return a fallback summary with the error
    return {
      success: false,
      summary: `Error summarising content: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Create a prompt for summarising content
 * @param item The content item to summarise
 * @param length Target summary length in words
 * @returns Formatted prompt for the LLM
 */
function createSummaryPrompt(item: ContentItem, length: number): string {
  return `Summarise the following content in about ${length} words.
The summary should be concise, factual, and capture the key points.

Title: ${item.title}
Source: ${item.source}
${item.author ? `Author: ${item.author}` : ""}
Date: ${item.date.toISOString().split("T")[0]}

Content:
${item.content}

Summary:`;
}

/**
 * Clean up the summary generated by the LLM
 * @param summary Raw summary from the LLM
 * @returns Cleaned summary
 */
function cleanupSummary(summary: string): string {
  // Remove any "Summary:" prefix that might have been generated
  summary = summary.replace(/^Summary:\s*/i, "");

  // Remove quotes if the LLM added them
  summary = summary.replace(/^"(.*)"$/s, "$1");

  // Trim whitespace
  summary = summary.trim();

  return summary;
}

/**
 * Summarise multiple content items
 * @param items Array of content items to summarise
 * @param llm LLM client to use
 * @param length Target summary length in words
 * @param streamOutput Whether to stream LLM output during summarization
 * @returns Array of summarised items
 */
export async function summariseItems(
  items: ContentItem[],
  llm: LlmClient,
  length = 150,
  streamOutput = true,
): Promise<SummarizedItem[]> {
  const summarised: SummarizedItem[] = [];

  for (const item of items) {
    console.log(`Summarising item: ${item.title}`);

    const streamCallback = streamOutput
      ? (chunk: string) => {
        // Use Deno.stdout.write instead of process.stdout.write
        Deno.stdout.writeSync(new TextEncoder().encode(chunk));
      }
      : undefined;

    const result = await summariseItem(item, llm, length, streamCallback);

    if (streamOutput) {
      // Add a newline after streaming is complete
      console.log("");
    }

    summarised.push({
      ...item,
      summary: result.summary,
      summarized: result.success,
    });
  }

  return summarised;
}
