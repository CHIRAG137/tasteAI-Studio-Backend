'use strict';

const SlackWorkspaceModel = require('./infrastructure/persistence/models/SlackWorkspaceModel');
const SlackChannelModel = require('./infrastructure/persistence/models/SlackChannelModel');
const SlackUserModel = require('./infrastructure/persistence/models/SlackUserModel');
const AgentModel = require('./infrastructure/persistence/models/AgentModel');
const TicketModel = require('./infrastructure/persistence/models/TicketModel');
const ThreadModel = require('./infrastructure/persistence/models/ThreadModel');
const WorkflowModel = require('./infrastructure/persistence/models/WorkflowModel');
const SkillModel = require('./infrastructure/persistence/models/SkillModel');
const SLAModel = require('./infrastructure/persistence/models/SLAModel');
const EscalationModel = require('./infrastructure/persistence/models/EscalationModel');
const RoutingRuleModel = require('./infrastructure/persistence/models/RoutingRuleModel');
const ClassificationModel = require('./infrastructure/persistence/models/ClassificationModel');
const KnowledgeModel = require('./infrastructure/persistence/models/KnowledgeModel');
const EventModel = require('./infrastructure/persistence/models/EventModel');
const AuditLogModel = require('./infrastructure/persistence/models/AuditLogModel');
const NotificationModel = require('./infrastructure/persistence/models/NotificationModel');
const MCPConnectionModel = require('./infrastructure/persistence/models/MCPConnectionModel');
const WebhookModel = require('./infrastructure/persistence/models/WebhookModel');
const DepartmentModel = require('./infrastructure/persistence/models/DepartmentModel');
const TeamModel = require('./infrastructure/persistence/models/TeamModel');
const CategoryModel = require('./infrastructure/persistence/models/CategoryModel');
const TagModel = require('./infrastructure/persistence/models/TagModel');
const BusinessHoursModel = require('./infrastructure/persistence/models/BusinessHoursModel');
const HolidayModel = require('./infrastructure/persistence/models/HolidayModel');

const MongoWorkspaceRepository = require('./infrastructure/persistence/repositories/MongoWorkspaceRepository');
const MongoChannelRepository = require('./infrastructure/persistence/repositories/MongoChannelRepository');
const MongoSlackUserRepository = require('./infrastructure/persistence/repositories/MongoSlackUserRepository');
const MongoAgentRepository = require('./infrastructure/persistence/repositories/MongoAgentRepository');
const MongoTicketRepository = require('./infrastructure/persistence/repositories/MongoTicketRepository');
const MongoThreadRepository = require('./infrastructure/persistence/repositories/MongoThreadRepository');
const MongoWorkflowRepository = require('./infrastructure/persistence/repositories/MongoWorkflowRepository');
const MongoSkillRepository = require('./infrastructure/persistence/repositories/MongoSkillRepository');
const MongoSLARepository = require('./infrastructure/persistence/repositories/MongoSLARepository');
const MongoEscalationRepository = require('./infrastructure/persistence/repositories/MongoEscalationRepository');
const MongoRoutingRepository = require('./infrastructure/persistence/repositories/MongoRoutingRepository');
const MongoClassificationRepository = require('./infrastructure/persistence/repositories/MongoClassificationRepository');
const MongoKnowledgeRepository = require('./infrastructure/persistence/repositories/MongoKnowledgeRepository');
const MongoEventRepository = require('./infrastructure/persistence/repositories/MongoEventRepository');
const MongoAuditRepository = require('./infrastructure/persistence/repositories/MongoAuditRepository');
const MongoNotificationRepository = require('./infrastructure/persistence/repositories/MongoNotificationRepository');
const MongoMCPRepository = require('./infrastructure/persistence/repositories/MongoMCPRepository');
const MongoWebhookRepository = require('./infrastructure/persistence/repositories/MongoWebhookRepository');
const MongoDepartmentRepository = require('./infrastructure/persistence/repositories/MongoDepartmentRepository');
const MongoTeamRepository = require('./infrastructure/persistence/repositories/MongoTeamRepository');
const MongoCategoryRepository = require('./infrastructure/persistence/repositories/MongoCategoryRepository');
const MongoTagRepository = require('./infrastructure/persistence/repositories/MongoTagRepository');
const MongoBusinessHoursRepository = require('./infrastructure/persistence/repositories/MongoBusinessHoursRepository');
const MongoHolidayRepository = require('./infrastructure/persistence/repositories/MongoHolidayRepository');

