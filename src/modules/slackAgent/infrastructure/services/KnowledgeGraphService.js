'use strict';

const KnowledgeGraphAnalysisService = require('./KnowledgeGraphAnalysisService');

class KnowledgeGraphService {
  constructor({ knowledgeNodeRepository, knowledgeEdgeRepository, classificationClient }) {
    this.nodeRepository = knowledgeNodeRepository;
    this.edgeRepository = knowledgeEdgeRepository;
    this.llmClient = classificationClient;
    this.analysisService = new KnowledgeGraphAnalysisService();
  }

  // ──────────────────────────────────────────────
  //  Message Processing (AI-Powered)
  // ──────────────────────────────────────────────

  async processMessage(eventData) {
    const { organizationId, workspaceId, workspaceMongoId, channelMongoId } = eventData;
    const slackEvent = eventData.slackEvent;
    const eventTs = slackEvent.event_ts || slackEvent.ts;
    const channelId = slackEvent.channel;
    const userId = slackEvent.user;
    const text = slackEvent.text || '';
    const threadTs = slackEvent.thread_ts || null;

    if (!userId) return null;

    // 1. Upsert user node
    const userNode = await this._upsertUserNode(organizationId, workspaceMongoId, userId);

    // 2. Upsert channel node
    const channelNode = await this._upsertChannelNode(
      organizationId,
      workspaceMongoId,
      channelId,
      slackEvent.channel_name || channelId,
    );

    // 3. Analyze message with Gemini AI
    const analysis = await this.analysisService.analyzeMessage(text, slackEvent.channel_name, userId);

    // 4. Upsert message node with rich AI metadata
    const messageExternalId = `${channelId}_${eventTs}`;
    const messageNode = await this._upsertRichMessageNode(
      organizationId,
      workspaceMongoId,
      messageExternalId,
      {
        text,
        channelSlackId: channelId,
        userSlackId: userId,
        threadTs,
        timestamp: new Date(parseFloat(eventTs) * 1000),
        channelName: slackEvent.channel_name || '',
        messageType: slackEvent.channel_type === 'im' ? 'direct_message' : 'regular',
        attachments: slackEvent.attachments || [],
        reactionCount: slackEvent.reactions?.length || 0,
        isEdited: !!slackEvent.edited,
        editedTs: slackEvent.edited?.ts || null,
        analysis,
      },
    );

    // 5. Create edges for detected entities
    await this._processEntityEdges(
      organizationId,
      workspaceMongoId,
      messageExternalId,
      userId,
      channelId,
      messageNode,
      analysis,
      threadTs,
      eventTs,
    );

    // 6. Detect mentions (@user references - still do regex for reliability)
    const mentionedUserIds = this._extractMentions(text);
    if (mentionedUserIds.length > 0) {
      for (const mentionedId of mentionedUserIds) {
        await this._ensureUserNodeExists(organizationId, workspaceMongoId, mentionedId);
        await this._createEdge(
          organizationId,
          workspaceMongoId,
          messageExternalId,
          mentionedId,
          'mentions',
          {
            label: `Message mentions <@${mentionedId}>`,
            metadata: [{ key: 'mentionedUserId', value: mentionedId }],
            weight: 2.0,
            confidence: 1.0,
            reason: 'Explicit @mention in message text',
            timestamp: messageNode.timestamp,
          },
        );
      }
    }

    // 7. Thread reply relationship
    if (threadTs && threadTs !== eventTs) {
      const parentExternalId = `${channelId}_${threadTs}`;
      await this._createEdge(
        organizationId,
        workspaceMongoId,
        messageExternalId,
        parentExternalId,
        'REPLIES_TO',
        {
          label: 'Reply to thread parent',
          metadata: [
            { key: 'threadTs', value: threadTs },
            { key: 'channelSlackId', value: channelId },
          ],
          weight: 1.0,
          confidence: 1.0,
          reason: 'Message is a reply in a thread',
          timestamp: messageNode.timestamp,
        },
      );
    }

    // 8. Update message node with mentions
    if (mentionedUserIds.length > 0 && messageNode.mentionUserIds?.length === 0) {
      await this.nodeRepository.upsertByExternalId(
        organizationId,
        workspaceMongoId,
        messageExternalId,
        'message',
        { mentionUserIds: mentionedUserIds },
      );
    }

    return { userNode, messageNode, channelNode, mentionedUserIds, entities: analysis.entities, relationships: analysis.relationships };
  }

