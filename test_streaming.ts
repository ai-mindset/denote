import { connectToLlm, summariseItem } from "./src/summariser.ts";
import { ContentItem, StreamCallback } from "./src/types.ts";

// Sample article about AI in drug discovery
const testArticle: ContentItem = {
  id: "test_article_1",
  title: "AI-Driven Drug Discovery: Recent Advances and Future Directions",
  content: `
  Artificial intelligence (AI) has emerged as a transformative technology in drug discovery, offering unprecedented capabilities to accelerate the identification of novel therapeutic candidates and reduce the astronomical costs associated with bringing new drugs to market. Recent advances in deep learning models, particularly in the areas of protein structure prediction, molecular docking, and de novo drug design, have demonstrated the potential of AI to revolutionize the pharmaceutical industry.

  One of the most significant breakthroughs has been the development of AlphaFold by DeepMind, which has achieved remarkable accuracy in predicting protein structures from amino acid sequences. This capability has profound implications for structure-based drug design, as it allows researchers to model the interactions between potential drug compounds and their protein targets with a level of precision that was previously unattainable. Building on this foundation, researchers have developed AI systems that can efficiently screen vast libraries of chemical compounds to identify those with the highest likelihood of binding to specific protein targets, significantly streamlining the hit identification process.

  In parallel, generative models such as variational autoencoders (VAEs) and generative adversarial networks (GANs) have been employed to design novel molecular structures with desired properties. These approaches are particularly powerful because they can explore chemical space far more extensively than traditional high-throughput screening methods. For instance, recent work has demonstrated that AI systems can generate molecules that not only exhibit the desired binding affinity to a target protein but also satisfy multiple constraints related to synthesizability, bioavailability, and reduced toxicity.

  Despite these advances, significant challenges remain in the application of AI to drug discovery. Many of the current models rely heavily on the quality and quantity of available training data, which can be limited for certain classes of targets or diseases. Moreover, the interpretability of complex AI models remains a concern, as understanding the reasoning behind AI-generated predictions is crucial for clinical decision-making and regulatory approval.

  Looking to the future, the integration of AI with other emerging technologies such as CRISPR-based genetic screening and single-cell sequencing holds promise for developing more personalized therapeutic approaches. Additionally, the incorporation of reinforcement learning techniques may enable the design of more complex therapeutic modalities beyond small molecules, such as antibodies, peptides, and oligonucleotides. As AI continues to evolve, its impact on drug discovery is expected to grow, potentially revolutionizing how we develop treatments for a wide range of diseases.
  `,
  url: "https://example.com/ai-drug-discovery",
  date: new Date(),
  source: "test_source",
  author: "Test Author",
  tags: ["AI", "drug discovery", "machine learning", "deep learning"]
};

async function testWithStreaming() {
  try {
    console.log("Connecting to Ollama...");
    const llmClient = await connectToLlm(
      "http://localhost:11434/api/generate",
      "mistral",
      {
        max_tokens: 256,
        temperature: 0.7
      }
    );

    console.log("\nSummarizing with streaming enabled:");
    console.log("--------------------------");

    // Define streaming callback
    const streamCallback: StreamCallback = (chunk: string) => {
      Deno.stdout.writeSync(new TextEncoder().encode(chunk));
    };

    // Call summariseItem with streaming
    const streamingResult = await summariseItem(testArticle, llmClient, 150, streamCallback);

    console.log("\n--------------------------");
    console.log(`Success: ${streamingResult.success}`);
    console.log(`Summary word count: ${streamingResult.summary.split(" ").length} words`);

    console.log("\nSummarizing with streaming disabled:");
    console.log("--------------------------");

    // Call summariseItem without streaming
    const nonStreamingResult = await summariseItem(testArticle, llmClient, 150);

    console.log(`Success: ${nonStreamingResult.success}`);
    console.log(`Summary (${nonStreamingResult.summary.split(" ").length} words):`);
    console.log(nonStreamingResult.summary);
    console.log("--------------------------");

    await llmClient.close();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Run the test
testWithStreaming();