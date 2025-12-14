const WebSocket = require('ws');
const elevenlabsService = require('../services/elevenlabsService');

module.exports = (server) => {
  const wss = new WebSocket.Server({ server, path: '/stt' });

  wss.on('connection', (client) => {
    const elevenWs = elevenlabsService.createSTTStream((text) => {
      client.send(JSON.stringify({ text }));
    });

    client.on('message', (audioChunk) => {
      elevenWs.readyState === 1 && elevenWs.send(audioChunk);
    });

    client.on('close', () => elevenWs.close());
  });
};