const MongoTicketRepository_Single = new MongoTicketRepository();
const MongoThreadRepository_Single = new MongoThreadRepository();
const MongoWorkspaceRepository_Single = new MongoWorkspaceRepository();
const MongoChannelRepository_Single = new MongoChannelRepository();
const MongoSlackUserRepository_Single = new MongoSlackUserRepository();
const MongoAgentRepository_Single = new MongoAgentRepository();
const MongoWorkflowRepository_Single = new MongoWorkflowRepository();
const MongoSkillRepository_Single = new MongoSkillRepository();
const MongoSLARepository_Single = new MongoSLARepository();
const MongoEscalationRepository_Single = new MongoEscalationRepository();
const MongoRoutingRepository_Single = new MongoRoutingRepository();
const MongoClassificationRepository_Single = new MongoClassificationRepository();
const MongoKnowledgeRepository_Single = new MongoKnowledgeRepository();
const MongoEventRepository_Single = new MongoEventRepository();
const MongoAuditRepository_Single = new MongoAuditRepository();
const MongoNotificationRepository_Single = new MongoNotificationRepository();
const MongoMCPRepository_Single = new MongoMCPRepository();
const MongoWebhookRepository_Single = new MongoWebhookRepository();
const MongoDepartmentRepository_Single = new MongoDepartmentRepository();
const MongoTeamRepository_Single = new MongoTeamRepository();
const MongoCategoryRepository_Single = new MongoCategoryRepository();
const MongoTagRepository_Single = new MongoTagRepository();
const MongoBusinessHoursRepository_Single = new MongoBusinessHoursRepository();
const MongoHolidayRepository_Single = new MongoHolidayRepository();

const SlackApiClient = require('./infrastructure/services/SlackApiClient');
const SlackNotificationService = require('./infrastructure/services/SlackNotificationService');
const OpenAIClassificationClient = require('./infrastructure/services/OpenAIClassificationClient');
const SlackEventHandlerService = require('./infrastructure/services/SlackEventHandlerService');
const SlackAIService = require('./infrastructure/services/SlackAIService');
const SlackAICronService = require('./infrastructure/services/SlackAICronService');

const InstallWorkspaceUseCase = require('./application/usecases/workspace/InstallWorkspaceUseCase');
const SyncWorkspaceUseCase = require('./application/usecases/workspace/SyncWorkspaceUseCase');
const GetWorkspaceInfoUseCase = require('./application/usecases/workspace/GetWorkspaceInfoUseCase');
const ListWorkspacesUseCase = require('./application/usecases/workspace/ListWorkspacesUseCase');
const DisconnectWorkspaceUseCase = require('./application/usecases/workspace/DisconnectWorkspaceUseCase');
const UpdateWorkspaceSettingsUseCase = require('./application/usecases/workspace/UpdateWorkspaceSettingsUseCase');

const SyncChannelsUseCase = require('./application/usecases/channel/SyncChannelsUseCase');
const ListChannelsUseCase = require('./application/usecases/channel/ListChannelsUseCase');
const SearchChannelsUseCase = require('./application/usecases/channel/SearchChannelsUseCase');
const GetChannelDetailsUseCase = require('./application/usecases/channel/GetChannelDetailsUseCase');
const AddMonitoredChannelUseCase = require('./application/usecases/channel/AddMonitoredChannelUseCase');
const RemoveMonitoredChannelUseCase = require('./application/usecases/channel/RemoveMonitoredChannelUseCase');

const SyncSlackUsersUseCase = require('./application/usecases/user/SyncSlackUsersUseCase');
const ListSlackUsersUseCase = require('./application/usecases/user/ListSlackUsersUseCase');
const LookupSlackUserUseCase = require('./application/usecases/user/LookupSlackUserUseCase');

const CreateAgentUseCase = require('./application/usecases/agent/CreateAgentUseCase');
const UpdateAgentUseCase = require('./application/usecases/agent/UpdateAgentUseCase');
const DeleteAgentUseCase = require('./application/usecases/agent/DeleteAgentUseCase');
const CloneAgentUseCase = require('./application/usecases/agent/CloneAgentUseCase');
const ToggleAgentUseCase = require('./application/usecases/agent/ToggleAgentUseCase');
const GetAgentUseCase = require('./application/usecases/agent/GetAgentUseCase');
const ListAgentsUseCase = require('./application/usecases/agent/ListAgentsUseCase');
const AssignAgentChannelsUseCase = require('./application/usecases/agent/AssignAgentChannelsUseCase');
const AssignAgentMCPServersUseCase = require('./application/usecases/agent/AssignAgentMCPServersUseCase');
const AssignAgentWebhooksUseCase = require('./application/usecases/agent/AssignAgentWebhooksUseCase');
const UpdateAgentConnectorConfigUseCase = require('./application/usecases/agent/UpdateAgentConnectorConfigUseCase');
const ListAgentConnectorsUseCase = require('./application/usecases/agent/ListAgentConnectorsUseCase');

const CreateTicketUseCase = require('./application/usecases/ticket/CreateTicketUseCase');
const GetTicketUseCase = require('./application/usecases/ticket/GetTicketUseCase');
const ListTicketsUseCase = require('./application/usecases/ticket/ListTicketsUseCase');
const UpdateTicketUseCase = require('./application/usecases/ticket/UpdateTicketUseCase');
const ChangeTicketStatusUseCase = require('./application/usecases/ticket/ChangeTicketStatusUseCase');
const AssignTicketUseCase = require('./application/usecases/ticket/AssignTicketUseCase');
const MergeTicketsUseCase = require('./application/usecases/ticket/MergeTicketsUseCase');
const AddTicketCommentUseCase = require('./application/usecases/ticket/AddTicketCommentUseCase');

const LinkThreadToTicketUseCase = require('./application/usecases/thread/LinkThreadToTicketUseCase');

