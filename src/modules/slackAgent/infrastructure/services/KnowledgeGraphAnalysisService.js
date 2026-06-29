'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const { runPhoenixSpan, setPhoenixSpanAttributes } = require('../../../../../config/phoenixTracing');

const ANALYSIS_PROMPT = `You are a semantic knowledge graph analyzer for Slack messages.
Analyze the given Slack message and extract comprehensive semantic information.

Return ONLY valid JSON with this exact structure:
{
  "messageAnalysis": {
    "summary": "concise 1-2 sentence summary",
    "cleanedText": "text without mentions/URLs cleaned",
    "language": "en",
    "sentiment": "positive|negative|neutral|mixed",
    "emotion": "frustrated|happy|urgent|curious|neutral|concerned|excited|sarcastic|thoughtful",
    "intent": "question|proposal|decision|bug_report|incident|announcement|meeting_notes|task_assignment|status_update|general_discussion|approval|rejection|request|clarification",
    "urgency": 0.0,
    "importance": 0.0,
    "confidence": 0.0,
    "isQuestion": false,
    "isDecision": false,
    "isTask": false,
    "isBug": false,
    "isIncident": false,
    "hasDeadline": false,
    "isMeetingNotes": false,
    "isAnnouncement": false,
    "isProposal": false,
    "isCodeDiscussion": false,
    "keywords": ["keyword1", "keyword2"],
    "topics": ["topic1", "topic2"]
  },
  "entities": [
    {
      "type": "person|team|technology|programming_language|framework|library|api|database|repository|service|microservice|endpoint|project|product|feature|company|topic|concept|documentation|decision|proposal|question|task|action_item|issue|bug|incident|pull_request|deployment|release|version|sprint|milestone|date|deadline|meeting|architecture|design_pattern|role|department|class|function|file",
      "canonicalName": "standardized name",
      "aliases": ["alias1", "alias2"],
      "description": "brief description",
      "confidence": 0.0,
      "importance": 0.0
    }
  ],
  "relationships": [
    {
      "sourceEntity": "entity name from entities list",
      "targetEntity": "entity name from entities list",
      "relationshipType": "SENT_BY|POSTED_IN|PART_OF_THREAD|REPLIES_TO|MENTIONS|ABOUT|REFERENCES|USES|IMPLEMENTS|DEPENDS_ON|CALLS|IMPORTS|DEFINES|EXPLAINS|RELATES_TO|CONFLICTS_WITH|PROPOSES|APPROVES|REJECTS|SUPPORTS|OPPOSES|SUPERSEDES|CREATES_TASK|ASSIGNED_TO|BLOCKS|COMPLETED_BY|REQUESTS|CAUSES|FIXES|AFFECTS|MITIGATES|HAS_DEADLINE|STARTS_ON|ENDS_ON|HAPPENED_AT|MENTIONED_IN",
      "reason": "why this relationship exists",
      "confidence": 0.0,
      "weight": 1.0
    }
  ],
  "taskExtraction": {
    "hasTask": false,
    "tasks": [
      {
        "description": "task description",
        "owner": "person name or null",
        "deadline": "date string or null",
        "dependencies": ["dependency1"],
        "priority": "high|medium|low",
        "status": "assigned|in_progress|completed|blocked"
      }
    ]
  },
  "decisionExtraction": {
    "hasDecision": false,
    "decision": "what was decided",
    "supportingReason": "why",
    "rejectedAlternatives": ["alternative1"],
    "affectedSystems": ["system1"],
    "impact": "high|medium|low"
  },
  "questionExtraction": {
    "hasQuestion": false,
    "question": "the question asked",
    "expectedResponder": "person or null",
    "topic": "topic",
    "urgency": "high|medium|low"
  },
  "riskExtraction": {
    "risks": ["risk1"],
    "blockers": ["blocker1"],
    "assumptions": ["assumption1"],
    "constraints": ["constraint1"],
    "severity": "high|medium|low"
  },
  "knowledgeExtraction": {
    "knowledgeCreated": ["new knowledge1"],
    "knowledgeUpdated": ["updated knowledge1"],
    "knowledgeContradicted": ["contradicted1"],
    "knowledgeRemoved": ["removed1"]
  },
  "searchMetadata": {
    "retrievalKeywords": ["keyword1"],
    "semanticKeywords": ["keyword1"],
    "graphTags": ["tag1"],
    "searchQueries": ["query1"],
    "embeddingText": "optimized text for embedding"
  }
}`;

class KnowledgeGraphAnalysisService {
  constructor() {
    this.genAI = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null;
    this.geminiModel = this.genAI
      ? this.genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' })
      : null;
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
  }

