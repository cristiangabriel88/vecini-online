// Netlify-side re-export of the framework-independent Telegram client.
//
// The implementation now lives in src/shared/server so every webhook adapter
// (this Netlify function and the standalone Node service on the Pi) shares one
// client. This thin re-export preserves the historical import path.
export { verifyWebhookSecret, validateInitData } from '../../../src/shared/lib/telegramAuth';
export {
  telegram,
  type InlineKeyboardButton,
  type SendMessageOptions,
} from '../../../src/shared/server/telegramApi';
