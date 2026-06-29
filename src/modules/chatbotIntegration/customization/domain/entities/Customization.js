'use strict';

class Customization {
  constructor({
    id = null,
    botId,
    headerTitle = 'Chat Assistant',
    headerSubtitle = 'Online',
    placeholder = 'Type your message...',
    primaryColor = '#3b82f6',
    backgroundColor = '#ffffff',
    headerBackground = '#ffffff',
    userMessageColor = '#3b82f6',
    botMessageColor = '#f1f5f9',
    messageBackgroundColor = '#f1f5f9',
    textColor = '#1e293b',
    fontFamily = 'Inter, sans-serif',
    borderRadius = 8,
    chatCustomCSS = '',
    useChatCustomCSS = false,
    buttonBackground = 'linear-gradient(135deg, #9b5de5, #f15bb5)',
    buttonColor = '#ffffff',
    buttonSize = '56',
    buttonBorderRadius = '50',
    buttonPosition = 'bottom-right',
    buttonBottom = '20',
    buttonRight = '20',
    buttonLeft = '20',
    buttonCustomCSS = '',
    useButtonCustomCSS = false,
    buttonText = 'Chat with us',
    buttonShowText = false,
    buttonTextPosition = 'left',
    buttonIcon = 'chat',
    buttonIconType = 'default',
    buttonCustomIcon = null,
    buttonIconSize = '24',
    buttonAnimation = 'none',
    buttonHoverAnimation = 'scale',
    buttonPulse = false,
    buttonShadow = '0 4px 10px rgba(0,0,0,0.3)',
    buttonTextColor = '#1e293b',
    buttonTextSize = '14',
    buttonPadding = '12',
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.botId = botId;
    this.headerTitle = headerTitle;
    this.headerSubtitle = headerSubtitle;
    this.placeholder = placeholder;
    this.primaryColor = primaryColor;
    this.backgroundColor = backgroundColor;
    this.headerBackground = headerBackground;
    this.userMessageColor = userMessageColor;
    this.botMessageColor = botMessageColor;
    this.messageBackgroundColor = messageBackgroundColor;
    this.textColor = textColor;
    this.fontFamily = fontFamily;
    this.borderRadius = borderRadius;
    this.chatCustomCSS = chatCustomCSS;
    this.useChatCustomCSS = useChatCustomCSS;
    this.buttonBackground = buttonBackground;
    this.buttonColor = buttonColor;
    this.buttonSize = buttonSize;
    this.buttonBorderRadius = buttonBorderRadius;
    this.buttonPosition = buttonPosition;
    this.buttonBottom = buttonBottom;
    this.buttonRight = buttonRight;
    this.buttonLeft = buttonLeft;
    this.buttonCustomCSS = buttonCustomCSS;
    this.useButtonCustomCSS = useButtonCustomCSS;
    this.buttonText = buttonText;
    this.buttonShowText = buttonShowText;
    this.buttonTextPosition = buttonTextPosition;
    this.buttonIcon = buttonIcon;
    this.buttonIconType = buttonIconType;
    this.buttonCustomIcon = buttonCustomIcon;
    this.buttonIconSize = buttonIconSize;
    this.buttonAnimation = buttonAnimation;
    this.buttonHoverAnimation = buttonHoverAnimation;
    this.buttonPulse = buttonPulse;
    this.buttonShadow = buttonShadow;
    this.buttonTextColor = buttonTextColor;
    this.buttonTextSize = buttonTextSize;
    this.buttonPadding = buttonPadding;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromPersistence(doc) {
    if (!doc) return null;
    return new Customization({
      id: doc._id,
      botId: doc.botId,
      headerTitle: doc.headerTitle,
      headerSubtitle: doc.headerSubtitle,
      placeholder: doc.placeholder,
      primaryColor: doc.primaryColor,
      backgroundColor: doc.backgroundColor,
      headerBackground: doc.headerBackground,
      userMessageColor: doc.userMessageColor,
      botMessageColor: doc.botMessageColor,
      messageBackgroundColor: doc.messageBackgroundColor,
      textColor: doc.textColor,
      fontFamily: doc.fontFamily,
      borderRadius: doc.borderRadius,
      chatCustomCSS: doc.chatCustomCSS,
      useChatCustomCSS: doc.useChatCustomCSS,
      buttonBackground: doc.buttonBackground,
      buttonColor: doc.buttonColor,
      buttonSize: doc.buttonSize,
      buttonBorderRadius: doc.buttonBorderRadius,
      buttonPosition: doc.buttonPosition,
      buttonBottom: doc.buttonBottom,
      buttonRight: doc.buttonRight,
      buttonLeft: doc.buttonLeft,
      buttonCustomCSS: doc.buttonCustomCSS,
      useButtonCustomCSS: doc.useButtonCustomCSS,
      buttonText: doc.buttonText,
      buttonShowText: doc.buttonShowText,
      buttonTextPosition: doc.buttonTextPosition,
      buttonIcon: doc.buttonIcon,
      buttonIconType: doc.buttonIconType,
      buttonCustomIcon: doc.buttonCustomIcon,
      buttonIconSize: doc.buttonIconSize,
      buttonAnimation: doc.buttonAnimation,
      buttonHoverAnimation: doc.buttonHoverAnimation,
      buttonPulse: doc.buttonPulse,
      buttonShadow: doc.buttonShadow,
      buttonTextColor: doc.buttonTextColor,
      buttonTextSize: doc.buttonTextSize,
      buttonPadding: doc.buttonPadding,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  toPersistence() {
    return {
      botId: this.botId,
      headerTitle: this.headerTitle,
      headerSubtitle: this.headerSubtitle,
      placeholder: this.placeholder,
      primaryColor: this.primaryColor,
      backgroundColor: this.backgroundColor,
      headerBackground: this.headerBackground,
      userMessageColor: this.userMessageColor,
      botMessageColor: this.botMessageColor,
      messageBackgroundColor: this.messageBackgroundColor,
      textColor: this.textColor,
      fontFamily: this.fontFamily,
      borderRadius: this.borderRadius,
      chatCustomCSS: this.chatCustomCSS,
      useChatCustomCSS: this.useChatCustomCSS,
      buttonBackground: this.buttonBackground,
      buttonColor: this.buttonColor,
      buttonSize: this.buttonSize,
      buttonBorderRadius: this.buttonBorderRadius,
      buttonPosition: this.buttonPosition,
      buttonBottom: this.buttonBottom,
      buttonRight: this.buttonRight,
      buttonLeft: this.buttonLeft,
      buttonCustomCSS: this.buttonCustomCSS,
      useButtonCustomCSS: this.useButtonCustomCSS,
      buttonText: this.buttonText,
      buttonShowText: this.buttonShowText,
      buttonTextPosition: this.buttonTextPosition,
      buttonIcon: this.buttonIcon,
      buttonIconType: this.buttonIconType,
      buttonCustomIcon: this.buttonCustomIcon,
      buttonIconSize: this.buttonIconSize,
      buttonAnimation: this.buttonAnimation,
      buttonHoverAnimation: this.buttonHoverAnimation,
      buttonPulse: this.buttonPulse,
      buttonShadow: this.buttonShadow,
      buttonTextColor: this.buttonTextColor,
      buttonTextSize: this.buttonTextSize,
      buttonPadding: this.buttonPadding,
    };
  }
}

module.exports = Customization;
