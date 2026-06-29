'use strict';

class InstallWorkspaceUseCase {
  constructor({ workspaceRepository, slackApiClient, auditService }) {
    this.workspaceRepository = workspaceRepository;
    this.slackApiClient = slackApiClient;
    this.auditService = auditService;
  }

  async execute(command) {
    const slackResponse = await this.slackApiClient.exchangeOAuthCode(
      command.authCode,
      command.redirectUri,
    );

    const { access_token, bot_user_id, team, authed_user, scope } = slackResponse;

    const workspaceData = {
      organizationId: command.organizationId,
      teamId: team.id,
      teamName: team.name,
      accessToken: access_token,
      botUserId: bot_user_id,
      botAccessToken: access_token,
      scopes: scope ? scope.split(',') : [],
      authedUserId: authed_user.id,
      installedById: command.userId,
      installedAt: new Date(),
      isActive: true,
    };

    const saved = await this.workspaceRepository.upsertByTeamId(team.id, workspaceData);
    try {
      if (this.auditService?.save) {
        await this.auditService.save({
          organizationId: command.organizationId,
          actorId: command.userId,
          actorType: 'user',
          action: 'workspace.installed',
          resourceType: 'workspace',
          resourceId: saved.id || saved._id,
          metadata: { teamId: team.id, teamName: team.name },
        });
      }
    } catch (auditErr) {
      console.error('Audit log failed, but install succeeded:', auditErr.message);
    }
    return saved;
  }
}

module.exports = InstallWorkspaceUseCase;
