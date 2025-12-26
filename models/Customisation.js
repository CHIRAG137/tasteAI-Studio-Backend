const mongoose = require('mongoose');

const customizationSchema = new mongoose.Schema(
  {
    botId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      unique: true,
    },

    // Chat window customization
    headerTitle: String,
    headerSubtitle: String,
    placeholder: String,
    primaryColor: String,
    backgroundColor: String,
    headerBackground: String,
    userMessageColor: String,
    botMessageColor: String,
    messageBackgroundColor: String,
    textColor: String,
    fontFamily: String,
    borderRadius: Number,
    chatCustomCSS: {
      type: String,
      default: '',
      maxlength: 50000,
    },
    useChatCustomCSS: {
      type: Boolean,
      default: false,
    },

    // Button customization
    buttonBackground: {
      type: String,
      default: 'linear-gradient(135deg, #9b5de5, #f15bb5)',
    },
    buttonColor: {
      type: String,
      default: '#ffffff',
    },
    buttonSize: {
      type: String,
      default: '56',
    },
    buttonBorderRadius: {
      type: String,
      default: '50',
    },
    buttonPosition: {
      type: String,
      enum: ['bottom-right', 'bottom-left'],
      default: 'bottom-right',
    },
    buttonBottom: {
      type: String,
      default: '20',
    },
    buttonRight: {
      type: String,
      default: '20',
    },
    buttonLeft: {
      type: String,
      default: '20',
    },
    buttonCustomCSS: {
      type: String,
      default: '',
      maxlength: 50000,
    },
    useButtonCustomCSS: {
      type: Boolean,
      default: false,
    },
    buttonText: {
      type: String,
      default: 'Chat with us',
    },
    buttonShowText: {
      type: Boolean,
      default: false,
    },
    buttonTextPosition: {
      type: String,
      enum: ['left', 'right', 'top', 'bottom'],
      default: 'left',
    },
    buttonIcon: {
      type: String,
      default: 'chat',
    },
    buttonIconType: {
      type: String,
      enum: ['default', 'custom', 'emoji', 'none'],
      default: 'default',
    },
    buttonCustomIcon: String,
    buttonIconSize: {
      type: String,
      default: '24',
    },
    buttonAnimation: {
      type: String,
      default: 'none',
    },
    buttonHoverAnimation: {
      type: String,
      default: 'scale',
    },
    buttonPulse: {
      type: Boolean,
      default: false,
    },
    buttonShadow: {
      type: String,
      default: '0 4px 10px rgba(0,0,0,0.3)',
    },
    buttonTextColor: {
      type: String,
      default: '#1e293b',
    },
    buttonTextSize: {
      type: String,
      default: '14',
    },
    buttonPadding: {
      type: String,
      default: '12',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customization', customizationSchema);