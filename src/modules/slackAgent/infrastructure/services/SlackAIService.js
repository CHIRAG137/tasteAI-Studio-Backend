'use strict';

const axios = require('axios');

class SlackAIService {
  constructor({ knowledgeRepository, slackApiClient, classificationClient }) {
    this.knowledgeRepository = knowledgeRepository;
    this.slackApiClient = slackApiClient;
    this.classificationClient = classificationClient;
  }

  /**
   * Apply pre-LLM capabilities that enhance the context/prompt before the agent replies.
   * Returns an object with { enhancedSystemPrompt, responseMeta } to inject into the LLM call.
   */
  async applyPreResponseCapabilities(agent, userMessage, _routingResult) {
    const caps = agent.slackAiCapabilities || {};
    if (!caps.enabled) {
      return { enhancedSystemPrompt: null, responseMeta: null };
    }

    const augmentations = [];
    const meta = {};

    // 1. Knowledge Retrieval (RAG) — inject relevant knowledge into the system prompt
    if (caps.knowledgeRetrieval) {
      try {
        const knowledgeDocs = await this.knowledgeRepository.search(userMessage);
        if (knowledgeDocs && knowledgeDocs.length > 0) {
          const knowledgeText = knowledgeDocs
            .slice(0, 5)
            .map(
              (k) =>
                `[${k.title || 'Untitled'}]: ${(k.content || k.description || '').substring(0, 1000)}`,
            )
            .join('\n\n');
          augmentations.push(
            `Relevant knowledge from the organization's knowledge base:\n${knowledgeText}\n\nUse this information when answering.`,
          );
          meta.knowledgeCount = knowledgeDocs.length;
        }
      } catch (err) {
        console.warn(`[SlackAI] Knowledge retrieval error: ${err.message}`);
      }
    }

    // 2. Sentiment Analysis — detect sentiment of the incoming message
    if (caps.sentimentAnalysis) {
      try {
        const sentiment = await this._callLLM(
          agent,
          [
            {
              role: 'system',
              content:
                'Analyze the sentiment of the following message. Respond with exactly one word: positive, negative, neutral, or urgent. Then a comma, then a confidence score between 0 and 1.',
            },
            { role: 'user', content: userMessage },
          ],
          { maxTokens: 20, temperature: 0 },
        );
        const parts = (sentiment || 'neutral,0.5').split(',');
        meta.sentiment = {
          label: (parts[0] || 'neutral').trim().toLowerCase(),
          score: parseFloat(parts[1] || '0.5'),
        };
        if (meta.sentiment.label === 'urgent' || meta.sentiment.label === 'negative') {
          augmentations.push(
            `Note: The user's message has a ${meta.sentiment.label} sentiment (confidence: ${meta.sentiment.score}). Prioritize clarity and empathy in your response.`,
          );
        }
      } catch (err) {
        console.warn(`[SlackAI] Sentiment analysis error: ${err.message}`);
      }
    }

    if (augmentations.length === 0) {
      return { enhancedSystemPrompt: null, responseMeta: meta };
    }

    return {
      enhancedSystemPrompt: augmentations.join('\n\n'),
      responseMeta: meta,
    };
  }

