'use strict';

const GetCustomizationQuery = require('../../application/dto/GetCustomizationQuery');
const UpdateCustomizationCommand = require('../../application/dto/UpdateCustomizationCommand');
const CustomizationResponseMapper = require('../mappers/CustomizationResponseMapper');

class CustomizationController {
  constructor({ getCustomizationUseCase, updateCustomizationUseCase, responseBuilder, logger }) {
    this.getCustomizationUseCase = getCustomizationUseCase;
    this.updateCustomizationUseCase = updateCustomizationUseCase;
    this.responseBuilder = responseBuilder;
    this.logger = logger;
  }

  getCustomization = async (req, res, _next) => {
    try {
      const query = new GetCustomizationQuery({
        botId: req.params.botId,
        userId: req.user?.id,
      });

      const customization = await this.getCustomizationUseCase.execute(query);

      return this.responseBuilder.success(
        res,
        CustomizationResponseMapper.toResponse(customization),
        'Customization fetched successfully',
      );
    } catch (error) {
      if (error.statusCode === 404) {
        return this.responseBuilder.notFound(res, null, error.message);
      }
      this.logger.error('Get customization failed', { error: error.message, stack: error.stack });
      return this.responseBuilder.internalError(res, null, error.message);
    }
  };

  updateCustomization = async (req, res, _next) => {
    try {
      const command = new UpdateCustomizationCommand({
        botId: req.params.botId,
        userId: req.user?.id,
        headerTitle: req.body.header_title ?? req.body.headerTitle,
        headerSubtitle: req.body.header_subtitle ?? req.body.headerSubtitle,
        placeholder: req.body.placeholder,
        primaryColor: req.body.primary_color ?? req.body.primaryColor,
        backgroundColor: req.body.background_color ?? req.body.backgroundColor,
        headerBackground: req.body.header_background ?? req.body.headerBackground,
        userMessageColor: req.body.user_message_color ?? req.body.userMessageColor,
        botMessageColor: req.body.bot_message_color ?? req.body.botMessageColor,
        messageBackgroundColor:
          req.body.message_background_color ?? req.body.messageBackgroundColor,
        textColor: req.body.text_color ?? req.body.textColor,
        fontFamily: req.body.font_family ?? req.body.fontFamily,
        borderRadius: req.body.border_radius ?? req.body.borderRadius,
        chatCustomCSS: req.body.chat_custom_css ?? req.body.chatCustomCSS,
        useChatCustomCSS: req.body.use_chat_custom_css ?? req.body.useChatCustomCSS,
        buttonBackground: req.body.button_background ?? req.body.buttonBackground,
        buttonColor: req.body.button_color ?? req.body.buttonColor,
        buttonSize: req.body.button_size ?? req.body.buttonSize,
        buttonBorderRadius: req.body.button_border_radius ?? req.body.buttonBorderRadius,
        buttonPosition: req.body.button_position ?? req.body.buttonPosition,
        buttonBottom: req.body.button_bottom ?? req.body.buttonBottom,
        buttonRight: req.body.button_right ?? req.body.buttonRight,
        buttonLeft: req.body.button_left ?? req.body.buttonLeft,
        buttonCustomCSS: req.body.button_custom_css ?? req.body.buttonCustomCSS,
        useButtonCustomCSS: req.body.use_button_custom_css ?? req.body.useButtonCustomCSS,
        buttonText: req.body.button_text ?? req.body.buttonText,
        buttonShowText: req.body.button_show_text ?? req.body.buttonShowText,
        buttonTextPosition: req.body.button_text_position ?? req.body.buttonTextPosition,
        buttonIcon: req.body.button_icon ?? req.body.buttonIcon,
        buttonIconType: req.body.button_icon_type ?? req.body.buttonIconType,
        buttonCustomIcon: req.body.button_custom_icon ?? req.body.buttonCustomIcon,
        buttonIconSize: req.body.button_icon_size ?? req.body.buttonIconSize,
        buttonAnimation: req.body.button_animation ?? req.body.buttonAnimation,
        buttonHoverAnimation: req.body.button_hover_animation ?? req.body.buttonHoverAnimation,
        buttonPulse: req.body.button_pulse ?? req.body.buttonPulse,
        buttonShadow: req.body.button_shadow ?? req.body.buttonShadow,
        buttonTextColor: req.body.button_text_color ?? req.body.buttonTextColor,
        buttonTextSize: req.body.button_text_size ?? req.body.buttonTextSize,
        buttonPadding: req.body.button_padding ?? req.body.buttonPadding,
      });

      const updated = await this.updateCustomizationUseCase.execute(command);

      return this.responseBuilder.success(
        res,
        CustomizationResponseMapper.toResponse(updated),
        'Customization updated successfully',
      );
    } catch (error) {
      if (error.statusCode === 404) {
        return this.responseBuilder.notFound(res, null, error.message);
      }
      if (error.statusCode === 403) {
        return this.responseBuilder.forbidden(res, null, error.message);
      }
      this.logger.error('Update customization failed', {
        error: error.message,
        stack: error.stack,
      });
      return this.responseBuilder.internalError(res, null, error.message);
    }
  };
}

module.exports = CustomizationController;
