const fetch = require('node-fetch');
const { config } = require('./config');

/**
 * Gửi tin nhắn qua Telegram Bot API
 * @param {string} message - Nội dung tin nhắn (Markdown format)
 * @returns {Promise<boolean>}
 */
async function sendTelegramMessage(message) {
    if (!config.telegramBotToken || !config.telegramChatId) {
        console.log('📧 Telegram chưa cấu hình. Chỉ hiển thị trên console.');
        return false;
    }

    const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.telegramChatId,
                text: message,
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
            }),
        });

        const data = await response.json();

        if (data.ok) {
            console.log('✅ Đã gửi thông báo Telegram thành công!');
            return true;
        } else {
            console.error(`❌ Telegram API Error: ${data.description}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Lỗi gửi Telegram: ${error.message}`);
        return false;
    }
}

/**
 * Format kết quả thành message đẹp cho Telegram
 * @param {object} result - Kết quả từ scraper
 * @returns {string}
 */
function formatOutageMessage(result) {
    const { hasOutage, outages, period } = result;
    const customerCode = config.customerCode;

    if (!hasOutage) {
        return [
            '✅ *KHÔNG CÓ LỊCH CÚP ĐIỆN*',
            '',
            `📋 Mã KH: \`${customerCode}\``,
            `📅 Từ: ${period.from} → ${period.to}`,
            '',
            '🎉 Không có lịch ngừng giảm cung cấp điện trong thời gian trên.',
        ].join('\n');
    }

    const lines = [
        '⚡ *THÔNG BÁO LỊCH CÚP ĐIỆN* ⚡',
        '',
        `📋 Mã KH: \`${customerCode}\``,
        `📅 Giai đoạn: ${period.from} → ${period.to}`,
        `📊 Số lần cúp điện: *${outages.length}*`,
        '',
        '━━━━━━━━━━━━━━━━━━━━',
    ];

    outages.forEach((outage, index) => {
        lines.push('');
        lines.push(`*🔸 Lần ${index + 1}:*`);
        if (outage.date) lines.push(`   📅 Ngày: ${outage.date}`);
        if (outage.time) lines.push(`   ⏰ Thời gian: ${outage.time}`);
        if (outage.area) lines.push(`   📍 Khu vực: ${outage.area}`);
        if (outage.reason) lines.push(`   📝 Lý do: ${outage.reason}`);
        if (outage.status) lines.push(`   🔄 Trạng thái: ${outage.status}`);
        lines.push('━━━━━━━━━━━━━━━━━━━━');
    });

    lines.push('');
    lines.push('⚠️ _Hãy chuẩn bị sạc pin và nước dự trữ!_');

    return lines.join('\n');
}

/**
 * Gửi thông báo kết quả kiểm tra lịch cúp điện
 * @param {object} result - Kết quả từ scraper
 * @param {boolean} alwaysNotify - Luôn gửi thông báo (kể cả khi không cúp điện)
 */
async function notifyOutageResult(result, alwaysNotify = false) {
    const message = formatOutageMessage(result);

    // In ra console luôn
    console.log('\n' + message.replace(/\*/g, '').replace(/_/g, '') + '\n');

    // Gửi Telegram chỉ khi có cúp điện hoặc alwaysNotify = true
    if (result.hasOutage || alwaysNotify) {
        await sendTelegramMessage(message);
    } else {
        console.log('ℹ️  Không có lịch cúp điện → bỏ qua gửi Telegram.');
    }
}

module.exports = { sendTelegramMessage, formatOutageMessage, notifyOutageResult };
