'use strict';

const CustomizationResponseMapper = {
  toResponse(customization) {
    return {
      bot_id: customization.botId,
      header_title: customization.headerTitle,
      header_subtitle: customization.headerSubtitle,
      placeholder: customization.placeholder,
      primary_color: customization.primaryColor,
      background_color: customization.backgroundColor,
      header_background: customization.headerBackground,
      user_message_color: customization.userMessageColor,
      bot_message_color: customization.botMessageColor,
      message_background_color: customization.messageBackgroundColor,
      text_color: customization.textColor,
      font_family: customization.fontFamily,
      border_radius: customization.borderRadius,
      chat_custom_css: customization.chatCustomCSS,
      use_chat_custom_css: customization.useChatCustomCSS,

      button_background: customization.buttonBackground,
      button_color: customization.buttonColor,
      button_size: customization.buttonSize,
      button_border_radius: customization.buttonBorderRadius,
      button_position: customization.buttonPosition,
      button_bottom: customization.buttonBottom,
      button_right: customization.buttonRight,
      button_left: customization.buttonLeft,
      button_custom_css: customization.buttonCustomCSS,
      use_button_custom_css: customization.useButtonCustomCSS,
      button_text: customization.buttonText,
      button_show_text: customization.buttonShowText,
      button_text_position: customization.buttonTextPosition,
      button_icon: customization.buttonIcon,
      button_icon_type: customization.buttonIconType,
      button_custom_icon: customization.buttonCustomIcon,
      button_icon_size: customization.buttonIconSize,
      button_animation: customization.buttonAnimation,
      button_hover_animation: customization.buttonHoverAnimation,
      button_pulse: customization.buttonPulse,
      button_shadow: customization.buttonShadow,
      button_text_color: customization.buttonTextColor,
      button_text_size: customization.buttonTextSize,
      button_padding: customization.buttonPadding,

      created_at: customization.createdAt,
      updated_at: customization.updatedAt,
    };
  },
};

module.exports = CustomizationResponseMapper;