const CreateWorkflowUseCase = require('./application/usecases/workflow/CreateWorkflowUseCase');
const ExecuteWorkflowUseCase = require('./application/usecases/workflow/ExecuteWorkflowUseCase');

const CreateSLAUseCase = require('./application/usecases/sla/CreateSLAUseCase');
const GetSLAUseCase = require('./application/usecases/sla/GetSLAUseCase');
const ListSLAsUseCase = require('./application/usecases/sla/ListSLAsUseCase');
const StartSLATimerUseCase = require('./application/usecases/sla/StartSLATimerUseCase');

const CreateEscalationUseCase = require('./application/usecases/escalation/CreateEscalationUseCase');
const TriggerEscalationUseCase = require('./application/usecases/escalation/TriggerEscalationUseCase');

const CreateRoutingRuleUseCase = require('./application/usecases/routing/CreateRoutingRuleUseCase');
const RouteTicketUseCase = require('./application/usecases/routing/RouteTicketUseCase');

const ClassifyTicketUseCase = require('./application/usecases/classification/ClassifyTicketUseCase');

const UploadKnowledgeUseCase = require('./application/usecases/knowledge/UploadKnowledgeUseCase');
const IndexKnowledgeUseCase = require('./application/usecases/knowledge/IndexKnowledgeUseCase');
const SearchKnowledgeUseCase = require('./application/usecases/knowledge/SearchKnowledgeUseCase');
const DeleteKnowledgeUseCase = require('./application/usecases/knowledge/DeleteKnowledgeUseCase');

const ProcessEventUseCase = require('./application/usecases/event/ProcessEventUseCase');
const IngestEventUseCase = require('./application/usecases/event/IngestEventUseCase');

const SendNotificationUseCase = require('./application/usecases/notification/SendNotificationUseCase');

const UpdateSlackAICapabilitiesUseCase = require('./application/usecases/slackai/UpdateSlackAICapabilitiesUseCase');
const TriggerChannelSummaryUseCase = require('./application/usecases/slackai/TriggerChannelSummaryUseCase');

const UpdateAgentInvocationConfigUseCase = require('./application/usecases/agent/UpdateAgentInvocationConfigUseCase');
const GetAgentInvocationConfigUseCase = require('./application/usecases/agent/GetAgentInvocationConfigUseCase');
const GetDefaultInvocationModesUseCase = require('./application/usecases/agent/GetDefaultInvocationModesUseCase');
const SimulateAgentInvocationUseCase = require('./application/usecases/agent/SimulateAgentInvocationUseCase');

const RegisterMCPServerUseCase = require('./application/usecases/mcp/RegisterMCPServerUseCase');
const ListMCPServersUseCase = require('./application/usecases/mcp/ListMCPServersUseCase');
const GetMCPServerUseCase = require('./application/usecases/mcp/GetMCPServerUseCase');
const UpdateMCPServerUseCase = require('./application/usecases/mcp/UpdateMCPServerUseCase');
const DeleteMCPServerUseCase = require('./application/usecases/mcp/DeleteMCPServerUseCase');
const ConnectMCPServerUseCase = require('./application/usecases/mcp/ConnectMCPServerUseCase');
const DisconnectMCPServerUseCase = require('./application/usecases/mcp/DisconnectMCPServerUseCase');
const ListMCPToolsUseCase = require('./application/usecases/mcp/ListMCPToolsUseCase');
const ExecuteMCPToolUseCase = require('./application/usecases/mcp/ExecuteMCPToolUseCase');
const CheckMCPHealthUseCase = require('./application/usecases/mcp/CheckMCPHealthUseCase');

const CreateWebhookUseCase = require('./application/usecases/webhook/CreateWebhookUseCase');
const ListWebhooksUseCase = require('./application/usecases/webhook/ListWebhooksUseCase');
const GetWebhookUseCase = require('./application/usecases/webhook/GetWebhookUseCase');
const UpdateWebhookUseCase = require('./application/usecases/webhook/UpdateWebhookUseCase');
const DeleteWebhookUseCase = require('./application/usecases/webhook/DeleteWebhookUseCase');
const TriggerWebhookUseCase = require('./application/usecases/webhook/TriggerWebhookUseCase');

const RegisterSkillUseCase = require('./application/usecases/skill/RegisterSkillUseCase');
const ToggleSkillUseCase = require('./application/usecases/skill/ToggleSkillUseCase');

const CreateDepartmentUseCase = require('./application/usecases/admin/CreateDepartmentUseCase');
const CreateTeamUseCase = require('./application/usecases/admin/CreateTeamUseCase');
const CreateCategoryUseCase = require('./application/usecases/admin/CreateCategoryUseCase');
const CreateTagUseCase = require('./application/usecases/admin/CreateTagUseCase');
const CreateBusinessHoursUseCase = require('./application/usecases/admin/CreateBusinessHoursUseCase');
const CreateHolidayUseCase = require('./application/usecases/admin/CreateHolidayUseCase');

const SlackAgentFacade = require('./application/facades/SlackAgentFacade');

const AIRuntimeService = require('./application/services/AIRuntimeService');

