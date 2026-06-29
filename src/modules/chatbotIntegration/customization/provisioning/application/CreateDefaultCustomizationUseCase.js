'use strict';

const DEFAULT_EMBED_CUSTOMIZATION = {
  headerTitle: 'Chat Assistant',
  headerSubtitle: 'Online',
  placeholder: 'Type your message...',
  primaryColor: '#3b82f6',
  backgroundColor: '#ffffff',
  headerBackground: '#ffffff',
  userMessageColor: '#3b82f6',
  botMessageColor: '#f1f5f9',
  messageBackgroundColor: '#f1f5f9',
  textColor: '#1e293b',
  fontFamily: 'Inter, sans-serif',
  borderRadius: 8,
  chatCustomCSS: '',
  useChatCustomCSS: false,

  buttonBackground: 'linear-gradient(135deg, #9b5de5, #f15bb5)',
  buttonColor: '#ffffff',
  buttonSize: '56',
  buttonBorderRadius: '50',
  buttonPosition: 'bottom-right',
  buttonBottom: '20',
  buttonRight: '20',
  buttonLeft: '20',
  buttonCustomCSS: '',
  useButtonCustomCSS: false,
  buttonText: 'Chat with us',
  buttonShowText: false,
  buttonTextPosition: 'left',
  buttonIcon: 'chat',
  buttonIconType: 'default',
  buttonCustomIcon: null,
  buttonIconSize: '24',
  buttonAnimation: 'none',
  buttonHoverAnimation: 'scale',
  buttonPulse: false,
  buttonShadow: '0 4px 10px rgba(0,0,0,0.3)',
  buttonTextColor: '#1e293b',
  buttonTextSize: '14',
  buttonPadding: '12',
};

class CreateDefaultCustomizationUseCase {
  constructor({ customizationRepository }) {
    this.customizationRepository = customizationRepository;
  }

  async execute({ botId, botName }) {
    const existing = await this.customizationRepository.findByBotId(botId);
    if (existing) {
      return existing;
    }

    return this.customizationRepository.create({
      botId,
      ...DEFAULT_EMBED_CUSTOMIZATION,
      headerTitle: botName || DEFAULT_EMBED_CUSTOMIZATION.headerTitle,
    });
  }
}

module.exports = CreateDefaultCustomizationUseCase;