  async _processEntityEdges(orgId, wsId, msgExternalId, userId, channelId, messageNode, analysis, threadTs, eventTs) {
    // Create edges from message to detected entities
    for (const entity of analysis.entities || []) {
      const entityExternalId = this._generateEntityExternalId(entity);
      const entityNode = await this._upsertEntityNode(orgId, wsId, entityExternalId, entity, msgExternalId);

      // Create ABOUT edge from message to entity
      await this._createEdge(
        orgId,
        wsId,
        msgExternalId,
        entityExternalId,
        'ABOUT',
        {
          label: `Message about ${entity.canonicalName}`,
          weight: entity.importance || 0.5,
          confidence: entity.confidence || 0.7,
          reason: `AI detected entity type=${entity.type}`,
          metadata: [
            { key: 'entityType', value: entity.type },
            { key: 'entityConfidence', value: entity.confidence || 0 },
          ],
          timestamp: messageNode.timestamp,
        },
      );
    }

    // Create edges for detected relationships
    for (const rel of analysis.relationships || []) {
      const sourceExtId = this._resolveRelationshipEntityId(rel.sourceEntity, analysis.entities, msgExternalId, userId, channelId);
      const targetExtId = this._resolveRelationshipEntityId(rel.targetEntity, analysis.entities, msgExternalId, userId, channelId);

      if (sourceExtId && targetExtId && sourceExtId !== targetExtId) {
        await this._createEdge(
          orgId,
          wsId,
          sourceExtId,
          targetExtId,
          rel.relationshipType,
          {
            label: `${rel.sourceEntity} ${rel.relationshipType} ${rel.targetEntity}`,
            weight: rel.weight || 1.0,
            confidence: rel.confidence || 0.7,
            reason: rel.reason || 'AI detected relationship',
            metadata: [
              { key: 'sourceMessage', value: msgExternalId },
            ],
            timestamp: messageNode.timestamp,
          },
        );
      }
    }
  }

  _generateEntityExternalId(entity) {
    const name = (entity.canonicalName || entity.name || '').toLowerCase().replace(/\s+/g, '_');
    return `entity_${entity.type}_${name}`;
  }

  _resolveRelationshipEntityId(name, entities, msgExternalId, userId, channelId) {
    if (!name) return null;

    const normalizedName = name.toLowerCase().trim();

    // Check if it matches a detected entity
    for (const entity of entities || []) {
      const entityName = (entity.canonicalName || '').toLowerCase().trim();
      const aliases = (entity.aliases || []).map(a => a.toLowerCase().trim());
      if (entityName === normalizedName || aliases.includes(normalizedName)) {
        return this._generateEntityExternalId(entity);
      }
    }

    return null;
  }

  async processMessagesBulk(eventDataList) {
    const results = [];
    for (const eventData of eventDataList) {
      try {
        const result = await this.processMessage(eventData);
        if (result) results.push(result);
      } catch (err) {
        console.warn(`[KnowledgeGraph] Bulk processing error: ${err.message}`);
      }
    }
    return results;
  }

  // ──────────────────────────────────────────────
  //  Search
  // ──────────────────────────────────────────────

  async searchText(organizationId, workspaceId, query) {
    return this.nodeRepository.searchText(organizationId, workspaceId, query);
  }

  async searchByEntityType(organizationId, workspaceId, nodeType) {
    return this.nodeRepository.findByNodeType(organizationId, workspaceId, nodeType);
  }

  async searchByIntent(organizationId, workspaceId, intent) {
    return this.nodeRepository.findByIntent(organizationId, workspaceId, intent);
  }

  async findMessagesMentioningUser(organizationId, workspaceId, userSlackId) {
    return this.nodeRepository.findNodesByMentions(organizationId, workspaceId, [userSlackId]);
  }

