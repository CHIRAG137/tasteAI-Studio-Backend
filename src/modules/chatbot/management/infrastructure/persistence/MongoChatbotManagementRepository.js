'use strict';

class MongoChatbotManagementRepository {
  constructor({ ChatBotModel }) {
    this.ChatBotModel = ChatBotModel;
  }

  async findAll(userId, { skip, limit, page }) {
    const [bots, total] = await Promise.all([
      this.ChatBotModel.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.ChatBotModel.countDocuments({ user: userId }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      bots,
      pagination: { total, page, limit, totalPages },
    };
  }

  async findById(botId) {
    return this.ChatBotModel.findById(botId).lean();
  }

  async update(botId, payload) {
    return this.ChatBotModel.findByIdAndUpdate(botId, { $set: payload }, { new: true }).lean();
  }

  async delete(botId) {
    await this.ChatBotModel.findByIdAndDelete(botId);
  }
}

module.exports = MongoChatbotManagementRepository;