const WorkspaceController = require('./presentation/controllers/WorkspaceController');
const ChannelController = require('./presentation/controllers/ChannelController');
const UserController = require('./presentation/controllers/UserController');
const AgentController = require('./presentation/controllers/AgentController');
const TicketController = require('./presentation/controllers/TicketController');
const ThreadController = require('./presentation/controllers/ThreadController');
const ClassificationController = require('./presentation/controllers/ClassificationController');
const WorkflowController = require('./presentation/controllers/WorkflowController');
const SkillController = require('./presentation/controllers/SkillController');
const SLAController = require('./presentation/controllers/SLAController');
const EscalationController = require('./presentation/controllers/EscalationController');
const RoutingController = require('./presentation/controllers/RoutingController');
const KnowledgeController = require('./presentation/controllers/KnowledgeController');
const EventController = require('./presentation/controllers/EventController');
const AnalyticsController = require('./presentation/controllers/AnalyticsController');
const DashboardController = require('./presentation/controllers/DashboardController');
const AuditController = require('./presentation/controllers/AuditController');
const NotificationController = require('./presentation/controllers/NotificationController');
const SearchController = require('./presentation/controllers/SearchController');
const AdminController = require('./presentation/controllers/AdminController');
const MCPController = require('./presentation/controllers/MCPController');
const WebhookController = require('./presentation/controllers/WebhookController');
const SlackAIController = require('./presentation/controllers/SlackAIController');
const AgentInvocationController = require('./presentation/controllers/AgentInvocationController');

const createWorkspaceRoutes = require('./presentation/routes/WorkspaceRoutes');
const createChannelRoutes = require('./presentation/routes/ChannelRoutes');
const createUserRoutes = require('./presentation/routes/UserRoutes');
const createAgentRoutes = require('./presentation/routes/AgentRoutes');
const createTicketRoutes = require('./presentation/routes/TicketRoutes');
const createThreadRoutes = require('./presentation/routes/ThreadRoutes');
const createClassificationRoutes = require('./presentation/routes/ClassificationRoutes');
const createWorkflowRoutes = require('./presentation/routes/WorkflowRoutes');
const createSkillRoutes = require('./presentation/routes/SkillRoutes');
const createSLARoutes = require('./presentation/routes/SLARoutes');
const createEscalationRoutes = require('./presentation/routes/EscalationRoutes');
const createRoutingRoutes = require('./presentation/routes/RoutingRoutes');
const createKnowledgeRoutes = require('./presentation/routes/KnowledgeRoutes');
const createEventRoutes = require('./presentation/routes/EventRoutes');
const createAnalyticsRoutes = require('./presentation/routes/AnalyticsRoutes');
const createDashboardRoutes = require('./presentation/routes/DashboardRoutes');
const createAuditRoutes = require('./presentation/routes/AuditRoutes');
const createNotificationRoutes = require('./presentation/routes/NotificationRoutes');
const createSearchRoutes = require('./presentation/routes/SearchRoutes');
const createAdminRoutes = require('./presentation/routes/AdminRoutes');
const createMCPRoutes = require('./presentation/routes/MCPRoutes');
const createWebhookRoutes = require('./presentation/routes/WebhookRoutes');
const createSlackAIRoutes = require('./presentation/routes/SlackAIRoutes');
const createAgentInvocationRoutes = require('./presentation/routes/AgentInvocationRoutes');

const { requireAdminRole } = require('./presentation/middleware/SlackAgentAuthMiddleware');

