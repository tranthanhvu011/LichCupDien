require('dotenv').config();

const config = {
  // Mã khách hàng EVNSPC
  customerCode: process.env.CUSTOMER_CODE || 'PK11000109647',

  // Telegram Bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',

  // Lịch check - mặc định 7:00 sáng mỗi ngày
  checkCron: process.env.CHECK_INTERVAL_CRON || '0 7 * * *',

  // Số ngày phía trước cần check
  daysAhead: parseInt(process.env.DAYS_AHEAD, 10) || 7,

  // EVNSPC API
  evnspcBaseUrl: 'https://cskh.evnspc.vn/TraCuu/GetThongTinLichNgungGiamCungCapDien',
};

/**
 * Validate required config
 */
function validateConfig() {
  const missing = [];
  if (!config.telegramBotToken) missing.push('TELEGRAM_BOT_TOKEN');
  if (!config.telegramChatId) missing.push('TELEGRAM_CHAT_ID');

  if (missing.length > 0) {
    console.warn(`⚠️  Thiếu config: ${missing.join(', ')}`);
    console.warn('   → Telegram notification sẽ bị tắt. Chỉ hiển thị trên console.');
    return false;
  }
  return true;
}

module.exports = { config, validateConfig };
