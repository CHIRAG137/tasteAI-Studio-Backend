'use strict';

/**
 * SlackAICronService
 *
 * Checks every minute for agents with cron-triggered Slack AI capabilities
 * and executes them when the cron expression matches the current time.
 *
 * Usage: Pass an `enabledOrgIds` array or a `fetchOrgIds` async function
 * to let the scheduler know which organizations to scan.
 */
class SlackAICronService {
  constructor({
    agentRepository,
    workspaceRepository,
    channelRepository,
    slackAiService,
    slackApiClient,
    fetchOrgIds,
  }) {
    this.agentRepository = agentRepository;
    this.workspaceRepository = workspaceRepository;
    this.channelRepository = channelRepository;
    this.slackAiService = slackAiService;
    this.slackApiClient = slackApiClient;
    this.fetchOrgIds = fetchOrgIds || (async () => []);
    this._interval = null;
    this._running = false;
  }

  start() {
    if (this._interval) {
      return;
    }
    console.warn('[SlackAICron] Starting cron scheduler (interval: 60s)');
    this._interval = setInterval(() => this._tick(), 60_000);
    this._tick();
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  async _tick() {
    if (this._running) {
      return;
    }
    this._running = true;

    try {
      const now = new Date();
      const orgIds = await this.fetchOrgIds();

      for (const orgId of orgIds) {
        const agents = await this.agentRepository.findEnabled(orgId);
        for (const agent of agents) {
          const caps = agent.slackAiCapabilities || {};
          if (!caps.enabled || !caps.channelSummary) {
            continue;
          }

          const triggerMode = caps.channelSummaryConfig?.triggerMode || 'manual';
          if (triggerMode !== 'cron' && triggerMode !== 'both') {
            continue;
          }

          const cronExpr = caps.channelSummaryConfig?.cronExpression || '0 9 * * 1-5';
          if (!this._cronMatches(cronExpr, now)) {
            continue;
          }

          console.warn(
            `[SlackAICron] Triggering channel summary for agent "${agent.name}" (${agent.id})`,
          );

          const assignedChannels = agent.assignedChannelIds || [];
          for (const channelMongoId of assignedChannels) {
            try {
              const channel = await this.channelRepository.findById(channelMongoId);
              if (!channel) {
                continue;
              }

              const workspace = await this.workspaceRepository.findById(channel.workspaceId);
              const botToken = workspace?.accessToken || workspace?.botToken;
              if (!botToken) {
                continue;
              }

              this.slackAiService
                .generateChannelSummary(agent, workspace.id, channel.slackChannelId, botToken)
                .catch((err) =>
                  console.warn(
                    `[SlackAICron] Summary error for channel ${channel.slackChannelId}: ${err.message}`,
                  ),
                );
            } catch (err) {
              console.warn(
                `[SlackAICron] Error processing channel ${channelMongoId}: ${err.message}`,
              );
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[SlackAICron] Tick error: ${err.message}`);
    } finally {
      this._running = false;
    }
  }

  _cronMatches(expression, date) {
    const parts = expression.trim().split(/\s+/);
    if (parts.length < 5) {
      return false;
    }

    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();

    const fields = [
      { value: minute, expr: parts[0], min: 0, max: 59 },
      { value: hour, expr: parts[1], min: 0, max: 23 },
      { value: dayOfMonth, expr: parts[2], min: 1, max: 31 },
      { value: month, expr: parts[3], min: 1, max: 12 },
      { value: dayOfWeek, expr: parts[4], min: 0, max: 6 },
    ];

    return fields.every((f) => this._fieldMatches(f.value, f.expr, f.min, f.max));
  }

  _fieldMatches(value, expr, min, max) {
    if (expr === '*') {
      return true;
    }

    const stepMatch = expr.match(/^(.+?)\/(\d+)$/);
    if (stepMatch) {
      const rangePart = stepMatch[1];
      const step = parseInt(stepMatch[2], 10);
      if (rangePart === '*') {
        return value % step === 0;
      }
      const rangeParts = rangePart.split('-').map(Number);
      if (rangeParts.length === 2) {
        const [rangeStart, rangeEnd] = rangeParts;
        if (value < rangeStart || value > rangeEnd) {
          return false;
        }
        return (value - rangeStart) % step === 0;
      }
      const val = parseInt(rangePart, 10);
      return (value - val) % step === 0;
    }

    const rangeMatch = expr.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      return value >= start && value <= end;
    }

    if (expr.includes(',')) {
      return expr.split(',').some((p) => parseInt(p, 10) === value);
    }

    const num = parseInt(expr, 10);
    return num === value;
  }
}

module.exports = SlackAICronService;
