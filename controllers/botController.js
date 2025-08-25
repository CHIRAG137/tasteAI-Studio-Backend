const axios = require("axios");
const SlackIntegration = require("../models/SlackIntegration");
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
      is_slack_enabled,
      slack_command,
      slack_channel_id,
      conversationFlow,
    } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        error: "Missing required fields: name, or description",
      });
    }

    let parsedLanguages;
    try {
      parsedLanguages = JSON.parse(supported_languages);
      if (!Array.isArray(parsedLanguages)) throw new Error("Not an array");
    } catch {
      parsedLanguages = supported_languages
        ?.split(",")
        .map((lang) => lang.trim());
    }

    const bot = await ChatBot.create({
      user: req.user.id,
      name,
      website_url,
      description,
      is_voice_enabled: is_voice_enabled === "true",
      is_auto_translate: is_auto_translate === "true",
      is_slack_enabled: is_slack_enabled === "true",
      slack_command,
      slack_channel_id,
      supported_languages: parsedLanguages,
      primary_purpose,
      specialisation_area,
      conversation_tone,
      response_style,
      target_audience,
      key_topics,
      keywords,
      custom_instructions,
      conversationFlow: conversationFlow || { nodes: [], edges: [] },
    });

    console.log(`Scraping website: ${website_url} for bot ${bot._id}`);

    // 🔹 Auto-join Slack channel if enabled
    if (is_slack_enabled === "true" && slack_channel_id) {
      const slackIntegration = await SlackIntegration.findOne({
        userId: req.user.id,
      });

      if (slackIntegration?.slackAccessToken) {
        try {
          // Join the channel
          await axios.post(
            "https://slack.com/api/conversations.join",
            { channel: slack_channel_id },
            {
              headers: {
                Authorization: `Bearer ${slackIntegration.slackAccessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          console.log(`Bot joined Slack channel ${slack_channel_id}`);
        } catch (err) {
          console.error(
            "Error joining Slack channel:",
            err.response?.data || err.message
          );
        }
      } else {
        console.warn(
          "Slack integration not found for user. Bot not added to channel."
        );
      }
    }

    // 🔹 Process PDF if uploaded
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
      message:
        "Bot created successfully with GPT-generated QAs and added to Slack channel (if enabled).",
    });
  } catch (error) {
    console.error("Create bot error:", error.response?.data || error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.askBot = async (req, res) => {
  const { question, botId } = req.body;

  const bot = await ChatBot.findById(botId);
  if (!bot) return res.status(404).json({ message: "Bot not found" });

  // 1️⃣ Check conversation flow first
  const { nodes, edges } = bot.conversationFlow || { nodes: [], edges: [] };

  if (nodes.length > 0) {
    // For now, return the first message node as demo
    const startNode = nodes.find((n) => n.type === "message");
    if (startNode) {
      return res.json({
        answer: startNode.data?.message || "Flow active but no message set.",
        source: "flow",
      });
    }
  }

  // 2️⃣ Otherwise fallback to QA history (your existing logic)
  const inputEmbedding = await getEmbedding(question);
  const qas = await QAHistory.find({ bot: botId });

  let bestMatch = null,
    bestScore = -1;
  for (let qa of qas) {
    const storedEmbedding = new Float32Array(qa.embedding.buffer);
    const score = cosineSimilarity(inputEmbedding, storedEmbedding);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = qa;
    }
  }

  if (bestScore > 0.85 && bestMatch) {
    await QAHistory.create({
      bot: botId,
      question,
      answer: bestMatch.answer,
      embedding: Buffer.from(inputEmbedding.buffer),
    });

    return res.json({
      answer: bestMatch.answer,
      score: bestScore,
      source: "qa",
    });
  }

  return res.json({ message: "No match found.", score: bestScore });
};
