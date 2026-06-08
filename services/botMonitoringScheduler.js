const cron = require('node-cron');
const BotMonitoringConfig = require('../models/BotMonitoringConfig');
const botMonitoringService = require('./botMonitoringService');
const logger = require('../utils/logger');

let task = null;

exports.startBotMonitoringScheduler = (schedule = '*/15 * * * *') => {
  if (task) {
    logger.warn('Bot monitoring scheduler already running');
    return;
  }

  task = cron.schedule(schedule, async () => {
    try {
      const configs = await BotMonitoringConfig.find({ enabled: true }).lean();
      const now = Date.now();

      for (const config of configs) {
        const intervalMs = (config.checkIntervalMinutes || 15) * 60 * 1000;
        const lastChecked = config.lastCheckedAt
          ? new Date(config.lastCheckedAt).getTime()
          : 0;

        if (now - lastChecked < intervalMs) continue;

        try {
          await botMonitoringService.evaluateBotMonitoring({
            botId: config.bot,
            userId: config.user,
            notify: true,
            trigger: 'scheduled',
          });
        } catch (error) {
          logger.error('Scheduled monitoring check failed', {
            botId: String(config.bot),
            error: error.message,
          });
          await BotMonitoringConfig.findByIdAndUpdate(config._id, {
            lastStatus: 'failed',
            lastError: error.message,
            lastCheckedAt: new Date(),
          });
        }
      }
    } catch (error) {
      logger.error('Bot monitoring scheduler job failed', { error: error.message });
    }
  });

  logger.info('Bot monitoring scheduler started', { schedule });
};

exports.stopBotMonitoringScheduler = () => {
  if (task) {
    task.stop();
    task = null;
    logger.info('Bot monitoring scheduler stopped');
  }
};