  async findMessagesBetweenUsers(organizationId, workspaceId, userSlackIdA, userSlackIdB) {
    const messagesAtoB = await this.nodeRepository.findMessagesBetweenUsers(
      organizationId, workspaceId, userSlackIdA, userSlackIdB,
    );
    const messagesBtoA = await this.nodeRepository.findMessagesBetweenUsers(
      organizationId, workspaceId, userSlackIdB, userSlackIdA,
    );
    return [...messagesAtoB, ...messagesBtoA].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );
  }

  async getSubgraph(nodeId, depth = 2) {
    return this.nodeRepository.findConnected(nodeId, [
      'sent', 'SENT_BY', 'mentions', 'MENTIONS', 'replies_to', 'REPLIES_TO',
      'in_channel', 'POSTED_IN', 'references', 'ABOUT', 'USES', 'DEPENDS_ON',
      'MENTIONED_IN', 'REFERENCES', 'PART_OF_THREAD',
    ], depth);
  }

  async findPathBetweenUsers(organizationId, workspaceId, userSlackIdA, userSlackIdB) {
    const userANode = await this.nodeRepository.findByExternalId(
      organizationId, workspaceId, userSlackIdA, 'user',
    );
    const userBNode = await this.nodeRepository.findByExternalId(
      organizationId, workspaceId, userSlackIdB, 'user',
    );

    if (!userANode || !userBNode) return null;

    return this.edgeRepository.findPath(userANode._id, userBNode._id, 4);
  }

  async searchWithLLM(organizationId, workspaceId, question) {
    const searchPlan = await this._planSearch(question);
    const searchResults = await this._executeSearchPlan(organizationId, workspaceId, searchPlan);
    return this._synthesizeAnswer(question, searchResults);
  }

  // ──────────────────────────────────────────────
  //  Graph Stats
  // ──────────────────────────────────────────────

  async getGraphStats(organizationId, workspaceId) {
    const nodeCount = await this.nodeRepository.count({ organizationId, workspaceId });
    const edgeCount = await this.edgeRepository.count({ organizationId, workspaceId });
    const userCount = await this.nodeRepository.count({ organizationId, workspaceId, nodeType: 'user' });
    const messageCount = await this.nodeRepository.count({ organizationId, workspaceId, nodeType: 'message' });
    const entityCount = await this.nodeRepository.count({
      organizationId,
      workspaceId,
      nodeType: { $nin: ['user', 'message', 'channel'] },
    });
    const decisionCount = await this.nodeRepository.count({ organizationId, workspaceId, isDecision: true });
    const taskCount = await this.nodeRepository.count({ organizationId, workspaceId, isTask: true });
    const questionCount = await this.nodeRepository.count({ organizationId, workspaceId, isQuestion: true });

    return { nodeCount, edgeCount, userCount, messageCount, entityCount, decisionCount, taskCount, questionCount };
  }

  // ──────────────────────────────────────────────
  //  Entity Graph Query
  // ──────────────────────────────────────────────

  async getEntityGraph(organizationId, workspaceId, entityType, limit = 50) {
    const nodes = await this.nodeRepository.findByNodeType(organizationId, workspaceId, entityType, limit);
    const nodeIds = nodes.map(n => n._id);

    const edges = await this.edgeRepository.findByNodeIds(organizationId, workspaceId, nodeIds);

    return { nodes, edges };
  }

  // ──────────────────────────────────────────────
  //  Private helpers
  // ──────────────────────────────────────────────

  async _upsertUserNode(organizationId, workspaceMongoId, slackUserId) {
    return this.nodeRepository.upsertByExternalId(
      organizationId, workspaceMongoId, slackUserId, 'user',
      {
        label: slackUserId,
        canonicalName: slackUserId,
        externalId: slackUserId,
        properties: { slackUserId },
        nodeType: 'user',
      },
    );
  }

  async _ensureUserNodeExists(organizationId, workspaceMongoId, slackUserId) {
    const existing = await this.nodeRepository.findByExternalId(
      organizationId, workspaceMongoId, slackUserId, 'user',
    );
    if (!existing) {
      await this._upsertUserNode(organizationId, workspaceMongoId, slackUserId);
    }
  }

  async _upsertChannelNode(organizationId, workspaceMongoId, slackChannelId, channelName) {
    return this.nodeRepository.upsertByExternalId(
      organizationId, workspaceMongoId, slackChannelId, 'channel',
      {
        label: channelName || slackChannelId,
        canonicalName: channelName || slackChannelId,
        externalId: slackChannelId,
        properties: { slackChannelId, channelName: channelName || '' },
        nodeType: 'channel',
      },
    );
  }

  async _upsertEntityNode(orgId, wsId, externalId, entity, sourceMessageId) {
    const nodeData = {
      label: entity.canonicalName || entity.name || externalId,
      canonicalName: entity.canonicalName || entity.name || '',
      aliases: entity.aliases || [],
      description: entity.description || '',
      externalId,
      nodeType: entity.type,
      sourceMessageId,
      importanceScore: entity.importance || 0.5,
      confidenceScore: entity.confidence || 0.7,
      properties: {
        entityType: entity.type,
        confidence: entity.confidence || 0,
        importance: entity.importance || 0,
      },
      metadata: [
        { key: 'entityType', value: entity.type },
        { key: 'sourceMessage', value: sourceMessageId },
      ],
    };

    return this.nodeRepository.upsertByExternalId(orgId, wsId, externalId, entity.type, nodeData);
  }

  async _upsertRichMessageNode(organizationId, workspaceMongoId, externalId, data) {
    const ma = data.analysis?.messageAnalysis || {};
    const te = data.analysis?.taskExtraction || {};
    const de = data.analysis?.decisionExtraction || {};
    const qe = data.analysis?.questionExtraction || {};
    const re = data.analysis?.riskExtraction || {};
    const ke = data.analysis?.knowledgeExtraction || {};
    const sm = data.analysis?.searchMetadata || {};

    const nodeData = {
      label: (data.text || '').substring(0, 120),
      text: data.text || '',
      cleanedText: ma.cleanedText || '',
      externalId,
      nodeType: 'message',
      channelSlackId: data.channelSlackId,
      userSlackId: data.userSlackId,
      threadTs: data.threadTs,
      timestamp: data.timestamp,
      mentionUserIds: [],
      language: ma.language || 'en',
      sentiment: ma.sentiment || '',
      emotion: ma.emotion || '',
      intent: ma.intent || '',
      urgency: ma.urgency || 0,
      importanceScore: ma.importance || 0,
      confidenceScore: ma.confidence || 0,
      summary: ma.summary || '',
      keywords: ma.keywords || [],
      topics: ma.topics || [],
      isQuestion: ma.isQuestion || false,
      isDecision: ma.isDecision || false,
      isTask: ma.isTask || false,
      isBug: ma.isBug || false,
      isIncident: ma.isIncident || false,
      hasDeadline: ma.hasDeadline || false,
      isMeetingNotes: ma.isMeetingNotes || false,
      isAnnouncement: ma.isAnnouncement || false,
      isProposal: ma.isProposal || false,
      isCodeDiscussion: ma.isCodeDiscussion || false,
      taskDescription: te.tasks?.[0]?.description || '',
      taskOwner: te.tasks?.[0]?.owner || '',
      taskDeadline: te.tasks?.[0]?.deadline || '',
      taskPriority: te.tasks?.[0]?.priority || '',
      taskStatus: te.tasks?.[0]?.status || '',
      decisionMade: de.decision || '',
      decisionReason: de.supportingReason || '',
      rejectedAlternatives: de.rejectedAlternatives || [],
      affectedSystems: de.affectedSystems || [],
      impact: de.impact || '',
      questionText: qe.question || '',
      expectedResponder: qe.expectedResponder || '',
      questionTopic: qe.topic || '',
      questionUrgency: qe.urgency || '',
      risks: re.risks || [],
      blockers: re.blockers || [],
      assumptions: re.assumptions || [],
      constraints: re.constraints || [],
      riskSeverity: re.severity || '',
      knowledgeCreated: ke.knowledgeCreated || [],
      knowledgeUpdated: ke.knowledgeUpdated || [],
      knowledgeContradicted: ke.knowledgeContradicted || [],
      knowledgeRemoved: ke.knowledgeRemoved || [],
      retrievalKeywords: sm.retrievalKeywords || [],
      semanticKeywords: sm.semanticKeywords || [],
      graphTags: sm.graphTags || [],
      searchQueries: sm.searchQueries || [],
      embeddingText: sm.embeddingText || data.text || '',
      properties: {
        messageType: data.messageType,
        channelName: data.channelName,
        attachmentCount: data.attachments?.length || 0,
        reactionCount: data.reactionCount || 0,
        isEdited: data.isEdited || false,
        editedTs: data.editedTs || null,
        entitiesDetected: data.analysis?.entities?.length || 0,
      },
      metadata: [
        { key: 'channelSlackId', value: data.channelSlackId },
        { key: 'userSlackId', value: data.userSlackId },
        { key: 'messageType', value: data.messageType },
        { key: 'intent', value: ma.intent || '' },
        { key: 'sentiment', value: ma.sentiment || '' },
        { key: 'urgency', value: ma.urgency || 0 },
        { key: 'importance', value: ma.importance || 0 },
      ],
    };

    return this.nodeRepository.upsertByExternalId(
      organizationId, workspaceMongoId, externalId, 'message', nodeData,
    );
  }

  async _createEdge(organizationId, workspaceMongoId, sourceExternalId, targetExternalId, relationshipType, data) {
    return this.edgeRepository.upsert(
      sourceExternalId, targetExternalId, relationshipType,
      {
        organizationId,
        workspaceId: workspaceMongoId,
        sourceExternalId,
        targetExternalId,
        relationshipType,
        label: data.label || '',
        weight: data.weight || 1.0,
        confidence: data.confidence || 1.0,
        reason: data.reason || '',
        metadata: data.metadata || [],
        timestamp: data.timestamp || new Date(),
      },
    );
  }

  _extractMentions(text) {
    if (!text) return [];
    const mentionRegex = /<@([A-Z0-9]+)>/gi;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return [...new Set(mentions)];
  }

  // ──────────────────────────────────────────────
  //  LLM Search (backward compatible)
  // ──────────────────────────────────────────────

  async _planSearch(question) {
    try {
      const planPrompt = `You are a graph search planner for a semantic Slack knowledge graph.
Given a user's question about Slack conversations, determine what to search for.

The knowledge graph has:
- user nodes (slack user IDs, names)
- message nodes (text content, channel, timestamp, mentions, intent, sentiment)
- entity nodes (people, technologies, projects, tasks, decisions, etc.)
- channel nodes (name)
- edges: SENT_BY, POSTED_IN, MENTIONS, REPLIES_TO, ABOUT, USES, DEPENDS_ON, etc.

Return a JSON object with:
{
  "searchType": "text" | "mentions" | "between_users" | "user_messages" | "entity" | "intent" | "all",
  "searchTerms": ["term1", "term2"],
  "mentionedUserId": "slack_id_or_null",
  "userIds": ["user_a", "user_b"],
  "entityType": "entity_type_or_null",
  "intent": "intent_or_null",
  "explanation": "brief reasoning"
}

Question: "${question}"

Return ONLY valid JSON.`;

      const planResponse = await this._callLLM(planPrompt);
      if (!planResponse) {
        return { searchType: 'text', searchTerms: [question], mentionedUserId: null, userIds: [], entityType: null, intent: null };
      }
      return JSON.parse(planResponse);
    } catch (err) {
      console.warn(`[KnowledgeGraph] Search planning error: ${err.message}`);
      return { searchType: 'text', searchTerms: [question], mentionedUserId: null, userIds: [], entityType: null, intent: null };
    }
  }

  async _executeSearchPlan(organizationId, workspaceId, plan) {
    const results = { messages: [], users: [], entities: [], channels: [] };

    try {
      if (plan.searchType === 'text' || plan.searchType === 'all') {
        for (const term of plan.searchTerms || []) {
          const textResults = await this.searchText(organizationId, workspaceId, term);
          results.messages.push(...textResults);
        }
      }

      if ((plan.searchType === 'mentions' || plan.searchType === 'all') && plan.mentionedUserId) {
        const mentionResults = await this.findMessagesMentioningUser(organizationId, workspaceId, plan.mentionedUserId);
        results.messages.push(...mentionResults);
      }

      if ((plan.searchType === 'between_users' || plan.searchType === 'all') && plan.userIds?.length >= 2) {
        const betweenResults = await this.findMessagesBetweenUsers(organizationId, workspaceId, plan.userIds[0], plan.userIds[1]);
        results.messages.push(...betweenResults);
      }

      if ((plan.searchType === 'user_messages' || plan.searchType === 'all') && plan.userIds?.length >= 1) {
        for (const uid of plan.userIds) {
          const userMsgs = await this.nodeRepository.findMessagesByUser(organizationId, workspaceId, uid);
          results.messages.push(...userMsgs);
        }
      }

      if ((plan.searchType === 'entity' || plan.searchType === 'all') && plan.entityType) {
        const entityNodes = await this.nodeRepository.findByNodeType(organizationId, workspaceId, plan.entityType);
        results.entities.push(...entityNodes);
      }

      if ((plan.searchType === 'intent' || plan.searchType === 'all') && plan.intent) {
        const intentNodes = await this.nodeRepository.findByIntent(organizationId, workspaceId, plan.intent);
        results.messages.push(...intentNodes);
      }
    } catch (err) {
      console.warn(`[KnowledgeGraph] Search execution error: ${err.message}`);
    }

    results.messages = results.messages.filter(
      (msg, idx, arr) => arr.findIndex((m) => m._id.toString() === msg._id.toString()) === idx,
    );
    results.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    results.messages = results.messages.slice(0, 30);

    return results;
  }

  async _synthesizeAnswer(question, searchResults) {
    if (searchResults.messages.length === 0 && searchResults.entities.length === 0) {
      return {
        answer: 'I could not find any relevant information in the knowledge graph.',
        confidence: 'low',
        sources: [],
      };
    }

    const messageContext = searchResults.messages
      .slice(0, 15)
      .map(
        (m, i) =>
          `[${i + 1}] From: <@${m.userSlackId || 'unknown'}> | Channel: ${m.channelSlackId || 'unknown'} | ` +
          `Time: ${m.timestamp ? new Date(m.timestamp).toLocaleString() : 'unknown'} | ` +
          `Intent: ${m.intent || 'unknown'} | Sentiment: ${m.sentiment || 'unknown'} | ` +
          `Mentions: ${(m.mentionUserIds || []).join(', ') || 'none'} | ` +
          `Summary: ${(m.summary || '').substring(0, 200)} | ` +
          `Text: "${(m.text || '').substring(0, 300)}"`,
      )
      .join('\n\n');

    const entityContext = searchResults.entities
      .slice(0, 10)
      .map(
        (e, i) =>
          `[Entity ${i + 1}] Type: ${e.nodeType} | Name: ${e.label || e.canonicalName || e.externalId} | ` +
          `Description: ${(e.description || '').substring(0, 200)}`,
      )
      .join('\n\n');

    try {
      const answerPrompt = `You are a semantic knowledge graph analyst. Given a question and relevant data from the knowledge graph, synthesize a clear answer.

Question: "${question}"

Relevant messages found in the knowledge graph:
${messageContext}

${entityContext ? `Relevant entities found:\n${entityContext}` : ''}

Provide:
1. A concise answer to the question
2. Key people involved
3. Channels where conversations happened
4. Relevant timestamps
5. Key entities mentioned

Format your response as JSON:
{
  "answer": "concise answer",
  "confidence": "high|medium|low",
  "people_involved": ["@user1", "@user2"],
  "channels": ["#channel1"],
  "entities": ["entity1", "entity2"],
  "timeframe": "description of when this happened",
  "sources": ["message preview 1", "message preview 2"]
}

Return ONLY valid JSON.`;

      const answerResponse = await this._callLLM(answerPrompt);
      if (!answerResponse) {
        return { answer: 'Could not synthesize answer.', confidence: 'low', sources: [] };
      }
      return JSON.parse(answerResponse);
    } catch (err) {
      console.warn(`[KnowledgeGraph] Answer synthesis error: ${err.message}`);
      return {
        answer: `Found ${searchResults.messages.length} relevant messages but could not synthesize.`,
        confidence: 'medium',
        sources: searchResults.messages.slice(0, 5).map((m) => (m.text || '').substring(0, 200)),
      };
    }
  }

  async _callLLM(prompt) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        console.warn(`[KnowledgeGraph] Gemini call error: ${err.message}`);
      }
    }

    // Fallback to OpenAI or classification client
    if (this.llmClient && this.llmClient._callModel) {
      try {
        return this.llmClient._callModel(prompt);
      } catch (err) {
        console.warn(`[KnowledgeGraph] LLM call error: ${err.message}`);
        return null;
      }
    }

    const axios = require('axios');
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return null;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2000,
        },
        {
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.warn(`[KnowledgeGraph] LLM call error: ${err.message}`);
      return null;
    }
  }
}

module.exports = KnowledgeGraphService;
