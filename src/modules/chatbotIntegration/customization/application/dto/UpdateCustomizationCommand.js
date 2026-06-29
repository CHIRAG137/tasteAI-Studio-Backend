'use strict';

class UpdateCustomizationCommand {
  constructor({
    botId,
    userId,
    headerTitle,
    headerSubtitle,
    placeholder,
    primaryColor,
    backgroundColor,
    headerBackground,
    userMessageColor,
    botMessageColor,
    messageBackgroundColor,
    textColor,
    fontFamily,
    borderRadius,
    chatCustomCSS,
    useChatCustomCSS,
    buttonBackground,
    buttonColor,
    buttonSize,
    buttonBorderRadius,
    buttonPosition,
    buttonBottom,
    buttonRight,
    buttonLeft,
    buttonCustomCSS,
    useButtonCustomCSS,
    buttonText,
    buttonShowText,
    buttonTextPosition,
    buttonIcon,
    buttonIconType,
    buttonCustomIcon,
    buttonIconSize,
    buttonAnimation,
    buttonHoverAnimation,
    buttonPulse,
    buttonShadow,
    buttonTextColor,
    buttonTextSize,
    buttonPadding,
  }) {
    this.botId = botId;
    this.userId = userId;
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
    this.validate();
  }

  validate() {
    if (!this.botId) {
      throw new Error('Bot id is required');
    }
    if (!this.userId) {
      throw new Error('User id is required');
    }
    if (this.buttonPosition && !['bottom-right', 'bottom-left'].includes(this.buttonPosition)) {
      throw new Error('buttonPosition must be "bottom-right" or "bottom-left"');
    }
    if (
      this.buttonTextPosition &&
      !['left', 'right', 'top', 'bottom'].includes(this.buttonTextPosition)
    ) {
      throw new Error('buttonTextPosition must be "left", "right", "top", or "bottom"');
    }
    if (
      this.buttonIconType &&
      !['default', 'custom', 'emoji', 'none'].includes(this.buttonIconType)
    ) {
      throw new Error('buttonIconType must be "default", "custom", "emoji", or "none"');
    }
  }

  toUpdatePayload() {
    const payload = {};
    const fields = [
      'headerTitle',
      'headerSubtitle',
      'placeholder',
      'primaryColor',
      'backgroundColor',
      'headerBackground',
      'userMessageColor',
      'botMessageColor',
      'messageBackgroundColor',
      'textColor',
      'fontFamily',
      'borderRadius',
      'chatCustomCSS',
      'useChatCustomCSS',
      'buttonBackground',
      'buttonColor',
      'buttonSize',
      'buttonBorderRadius',
      'buttonPosition',
      'buttonBottom',
      'buttonRight',
      'buttonLeft',
      'buttonCustomCSS',
      'useButtonCustomCSS',
      'buttonText',
      'buttonShowText',
      'buttonTextPosition',
      'buttonIcon',
      'buttonIconType',
      'buttonCustomIcon',
      'buttonIconSize',
      'buttonAnimation',
      'buttonHoverAnimation',
      'buttonPulse',
      'buttonShadow',
      'buttonTextColor',
      'buttonTextSize',
      'buttonPadding',
    ];
    for (const field of fields) {
      if (this[field] !== undefined) {
        payload[field] = this[field];
      }
    }
    return payload;
  }
}

module.exports = UpdateCustomizationCommand;
