const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const fetch = require('node-fetch');

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
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds
  const REQUEST_TIMEOUT = 30000; // 30 seconds

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const trimmed = text.trim();
      if (!trimmed) throw new Error("Empty input for embedding.");

      console.log(`Embedding attempt ${attempt}/${MAX_RETRIES} for text length: ${trimmed.length}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(
        "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({ 
            inputs: trimmed,
            options: { wait_for_model: true }
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 504 || response.status === 503) {
          console.warn(`HF API returned ${response.status}, retrying in ${RETRY_DELAY}ms...`);
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
            continue;
          }
        }
        throw new Error(`HF API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Handle different response formats
      let embedding;
      if (Array.isArray(result) && result.length > 0) {
        embedding = Array.isArray(result[0]) ? result[0] : result;
      } else if (Array.isArray(result)) {
        embedding = result;
      } else {
        throw new Error("Unexpected response format from HF API");
      }

      console.log(`Successfully generated embedding of dimension: ${embedding.length}`);
      return new Float32Array(embedding);

    } catch (error) {
      console.error(`Embedding attempt ${attempt} failed:`, error.message);
      
      if (attempt === MAX_RETRIES) {
        console.error("All embedding attempts failed, returning empty array");
        return new Float32Array(384); // Return zero vector with expected dimension
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
    }
  }
};

