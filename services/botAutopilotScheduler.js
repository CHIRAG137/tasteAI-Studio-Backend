const cron = require('node-cron');
const BotAutopilotConfig = require('../models/BotAutopilotConfig');
const arizeInsightService = require('./arizeInsightService');
const logger = require('../utils/logger');

let task = null;

exports.startBotAutopilotScheduler = (schedule = '*/15 * * * *') => {
  if (task) {
    logger.warn('Bot autopilot scheduler already running');
    return;
  }

  task = cron.schedule(schedule, async () => {
    try {
      const dueConfigs = await BotAutopilotConfig.find({
        enabled: true,
        nextRunAt: { $lte: new Date() },
      }).lean();

      if (!dueConfigs.length) {
        return;
      }

      logger.info('Bot autopilot scheduler processing due configs', {
        count: dueConfigs.length,
      });

      for (const config of dueConfigs) {
        try {
          await arizeInsightService.generateBotAutopilotRecommendations({
            botId: config.bot,
            userId: config.user,
            trigger: 'scheduled',
            send: true,
          });
          logger.info('Scheduled autopilot run completed', {
            botId: String(config.bot),
            configId: String(config._id),
          });
        } catch (error) {
          logger.error('Scheduled autopilot run failed', {
            botId: String(config.bot),
            configId: String(config._id),
            error: error.message,
          });
          await BotAutopilotConfig.findByIdAndUpdate(config._id, {
            lastStatus: 'failed',
            lastError: error.message,
          });
        }
      }
    } catch (error) {
      logger.error('Bot autopilot scheduler job failed', { error: error.message });
    }
  });

  logger.info('Bot autopilot scheduler started', { schedule });
};

exports.stopBotAutopilotScheduler = () => {
  if (task) {
    task.stop();
    task = null;
    logger.info('Bot autopilot scheduler stopped');
  }
};