  /**
   * Apply post-response capabilities after the agent's reply has been sent.
   * These run asynchronously and do not block the reply.
   */
  async applyPostResponseCapabilities(agent, userMessage, replyText, routingResult, botToken) {
    const caps = agent.slackAiCapabilities || {};
    if (!caps.enabled) {
      return;
    }

    const promises = [];

    // 3. Auto Tagging — categorize the message after reply
    if (caps.autoTagging) {
      const asEphemeral = caps.postTagsAsEphemeral !== false;
      promises.push(
        this._autoTagMessage(agent, userMessage, replyText, routingResult, botToken, asEphemeral),
      );
    }

    // 4. Thread Summary — summarize the thread for the user
    if (caps.threadSummary && routingResult.ts) {
      promises.push(
        this._summarizeThread(botToken, routingResult.channelId, routingResult.ts, agent),
      );
    }

    // 5. Smart Reply / Message Suggestion — post ephemeral suggestions
    if (caps.smartReply || caps.messageSuggestion) {
      promises.push(this._suggestReplies(botToken, routingResult, agent, userMessage, replyText));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Channel Summary is a scheduled/on-demand feature, not real-time.
   * This method can be called from a cron job or API endpoint.
   */
  async generateChannelSummary(agent, workspaceId, channelSlackId, botToken, sinceTs) {
    const caps = agent.slackAiCapabilities || {};
    if (!caps.enabled || !caps.channelSummary) {
      return null;
    }

    try {
      const timeRangeHours = caps.channelSummaryConfig?.timeRangeHours || 24;
      const history = await this.slackApiClient.getConversationHistory(
        botToken,
        channelSlackId,
        null,
      );
      const oldestTs = sinceTs || (Date.now() / 1000 - timeRangeHours * 3600).toString();
      const messages = (history.messages || [])
        .filter((m) => !m.bot_id && m.subtype !== 'bot_message' && (!oldestTs || m.ts >= oldestTs))
        .slice(0, 100);

      if (messages.length === 0) {
        return null;
      }

      const conversationText = messages.map((m) => `${m.user || 'unknown'}: ${m.text}`).join('\n');

      const summary = await this._callLLM(
        agent,
        [
          {
            role: 'system',
            content:
              'Summarize the following Slack channel conversation. Highlight key topics, discussions, decisions, and action items. Keep it concise (3-5 bullet points). Use emoji markers for each point.',
          },
          { role: 'user', content: conversationText },
        ],
        { maxTokens: 512, temperature: 0.3 },
      );

      if (summary && caps.channelSummaryConfig?.autoPostToChannel !== false) {
        await this.slackApiClient.postMessage(botToken, channelSlackId, {
          text: `*📊 Channel Summary (last ${timeRangeHours}h)*\n${summary}`,
        });
      }

      return summary;
    } catch (err) {
      console.warn(`[SlackAI] Channel summary error: ${err.message}`);
      return null;
    }
  }

  // ── Private Helpers ──────────────────────────────────────────

  async _autoTagMessage(
    agent,
    userMessage,
    replyText,
    routingResult,
    botToken,
    postAsEphemeral = true,
  ) {
    try {
      const tagResult = await this._callLLM(
        agent,
        [
          {
            role: 'system',
            content:
              'You are a message classifier. Given a Slack message, assign up to 3 relevant tags from this list: [question, bug, feature-request, support, feedback, announcement, urgent, documentation, onboarding, general]. Respond with ONLY a comma-separated list of tags. If none match, respond with "general".',
          },
          { role: 'user', content: userMessage },
        ],
        { maxTokens: 50, temperature: 0 },
      );

      const tags = (tagResult || 'general')
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      console.warn(
        `[SlackAI] Auto-tagged message in #${routingResult.channelId}: ${tags.join(', ')}`,
      );

      if (tags.length > 0 && botToken && routingResult.userId) {
        if (postAsEphemeral) {
          await this.slackApiClient
            .postEphemeral(botToken, routingResult.channelId, routingResult.userId, {
              text: `_Tags: ${tags.join(', ')}_`,
            })
            .catch(() => {});
        } else {
          await this.slackApiClient
            .postMessage(botToken, routingResult.channelId, {
              text: `_Tags: ${tags.join(', ')}_`,
              thread_ts: routingResult.ts,
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.warn(`[SlackAI] Auto-tagging error: ${err.message}`);
    }
  }

  async _summarizeThread(botToken, channelId, threadTs, agent) {
    try {
      const replies = await this.slackApiClient.getThreadReplies(botToken, channelId, threadTs);
      const messages = (replies.messages || []).filter((m) => !m.bot_id).slice(0, 30);

      if (messages.length <= 1) {
        return;
      }

      const threadText = messages.map((m) => `${m.user || 'unknown'}: ${m.text}`).join('\n');

      const summary = await this._callLLM(
        agent,
        [
          {
            role: 'system',
            content:
              'Summarize the following Slack thread conversation. List the key points discussed and any conclusions reached. Keep it to 2-4 bullet points.',
          },
          { role: 'user', content: threadText },
        ],
        { maxTokens: 256, temperature: 0.3 },
      );

      if (summary) {
        await this.slackApiClient.postMessage(botToken, channelId, {
          text: `*Thread Summary:*\n${summary}`,
          thread_ts: threadTs,
        });
      }
    } catch (err) {
      console.warn(`[SlackAI] Thread summary error: ${err.message}`);
    }
  }

  async _suggestReplies(botToken, routingResult, agent, userMessage, replyText) {
    try {
      const suggestions = await this._callLLM(
        agent,
        [
          {
            role: 'system',
            content:
              'You suggest 2-3 short, actionable follow-up replies based on the conversation. Respond with ONLY a JSON array of strings, each string being a suggested reply. Example: ["Sure, let me check that.", "Can you share more details?", "I\'ll look into it right away."]',
          },
          {
            role: 'user',
            content: `Message: ${userMessage}\n\nMy reply: ${replyText}\n\nSuggest 2-3 follow-up replies the user might want to send.`,
          },
        ],
        { maxTokens: 200, temperature: 0.5 },
      );

      let parsed;
      try {
        parsed = JSON.parse(suggestions);
      } catch {
        parsed = (suggestions || '')
          .split('\n')
          .map((l) => l.replace(/^["\s-]*/, '').replace(/["\s,]*$/, ''))
          .filter((l) => l.length > 5)
          .slice(0, 3);
      }

      if (Array.isArray(parsed) && parsed.length > 0 && routingResult.userId) {
        const suggestionText = parsed
          .slice(0, 3)
          .map((s, i) => `${i + 1}. ${s}`)
          .join('\n');
        await this.slackApiClient
          .postEphemeral(botToken, routingResult.channelId, routingResult.userId, {
            text: `*Suggested replies:*\n${suggestionText}`,
          })
          .catch(() => {});
      }
    } catch (err) {
      console.warn(`[SlackAI] Suggestion error: ${err.message}`);
    }
  }

  async _callLLM(agent, messages, overrides = {}) {
    const provider = agent.llmConfig?.provider || 'openai';
    const model = agent.llmConfig?.model || 'gpt-4';
    const apiKeySource = agent.llmConfig?.apiKeySource;

    if (provider === 'openai') {
      const apiKey = apiKeySource === 'env' ? process.env.OPENAI_API_KEY : process.env.LLM_API_KEY;
      if (!apiKey) {
        return null;
      }

      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model,
            messages,
            temperature: overrides.temperature ?? 0.7,
            max_tokens: overrides.maxTokens ?? 256,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        );
        return response.data.choices?.[0]?.message?.content?.trim() || null;
      } catch (err) {
        console.warn(`[SlackAI] LLM call error: ${err.message}`);
        return null;
      }
    }

    if (provider === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.LLM_API_KEY;
      if (!apiKey) {
        return null;
      }

      try {
        const systemMsgs = messages.filter((m) => m.role === 'system');
        const userMsgs = messages.filter((m) => m.role !== 'system');
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: model || 'claude-3-haiku-20240307',
            max_tokens: overrides.maxTokens ?? 256,
            system: systemMsgs.map((m) => m.content).join('\n'),
            messages: userMsgs.length > 0 ? userMsgs : [{ role: 'user', content: 'Continue.' }],
          },
          {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        );
        return response.data.content?.[0]?.text?.trim() || null;
      } catch (err) {
        console.warn(`[SlackAI] Anthropic LLM call error: ${err.message}`);
        return null;
      }
    }

    return null;
  }
}

module.exports = SlackAIService;