function createSlackAgentModule({ authMiddleware } = {}) {
  const express = require('express');
  const router = express.Router();

  // ── Repositories ─────────────────────────────────────────────
  const workspaceRepository = MongoWorkspaceRepository_Single;
  const channelRepository = MongoChannelRepository_Single;
  const slackUserRepository = MongoSlackUserRepository_Single;
  const agentRepository = MongoAgentRepository_Single;
  const ticketRepository = MongoTicketRepository_Single;
  const threadRepository = MongoThreadRepository_Single;
  const workflowRepository = MongoWorkflowRepository_Single;
  const skillRepository = MongoSkillRepository_Single;
  const slaRepository = MongoSLARepository_Single;
  const escalationRepository = MongoEscalationRepository_Single;
  const routingRepository = MongoRoutingRepository_Single;
  const classificationRepository = MongoClassificationRepository_Single;
  const knowledgeRepository = MongoKnowledgeRepository_Single;
  const eventRepository = MongoEventRepository_Single;
  const auditRepository = MongoAuditRepository_Single;
  const notificationRepository = MongoNotificationRepository_Single;
  const mcpRepository = MongoMCPRepository_Single;
  const webhookRepository = MongoWebhookRepository_Single;
  const departmentRepository = MongoDepartmentRepository_Single;
  const teamRepository = MongoTeamRepository_Single;
  const categoryRepository = MongoCategoryRepository_Single;
  const tagRepository = MongoTagRepository_Single;
  const businessHoursRepository = MongoBusinessHoursRepository_Single;
  const holidayRepository = MongoHolidayRepository_Single;

  // ── Infrastructure Services ──────────────────────────────────
  const slackApiClient = new SlackApiClient();
  const slackNotificationService = new SlackNotificationService({ slackApiClient });
  const classificationClient = new OpenAIClassificationClient({});
  const slackAiService = new SlackAIService({
    knowledgeRepository,
    slackApiClient,
    classificationClient,
  });
  const slackAiCronService = new SlackAICronService({
    agentRepository,
    workspaceRepository,
    channelRepository,
    slackAiService,
    slackApiClient,
    fetchOrgIds: async () => {
      const workspaces = await workspaceRepository.findAll();
      const orgIds = [...new Set(workspaces.map((w) => w.organizationId?.toString()).filter(Boolean))];
      return orgIds;
    },
  });

  // ── Application Services ─────────────────────────────────────
  const aiRuntimeService = new AIRuntimeService({
    llmService: classificationClient,
    contextBuilder: null,
    memoryService: null,
    knowledgeService: null,
    toolSelectionService: null,
    responseValidationService: null,
    eventBus: null,
  });

  // ── Use Cases: Workspace ─────────────────────────────────────
  const installWorkspaceUseCase = new InstallWorkspaceUseCase({
    workspaceRepository,
    slackApiClient,
    auditService: auditRepository,
  });
  const syncWorkspaceUseCase = new SyncWorkspaceUseCase({ workspaceRepository, slackApiClient });
  const getWorkspaceInfoUseCase = new GetWorkspaceInfoUseCase({ workspaceRepository });
  const listWorkspacesUseCase = new ListWorkspacesUseCase({ workspaceRepository });
  const disconnectWorkspaceUseCase = new DisconnectWorkspaceUseCase({
    workspaceRepository,
    auditService: auditRepository,
  });
  const updateWorkspaceSettingsUseCase = new UpdateWorkspaceSettingsUseCase({
    workspaceRepository,
  });

  // ── Use Cases: Channel ───────────────────────────────────────
  const syncChannelsUseCase = new SyncChannelsUseCase({
    workspaceRepository,
    channelRepository,
    slackApiClient,
  });
  const listChannelsUseCase = new ListChannelsUseCase({ channelRepository });
  const searchChannelsUseCase = new SearchChannelsUseCase({ channelRepository });
  const getChannelDetailsUseCase = new GetChannelDetailsUseCase({ channelRepository });
  const addMonitoredChannelUseCase = new AddMonitoredChannelUseCase({
    channelRepository,
    workspaceRepository,
    slackApiClient,
  });
  const removeMonitoredChannelUseCase = new RemoveMonitoredChannelUseCase({ channelRepository });

  // ── Use Cases: User ──────────────────────────────────────────
  const syncSlackUsersUseCase = new SyncSlackUsersUseCase({
    workspaceRepository,
    slackUserRepository,
    slackApiClient,
  });
  const listSlackUsersUseCase = new ListSlackUsersUseCase({ slackUserRepository });
  const lookupSlackUserUseCase = new LookupSlackUserUseCase({ slackUserRepository });

  // ── Use Cases: Agent ─────────────────────────────────────────
  const createAgentUseCase = new CreateAgentUseCase({
    agentRepository,
    auditService: auditRepository,
  });
  const updateAgentUseCase = new UpdateAgentUseCase({ agentRepository });
  const deleteAgentUseCase = new DeleteAgentUseCase({
    agentRepository,
    auditService: auditRepository,
  });
  const cloneAgentUseCase = new CloneAgentUseCase({ agentRepository });
  const toggleAgentUseCase = new ToggleAgentUseCase({ agentRepository });
  const getAgentUseCase = new GetAgentUseCase({ agentRepository });
  const listAgentsUseCase = new ListAgentsUseCase({ agentRepository });
  const assignAgentChannelsUseCase = new AssignAgentChannelsUseCase({
    agentRepository,
    channelRepository,
    slackApiClient,
    workspaceRepository,
  });
  const assignAgentMCPServersUseCase = new AssignAgentMCPServersUseCase({
    agentRepository,
    mcpRepository,
    auditService: auditRepository,
  });
  const assignAgentWebhooksUseCase = new AssignAgentWebhooksUseCase({
    agentRepository,
    webhookRepository,
    auditService: auditRepository,
  });
  const updateAgentConnectorConfigUseCase = new UpdateAgentConnectorConfigUseCase({
    agentRepository,
    auditService: auditRepository,
  });
  const listAgentConnectorsUseCase = new ListAgentConnectorsUseCase({
    agentRepository,
    mcpRepository,
    webhookRepository,
  });

  // ── Use Cases: Ticket ────────────────────────────────────────
  const createTicketUseCase = new CreateTicketUseCase({
    ticketRepository,
    classificationService: null,
    routingService: null,
    slaService: null,
    auditService: auditRepository,
  });
  const getTicketUseCase = new GetTicketUseCase({ ticketRepository });
  const listTicketsUseCase = new ListTicketsUseCase({ ticketRepository });
  const updateTicketUseCase = new UpdateTicketUseCase({
    ticketRepository,
    auditService: auditRepository,
  });
  const changeTicketStatusUseCase = new ChangeTicketStatusUseCase({
    ticketRepository,
    slaService: null,
    auditService: auditRepository,
  });
  const assignTicketUseCase = new AssignTicketUseCase({
    ticketRepository,
    slackNotificationService,
    auditService: auditRepository,
  });
  const mergeTicketsUseCase = new MergeTicketsUseCase({
    ticketRepository,
    auditService: auditRepository,
  });
  const addTicketCommentUseCase = new AddTicketCommentUseCase({
    ticketRepository,
    auditService: auditRepository,
  });

  // ── Use Cases: Thread ────────────────────────────────────────
  const linkThreadToTicketUseCase = new LinkThreadToTicketUseCase({
    threadRepository,
    ticketRepository,
  });

  // ── Use Cases: Workflow ──────────────────────────────────────
  const createWorkflowUseCase = new CreateWorkflowUseCase({ workflowRepository });
  const executeWorkflowUseCase = new ExecuteWorkflowUseCase({
    workflowRepository,
    workflowEngine: null,
  });

  // ── Use Cases: SLA ───────────────────────────────────────────
  const createSLAUseCase = new CreateSLAUseCase({ slaRepository });
  const getSLAUseCase = new GetSLAUseCase({ slaRepository });
  const listSLAsUseCase = new ListSLAsUseCase({ slaRepository });
  const startSLATimerUseCase = new StartSLATimerUseCase({ slaRepository });

  // ── Use Cases: Escalation ────────────────────────────────────
  const createEscalationUseCase = new CreateEscalationUseCase({ escalationRepository });
  const triggerEscalationUseCase = new TriggerEscalationUseCase({
    escalationRepository,
    ticketRepository,
  });

  // ── Use Cases: Routing ───────────────────────────────────────
  const createRoutingRuleUseCase = new CreateRoutingRuleUseCase({ routingRepository });
  const routeTicketUseCase = new RouteTicketUseCase({
    ticketRepository,
    routingRepository,
    agentRepository,
  });

  // ── Use Cases: Classification ────────────────────────────────
  const classifyTicketUseCase = new ClassifyTicketUseCase({
    classificationRepository,
    classificationClient,
  });

  // ── Use Cases: Knowledge ─────────────────────────────────────
  const uploadKnowledgeUseCase = new UploadKnowledgeUseCase({ knowledgeRepository });
  const indexKnowledgeUseCase = new IndexKnowledgeUseCase({
    knowledgeRepository,
    classificationClient,
  });
  const searchKnowledgeUseCase = new SearchKnowledgeUseCase({ knowledgeRepository });
  const deleteKnowledgeUseCase = new DeleteKnowledgeUseCase({ knowledgeRepository });

  // ── Services: Event Handler ──────────────────────────────────
  const slackEventHandlerService = new SlackEventHandlerService({
    slackApiClient,
    agentRepository,
    channelRepository,
    workspaceRepository,
  });

  // ── Use Cases: Event ─────────────────────────────────────────
  const processEventUseCase = new ProcessEventUseCase({
    eventService: slackEventHandlerService,
    auditService: auditRepository,
  });
  const ingestEventUseCase = new IngestEventUseCase({
    eventRepository,
    slackEventHandlerService,
    slackApiClient,
    workspaceRepository,
    agentRepository,
    channelRepository,
    slackAiService,
  });

  // ── Use Cases: Slack AI ───────────────────────────────────────
  const updateSlackAICapabilitiesUseCase = new UpdateSlackAICapabilitiesUseCase({
    agentRepository,
    auditService: auditRepository,
  });
  const triggerChannelSummaryUseCase = new TriggerChannelSummaryUseCase({
    slackAiService,
    agentRepository,
    workspaceRepository,
    channelRepository,
  });

  // ── Use Cases: Invocation ────────────────────────────────────
  const updateAgentInvocationConfigUseCase = new UpdateAgentInvocationConfigUseCase({
    agentRepository,
    auditService: auditRepository,
  });
  const getAgentInvocationConfigUseCase = new GetAgentInvocationConfigUseCase({
    agentRepository,
  });
  const getDefaultInvocationModesUseCase = new GetDefaultInvocationModesUseCase();
  const simulateAgentInvocationUseCase = new SimulateAgentInvocationUseCase({
    agentRepository,
  });

  // ── Use Cases: Notification ──────────────────────────────────
  const sendNotificationUseCase = new SendNotificationUseCase({
    notificationRepository,
    slackNotificationService,
  });

  // ── Use Cases: MCP ───────────────────────────────────────────
  const registerMCPServerUseCase = new RegisterMCPServerUseCase({
    mcpRepository,
    auditService: auditRepository,
  });
  const listMCPServersUseCase = new ListMCPServersUseCase({ mcpRepository });
  const getMCPServerUseCase = new GetMCPServerUseCase({ mcpRepository });
  const updateMCPServerUseCase = new UpdateMCPServerUseCase({
    mcpRepository,
    auditService: auditRepository,
  });
  const deleteMCPServerUseCase = new DeleteMCPServerUseCase({
    mcpRepository,
    auditService: auditRepository,
  });
  const connectMCPServerUseCase = new ConnectMCPServerUseCase({
    mcpRepository,
    auditService: auditRepository,
  });
  const disconnectMCPServerUseCase = new DisconnectMCPServerUseCase({
    mcpRepository,
    auditService: auditRepository,
  });
  const listMCPToolsUseCase = new ListMCPToolsUseCase({ mcpRepository });
  const executeMCPToolUseCase = new ExecuteMCPToolUseCase({ mcpRepository });
  const checkMCPHealthUseCase = new CheckMCPHealthUseCase({ mcpRepository });

  // ── Use Cases: Webhook ───────────────────────────────────────
  const createWebhookUseCase = new CreateWebhookUseCase({
    webhookRepository,
    auditService: auditRepository,
  });
  const listWebhooksUseCase = new ListWebhooksUseCase({ webhookRepository });
  const getWebhookUseCase = new GetWebhookUseCase({ webhookRepository });
  const updateWebhookUseCase = new UpdateWebhookUseCase({
    webhookRepository,
    auditService: auditRepository,
  });
  const deleteWebhookUseCase = new DeleteWebhookUseCase({
    webhookRepository,
    auditService: auditRepository,
  });
  const triggerWebhookUseCase = new TriggerWebhookUseCase({ webhookRepository });

  // ── Use Cases: Skill ─────────────────────────────────────────
  const registerSkillUseCase = new RegisterSkillUseCase({ skillRepository });
  const toggleSkillUseCase = new ToggleSkillUseCase({ skillRepository });

  // ── Use Cases: Admin ─────────────────────────────────────────
  const createDepartmentUseCase = new CreateDepartmentUseCase({ departmentRepository });
  const createTeamUseCase = new CreateTeamUseCase({ teamRepository });
  const createCategoryUseCase = new CreateCategoryUseCase({ categoryRepository });
  const createTagUseCase = new CreateTagUseCase({ tagRepository });
  const createBusinessHoursUseCase = new CreateBusinessHoursUseCase({ businessHoursRepository });
  const createHolidayUseCase = new CreateHolidayUseCase({ holidayRepository });

  // ── Use Cases: Search ────────────────────────────────────────
  const globalSearchUseCase = { execute: async (query) => [] };
  const ticketSearchUseCase = { execute: async (query) => [] };

  // ── Use Cases: Analytics ─────────────────────────────────────
  const getTicketAnalyticsUseCase = { execute: async (query) => {} };
  const getSLAMetricsUseCase = { execute: async (query) => {} };
  const getCostAnalyticsUseCase = { execute: async (query) => {} };
  const getLatencyAnalyticsUseCase = { execute: async (query) => {} };

  // ── Use Cases: Audit ─────────────────────────────────────────
  const auditLogUseCase = { execute: async (query) => [] };
  const getDashboardUseCase = { execute: async (query) => {} };

  // ── Facade ───────────────────────────────────────────────────
  const slackAgentFacade = new SlackAgentFacade({
    installWorkspaceUseCase,
    syncWorkspaceUseCase,
    getWorkspaceInfoUseCase,
    listWorkspacesUseCase,
    disconnectWorkspaceUseCase,
    updateWorkspaceSettingsUseCase,
    syncChannelsUseCase,
    listChannelsUseCase,
    searchChannelsUseCase,
    getChannelDetailsUseCase,
    addMonitoredChannelUseCase,
    removeMonitoredChannelUseCase,
    syncSlackUsersUseCase,
    listSlackUsersUseCase,
    lookupSlackUserUseCase,
    createAgentUseCase,
    updateAgentUseCase,
    deleteAgentUseCase,
    cloneAgentUseCase,
    toggleAgentUseCase,
    getAgentUseCase,
    listAgentsUseCase,
    createTicketUseCase,
    getTicketUseCase,
    listTicketsUseCase,
    updateTicketUseCase,
    changeTicketStatusUseCase,
    assignTicketUseCase,
    mergeTicketsUseCase,
    addTicketCommentUseCase,
    linkThreadToTicketUseCase,
    classifyTicketUseCase,
    createRoutingRuleUseCase,
    routeTicketUseCase,
    createSLAUseCase,
    getSLAUseCase,
    listSLAsUseCase,
    startSLATimerUseCase,
    createEscalationUseCase,
    triggerEscalationUseCase,
    createWorkflowUseCase,
    executeWorkflowUseCase,
    registerSkillUseCase,
    toggleSkillUseCase,
    uploadKnowledgeUseCase,
    indexKnowledgeUseCase,
    searchKnowledgeUseCase,
    deleteKnowledgeUseCase,
    processEventUseCase,
    ingestEventUseCase,
    sendNotificationUseCase,
    registerMCPServerUseCase,
    listMCPServersUseCase,
    getMCPServerUseCase,
    updateMCPServerUseCase,
    deleteMCPServerUseCase,
    connectMCPServerUseCase,
    disconnectMCPServerUseCase,
    listMCPToolsUseCase,
    executeMCPToolUseCase,
    checkMCPHealthUseCase,
    createWebhookUseCase,
    listWebhooksUseCase,
    getWebhookUseCase,
    updateWebhookUseCase,
    deleteWebhookUseCase,
    triggerWebhookUseCase,
    createDepartmentUseCase,
    createTeamUseCase,
    createCategoryUseCase,
    createTagUseCase,
    createBusinessHoursUseCase,
    createHolidayUseCase,
    globalSearchUseCase,
    ticketSearchUseCase,
    getTicketAnalyticsUseCase,
    getSLAMetricsUseCase,
    getCostAnalyticsUseCase,
    getLatencyAnalyticsUseCase,
    auditLogUseCase,
    getDashboardUseCase,
    assignAgentChannelsUseCase,
    assignAgentMCPServersUseCase,
    assignAgentWebhooksUseCase,
    updateAgentConnectorConfigUseCase,
    listAgentConnectorsUseCase,
    updateSlackAICapabilitiesUseCase,
    triggerChannelSummaryUseCase,
    updateAgentInvocationConfigUseCase,
    getAgentInvocationConfigUseCase,
    getDefaultInvocationModesUseCase,
    simulateAgentInvocationUseCase,
    updateAgentSkillsUseCase: null,
    updateAgentPermissionsUseCase: null,
    unassignTicketUseCase: null,
    transferTicketUseCase: null,
    splitTicketUseCase: null,
    addTicketAttachmentUseCase: null,
    watchTicketUseCase: null,
    followTicketUseCase: null,
    syncThreadUseCase: null,
    generateThreadSummaryUseCase: null,
    detectIntentUseCase: null,
    findSimilarTicketsUseCase: null,
    configureSkillUseCase: null,
    executeSkillUseCase: null,
    retryWebhookUseCase: null,
  });

  // ── Controllers ──────────────────────────────────────────────
  const workspaceController = new WorkspaceController({ slackAgentFacade });
  const channelController = new ChannelController({ slackAgentFacade });
  const userController = new UserController({ slackAgentFacade });
  const agentController = new AgentController({ slackAgentFacade });
  const ticketController = new TicketController({ slackAgentFacade });
  const threadController = new ThreadController({ slackAgentFacade });
  const classificationController = new ClassificationController({ slackAgentFacade });
  const workflowController = new WorkflowController({ slackAgentFacade });
  const skillController = new SkillController({ slackAgentFacade });
  const slaController = new SLAController({ slackAgentFacade });
  const escalationController = new EscalationController({ slackAgentFacade });
  const routingController = new RoutingController({ slackAgentFacade });
  const knowledgeController = new KnowledgeController({ slackAgentFacade });
  const eventController = new EventController({ slackAgentFacade, workspaceRepository });
  const analyticsController = new AnalyticsController({ slackAgentFacade });
  const dashboardController = new DashboardController({ slackAgentFacade });
  const auditController = new AuditController({ slackAgentFacade });
  const notificationController = new NotificationController({ slackAgentFacade });
  const searchController = new SearchController({ slackAgentFacade });
  const adminController = new AdminController({ slackAgentFacade });
  const mcpController = new MCPController({ slackAgentFacade });
  const webhookController = new WebhookController({ slackAgentFacade });
  const slackAIController = new SlackAIController({ slackAgentFacade });
  const agentInvocationController = new AgentInvocationController({ slackAgentFacade });

  // ── Routes ───────────────────────────────────────────────────
  router.use('/workspaces', createWorkspaceRoutes({ workspaceController, authMiddleware }));
  router.use('/', createChannelRoutes({ channelController, authMiddleware }));
  router.use('/', createUserRoutes({ userController, authMiddleware }));
  router.use('/agents', createAgentRoutes({ agentController, authMiddleware }));
  router.use('/tickets', createTicketRoutes({ ticketController, authMiddleware }));
  router.use('/', createThreadRoutes({ threadController, authMiddleware }));
  router.use('/classify', createClassificationRoutes({ classificationController, authMiddleware }));
  router.use('/workflows', createWorkflowRoutes({ workflowController, authMiddleware }));
  router.use('/skills', createSkillRoutes({ skillController, authMiddleware }));
  router.use('/sla-policies', createSLARoutes({ slaController, authMiddleware }));
  router.use('/escalations', createEscalationRoutes({ escalationController, authMiddleware }));
  router.use('/routing', createRoutingRoutes({ routingController, authMiddleware }));
  router.use('/knowledge', createKnowledgeRoutes({ knowledgeController, authMiddleware }));
  router.use('/events', createEventRoutes({ eventController }));
  router.use('/analytics', createAnalyticsRoutes({ analyticsController, authMiddleware }));
  router.use('/dashboard', createDashboardRoutes({ dashboardController, authMiddleware }));
  router.use('/audit-logs', createAuditRoutes({ auditController, authMiddleware }));
  router.use(
    '/notifications',
    createNotificationRoutes({ notificationController, authMiddleware }),
  );
  router.use('/search', createSearchRoutes({ searchController, authMiddleware }));
  router.use('/admin', requireAdminRole, createAdminRoutes({ adminController, authMiddleware }));
  router.use('/mcp', createMCPRoutes({ mcpController, authMiddleware }));
  router.use('/webhooks', createWebhookRoutes({ webhookController, authMiddleware }));
  router.use('/slack-ai', createSlackAIRoutes({ slackAIController, authMiddleware }));
  router.use('/agents', createAgentInvocationRoutes({ agentInvocationController, authMiddleware }));

  // Start the AI cron scheduler (runs every 60s, checks for due channel summaries)
  slackAiCronService.start();

  return {
    router,
    slackAgentFacade,
    aiRuntimeService,
    workspaceRepository,
    channelRepository,
    agentRepository,
    ticketRepository,
  };
}

module.exports = { createSlackAgentModule };
