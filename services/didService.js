const axios = require("axios");
const logger = require("../utils/logger");

const DID_API_KEY = process.env.DID_API_KEY;
const DID_API_SECRET = process.env.DID_API_SECRET;

const AVATAR_URL =
  "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg";

exports.createTalkingVideo = async (text) => {
  if (!text) {
    logger.error("D-ID createTalkingVideo failed: text missing");
    throw new Error("Text is required to create talking video");
  }

  logger.info("D-ID createTalkingVideo started", {
    textLength: text.length,
    avatar: AVATAR_URL,
  });

  try {
    const response = await axios.post(
      "https://api.d-id.com/talks",
      {
        script: {
          type: "text",
          input: text,
        },
        source_url: AVATAR_URL,
      },
      {
        auth: {
          username: DID_API_KEY,
          password: DID_API_SECRET,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    logger.info("D-ID createTalkingVideo successful", {
      talkId: response.data?.id,
      status: response.data?.status,
    });

    return response.data;
  } catch (err) {
    logger.error("D-ID createTalkingVideo error", {
      error: err.response?.data || err.message,
    });
    throw err;
  }
};

exports.getTalkingVideoStatus = async (talkId) => {
  if (!talkId) {
    logger.error("D-ID getTalkingVideoStatus failed: talkId missing");
    throw new Error("Talk ID is required");
  }

  logger.info("D-ID getTalkingVideoStatus started", { talkId });

  try {
    const response = await axios.get(
      `https://api.d-id.com/talks/${talkId}`,
      {
        auth: {
          username: DID_API_KEY,
          password: DID_API_SECRET,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const result = {
      id: response.data.id,
      status: response.data.status,
      result_url: response.data.result_url || null,
    };

    logger.info("D-ID getTalkingVideoStatus successful", {
      talkId,
      status: result.status,
      hasVideo: Boolean(result.result_url),
    });

    return result;
  } catch (err) {
    logger.error("D-ID getTalkingVideoStatus error", {
      talkId,
      error: err.response?.data || err.message,
    });
    throw err;
  }
};
