const tavusService = require('../services/livekitService');

exports.createConversation = async (req, res) => {
  try {
    const { personaId, conversationName } = req.body;

    const data = await tavusService.createConversation({
      personaId,
      conversationName,
    });

    res.json({
      success: true,
      conversationId: data.conversation_id,
      conversationUrl: data.url,
      dailyRoomUrl: data.daily_room_url,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, message } = req.body;

    const data = await tavusService.sendMessage(conversationId, message);

    res.json({
      success: true,
      response: data.text,
      audioUrl: data.audio_url || null,
      flashCards: data.flash_cards || [],
      quiz: data.quiz || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.endConversation = async (req, res) => {
  try {
    const { conversationId } = req.body;

    await tavusService.endConversation(conversationId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.flipFlashCard = async (req, res) => {
  try {
    const { cardId } = req.body;

    // Dummy flip logic (frontend state-driven)
    res.json({
      success: true,
      flashCard: {
        id: cardId,
        isFlipped: true,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const { quizId, answers } = req.body;

    const result = tavusService.evaluateQuiz(quizId, answers);

    res.json({
      success: true,
      feedback: result.feedback,
      correctCount: result.correct,
      totalCount: result.total,
      results: result.results,
      newFlashCards: result.newFlashCards,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
