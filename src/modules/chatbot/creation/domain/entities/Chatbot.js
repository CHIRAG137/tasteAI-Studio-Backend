'use strict';

class Chatbot {
  constructor({
    userId,
    name,
    description,
    configuration,
    websiteUrl,
    scrapedUrls = [],
    trainingFiles = [],
  }) {
    this.userId = userId;
    this.name = name;
    this.description = description;
    this.configuration = configuration;
    this.websiteUrl = websiteUrl;
    this.scrapedUrls = scrapedUrls;
    this.trainingFiles = trainingFiles;

    this.validate();
  }

  validate() {
    if (!this.userId) {
      throw new Error('User id is required');
    }

    if (!this.name?.trim()) {
      throw new Error('Bot name is required');
    }
  }

  toPersistence() {
    return {
      user: this.userId,
      name: this.name,
      description: this.description,
      website_url: this.websiteUrl,
      scraped_urls: this.scrapedUrls,
      training_files: this.trainingFiles,

      ...this.configuration.toPersistence(),
    };
  }
}

module.exports = Chatbot;
