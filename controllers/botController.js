const ChatBot = require("../models/ChatBot");
const QAHistory = require("../models/QAHistory");
const { extractTextFromPDF } = require("../utils/textExtractor");
const { generateQAsViaGPT, getEmbedding } = require("../utils/gptUtils");
const { embedText, cosineSimilarity } = require("../utils/embedUtils");

exports.createBot = async (req, res) => {
  try {
    const {
      name,
      website_url,
      description,
      is_voice_enabled,
      is_auto_translate,
      supported_languages,
      primary_purpose,
      specialisation_area,
      conversation_tone,
      response_style,
      target_audience,
      key_topics,
      keywords,
      custom_instructions,
    } = req.body;

    if (!name || !website_url || !description) {
      return res.status(400).json({
        error: "Missing required fields: name, website_url, or description",
      });
    }

    const bot = await ChatBot.create({
      name,
      website_url,
      description,
      is_voice_enabled: is_voice_enabled === "true",
      is_auto_translate: is_auto_translate === "true",
      supported_languages: Array.isArray(supported_languages)
    ? supported_languages
    : supported_languages?.split(",").map(lang => lang.trim()),
      primary_purpose,
      specialisation_area,
      conversation_tone,
      response_style,
      target_audience,
      key_topics,
      keywords,
      custom_instructions,
    });

    // Trigger background scraping (placeholder)
    console.log(`Scraping website: ${website_url} for bot ${bot._id}`);

    // Handle uploaded file (if any)
    if (req.file) {
      const text = await extractTextFromPDF(req.file.path);

      if (text && text.trim()) {
        const chunks = text.match(/.{1,3000}/g);
        for (const chunk of chunks) {
          const qas = await generateQAsViaGPT(chunk, name, description);
          for (const qa of qas) {
            const { question, answer } = qa;
            if (question && answer) {
              const embedding = await embedText(question);
              await QAHistory.create({
                bot: bot._id,
                question,
                answer,
                embedding: Buffer.from(embedding.buffer),
              });
            }
          }
        }
      }
    }

    res.json({
      bot_id: bot._id,
      message: "Bot created successfully with GPT-generated QAs.",
    });
  } catch (error) {
    console.error("Create bot error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.askBot = async (req, res) => {
  try {
    const { question, botId } = req.body;
    if (!question || !botId)
      return res.status(400).json({ message: "Missing question or botId" });

    const inputEmbedding = await getEmbedding(question); // Float32Array
    const qas = await QAHistory.find({ bot: botId });

    let bestMatch = null;
    let bestScore = -1;

    for (let qa of qas) {
      const storedEmbedding = new Float32Array(qa.embedding.buffer); // Assuming stored as Buffer
      const score = cosineSimilarity(inputEmbedding, storedEmbedding);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = qa;
      }
    }

    // If a good match is found, return and store the new Q/A
    if (bestScore > 0.85 && bestMatch) {
      // Save the new question-answer pair with its embedding
      const newQA = new QAHistory({
        bot: botId,
        question: question,
        answer: bestMatch.answer,
        embedding: Buffer.from(inputEmbedding.buffer), // Convert to Buffer for Mongo
      });
      await newQA.save();

      return res.json({
        answer: bestMatch.answer,
        score: bestScore,
        message: "Answer found and logged to history.",
      });
    }

    return res.json({
      message: "No similar question found.",
      score: bestScore,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
