const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generates an embedding for a given input string using OpenAI's Embedding API.
 * @param {string} text - Text to embed
 * @returns {Promise<Float32Array>} - The embedding vector
 */
exports.embedTextV1 = async (text) => {
  try {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Empty input for embedding.");

    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: trimmed,
    });

    const embedding = response.data[0].embedding;
    return new Float32Array(embedding);
  } catch (error) {
    console.error("Embedding error:", error);
    return new Float32Array();
  }
};

exports.cosineSimilarity = (vecA, vecB) => {
  let dot = 0,
    normA = 0,
    normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// TODO: DELETE AFTER HACKATHON
exports.embedText = async (text) => {
  try {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Empty input for embedding.");

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/Qwen/Qwen3-Embedding-0.6B/pipeline/feature-extraction",
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: trimmed }),
      }
    );

    if (!response.ok) {
      throw new Error(`HF API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // Hugging Face returns nested arrays, so flatten to Float32Array
    const embedding = result[0];
    return new Float32Array(embedding);
  } catch (error) {
    console.error("Embedding error:", error);
    return new Float32Array();
  }
};

