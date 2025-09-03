require("dotenv").config();
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.generateQAsViaGPTV1 = async (textChunk, botName, botDescription) => {
  try {
    const systemPrompt = `
You are an AI assistant that helps generate valuable, context-aware Q&A pairs from user-provided documents.

The chatbot being built is named **${botName}**.
Its purpose/description is: **${botDescription}**.

Based on the chunk of document text provided, extract meaningful questions and answers that reflect the tone and intent of this bot.
Focus on generating **informative, helpful, and on-topic Q&A pairs** that align with the bot's purpose.
Return only a list of 10–15 questions and answers in JSON format like this:

[
  { "question": "...", "answer": "..." },
  ...
]
    `;

    const userPrompt = `Here is a chunk of the document:\n\n${textChunk}\n\nGenerate Q&A pairs now.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content;

    // Parse the JSON block
    const qas = JSON.parse(responseText);
    return Array.isArray(qas) ? qas : [];
  } catch (error) {
    console.error("Error in generateQAsViaGPT:", error);
    return [];
  }
};

exports.getEmbedding = async (text) => {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text
  });

  return new Float32Array(response.data[0].embedding);
};

// TODO: DELETE AFTER HACKATHON
const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: "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",
});

exports.generateQAsViaGPT = async (textChunk, botName, botDescription) => {
  try {
    const systemPrompt = `
You are an AI assistant that helps generate valuable, context-aware Q&A pairs from user-provided documents.

The chatbot being built is named **${botName}**.
Its purpose/description is: **${botDescription}**.

Based on the chunk of document text provided, extract meaningful questions and answers that reflect the tone and intent of this bot. 
Focus on generating **informative, helpful, and on-topic Q&A pairs** that align with the bot's purpose.
Return only a list of 10–15 questions and answers in JSON format like this:

[
  { "question": "...", "answer": "..." },
  ...
]
    `;

    const userPrompt = `Here is a chunk of the document:\n\n${textChunk}\n\nGenerate Q&A pairs now.`;

    // Use Hugging Face ChatCompletion with gpt-oss-120b:together
    const completion = await client.chat.completions.create({
      model: "openai/gpt-oss-120b:together",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const responseText = completion.choices[0].message.content;

    // Parse the JSON block
    const qas = JSON.parse(responseText);
    return Array.isArray(qas) ? qas : [];
  } catch (error) {
    console.error("Error in generateQAsViaGPT:", error);
    return [];
  }
};

exports.getEmbedding = async (text) => {
  try {
    const response = await openai.embeddings.create({
      model: "sentence-transformers/all-MiniLM-L6-v2", // embeddings model
      inputs: text,
    });

    return new Float32Array(response);
  } catch (error) {
    console.error("Embedding error:", error);
    return new Float32Array();
  }
};