  async analyzeMessage(messageText, channelName, senderId) {
    if (!messageText || !messageText.trim()) {
      return this._defaultAnalysis(messageText);
    }

    // Try Gemini first, fall back to OpenAI
    if (this.geminiModel) {
      try {
        return await this._analyzeWithGemini(messageText, channelName, senderId);
      } catch (err) {
        console.warn(`[KnowledgeGraphAnalysis] Gemini failed, trying OpenAI: ${err.message}`);
      }
    }

    if (this.openai) {
      try {
        return await this._analyzeWithOpenAI(messageText, channelName, senderId);
      } catch (err) {
        console.warn(`[KnowledgeGraphAnalysis] OpenAI also failed: ${err.message}`);
      }
    }

    return this._defaultAnalysis(messageText);
  }

  async _analyzeWithGemini(messageText, channelName, senderId) {
    return runPhoenixSpan(
      'llm.gemini.knowledge_graph_analysis',
      'LLM',
      {
        'llm.provider': 'gemini',
        'llm.model_name': 'gemini-3.1-pro-preview',
        'llm.operation': 'knowledge_graph_analysis',
        'input.value': messageText,
        'input.mime_type': 'text/plain',
      },
      async (span) => {
        const prompt = `${ANALYSIS_PROMPT}\n\nMessage: "${messageText}"\nChannel: ${channelName || 'unknown'}\nSender: ${senderId || 'unknown'}\n\nReturn ONLY valid JSON.`;
        const result = await this.geminiModel.generateContent(prompt);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.warn('[KnowledgeGraphAnalysis] No JSON found in response');
          return this._defaultAnalysis(messageText);
        }

        const analysis = JSON.parse(jsonMatch[0]);

        setPhoenixSpanAttributes(span, {
          'output.value': JSON.stringify(analysis),
          'output.mime_type': 'application/json',
        });

        return analysis;
      },
    );
  }

  async _analyzeWithOpenAI(messageText, channelName, senderId) {
    return runPhoenixSpan(
      'llm.openai.knowledge_graph_analysis',
      'LLM',
      {
        'llm.provider': 'openai',
        'llm.model_name': 'gpt-4o-mini',
        'llm.operation': 'knowledge_graph_analysis',
        'input.value': messageText,
        'input.mime_type': 'text/plain',
      },
      async (span) => {
        const prompt = `${ANALYSIS_PROMPT}\n\nMessage: "${messageText}"\nChannel: ${channelName || 'unknown'}\nSender: ${senderId || 'unknown'}\n\nReturn ONLY valid JSON.`;
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 4000,
        });

        const responseText = completion.choices[0]?.message?.content || '';

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.warn('[KnowledgeGraphAnalysis] No JSON found in OpenAI response');
          return this._defaultAnalysis(messageText);
        }

        const analysis = JSON.parse(jsonMatch[0]);

        setPhoenixSpanAttributes(span, {
          'output.value': JSON.stringify(analysis),
          'output.mime_type': 'application/json',
        });

        return analysis;
      },
    );
  }

  _defaultAnalysis(messageText) {
    return {
      messageAnalysis: {
        summary: '',
        cleanedText: messageText || '',
        language: 'en',
        sentiment: 'neutral',
        emotion: 'neutral',
        intent: 'general_discussion',
        urgency: 0,
        importance: 0,
        confidence: 0,
        isQuestion: false,
        isDecision: false,
        isTask: false,
        isBug: false,
        isIncident: false,
        hasDeadline: false,
        isMeetingNotes: false,
        isAnnouncement: false,
        isProposal: false,
        isCodeDiscussion: false,
        keywords: [],
        topics: [],
      },
      entities: [],
      relationships: [],
      taskExtraction: { hasTask: false, tasks: [] },
      decisionExtraction: { hasDecision: false, decision: '', supportingReason: '', rejectedAlternatives: [], affectedSystems: [], impact: 'low' },
      questionExtraction: { hasQuestion: false, question: '', expectedResponder: null, topic: '', urgency: 'low' },
      riskExtraction: { risks: [], blockers: [], assumptions: [], constraints: [], severity: 'low' },
      knowledgeExtraction: { knowledgeCreated: [], knowledgeUpdated: [], knowledgeContradicted: [], knowledgeRemoved: [] },
      searchMetadata: { retrievalKeywords: [], semanticKeywords: [], graphTags: [], searchQueries: [], embeddingText: messageText || '' },
    };
  }
}

module.exports = KnowledgeGraphAnalysisService;
