const QAHistory = require('../models/QAHistory');
const { getEmbedding } = require('../utils/gptUtils');
const { cosineSimilarity } = require('../utils/embedUtils');

exports.publicAskBot = async (req, res) => {
  try {
    const { botId } = req.params;
    const { question } = req.body;

    if (!question) return res.status(400).json({ message: 'Question is required.' });

    const inputEmbedding = await getEmbedding(question);
    const qas = await QAHistory.find({ bot: botId });

    let bestMatch = null;
    let bestScore = -1;

    for (let qa of qas) {
      const storedEmbedding = new Float32Array(qa.embedding.buffer);
      const score = cosineSimilarity(inputEmbedding, storedEmbedding);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = qa;
      }
    }

    if (bestScore > 0.85 && bestMatch) {
      // Save the new question + answer pair to history
      await QAHistory.create({
        bot: botId,
        question,
        answer: bestMatch.answer,
        embedding: Buffer.from(inputEmbedding.buffer),
      });

      return res.json({
        answer: bestMatch.answer,
        confidence: bestScore,
        message: 'Answer found',
      });
    }

    return res.json({
      message: 'No similar question found.',
      confidence: bestScore,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
