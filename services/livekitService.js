const axios = require('axios');

const TAVUS_BASE_URL = process.env.TAVUS_BASE_URL;
const TAVUS_API_KEY = process.env.TAVUS_API_KEY;

const headers = {
  Authorization: `Bearer ${TAVUS_API_KEY}`,
  'Content-Type': 'application/json',
};

exports.createConversation = async ({ personaId, conversationName }) => {
  const res = await axios.post(
    `${TAVUS_BASE_URL}/v2/conversations`,
    {
      persona_id: personaId,
      conversation_name: conversationName,
      realtime: true,
    },
    { headers }
  );

  return res.data;
};

exports.sendMessage = async (conversationId, message) => {
  const res = await axios.post(
    `${TAVUS_BASE_URL}/v2/conversations/${conversationId}/messages`,
    { text: message },
    { headers }
  );

  return res.data;
};

exports.endConversation = async (conversationId) => {
  await axios.post(
    `${TAVUS_BASE_URL}/v2/conversations/${conversationId}/end`,
    {},
    { headers }
  );
};

exports.evaluateQuiz = (quizId, answers) => {
  const total = Object.keys(answers).length;
  const correct = Math.floor(Math.random() * total);

  return {
    total,
    correct,
    feedback:
      correct === total
        ? 'Excellent! You nailed it 🎉'
        : 'Good effort! Review the flash cards to improve.',
    results: Object.keys(answers).map((qId) => ({
      questionId: qId,
      isCorrect: Math.random() > 0.5,
    })),
    newFlashCards: [
      {
        id: Date.now().toString(),
        question: 'What is Tavus?',
        answer: 'A real-time conversational video AI platform',
        isFlipped: false,
        fromQuiz: true,
      },
    ],
  };
};
