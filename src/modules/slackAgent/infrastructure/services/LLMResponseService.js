'use strict';

const axios = require('axios');

class LLMResponseService {
  async generateResponse(agent, userMessage) {
    const provider = agent.llmConfig?.provider || 'openai';
    const model = agent.llmConfig?.model || 'gpt-4';
    const temperature = agent.llmConfig?.temperature ?? 0.7;
    const maxTokens = agent.llmConfig?.maxTokens ?? 1024;
    const apiKeySource = agent.llmConfig?.apiKeySource;

    const systemPrompt = this._buildSystemPrompt(agent);

    if (provider === 'openai') {
      const apiKey = apiKeySource === 'env' ? process.env.OPENAI_API_KEY : process.env.LLM_API_KEY;

      if (!apiKey) {
        return this._fallbackResponse(agent, userMessage);
      }

      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            temperature,
            max_tokens: maxTokens,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        );

        return response.data.choices?.[0]?.message?.content?.trim() || this._fallbackResponse(agent, userMessage);
      } catch (err) {
        console.warn(`LLM API error: ${err.message}`);
        return this._fallbackResponse(agent, userMessage);
      }
    }

    // Anthropic provider
    if (provider === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.LLM_API_KEY;

      if (!apiKey) {
        return this._fallbackResponse(agent, userMessage);
      }

      try {
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: model || 'claude-3-haiku-20240307',
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
          },
          {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
          },
        );

        return response.data.content?.[0]?.text?.trim() || this._fallbackResponse(agent, userMessage);
      } catch (err) {
        console.warn(`Anthropic API error: ${err.message}`);
        return this._fallbackResponse(agent, userMessage);
      }
    }

    return this._fallbackResponse(agent, userMessage);
  }

  _buildSystemPrompt(agent) {
    const parts = [];

    if (agent.promptConfig?.systemPrompt) {
      parts.push(agent.promptConfig.systemPrompt);
    }

    const instructions = (agent.aiInstructions || [])
      .filter(i => i.isActive !== false)
      .sort((a, b) => {
        const order = { high: 0, normal: 1, low: 2 };
        return (order[a.priority] || 1) - (order[b.priority] || 1);
      })
      .map(i => i.content);

    if (instructions.length > 0) {
      parts.push('--- Instructions ---');
      parts.push(...instructions);
    }

    if (agent.promptConfig?.welcomeMessage) {
      parts.push(`\nYour welcome message is: "${agent.promptConfig.welcomeMessage}"`);
    }

    if (agent.promptConfig?.fallbackMessage) {
      parts.push(`\nIf you cannot answer, say: "${agent.promptConfig.fallbackMessage}"`);
    }

    return parts.join('\n\n') || 'You are a helpful Slack assistant.';
  }

  _fallbackResponse(agent, userMessage) {
    // Use welcome message or generate a simple greeting
    if (agent.promptConfig?.welcomeMessage) {
      return agent.promptConfig.welcomeMessage;
    }
    return `Hi! I'm ${agent.name}. I received your message but I'm having trouble processing it right now. Please try again later.`;
  }
}

module.exports = LLMResponseService;
