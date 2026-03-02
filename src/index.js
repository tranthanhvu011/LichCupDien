const cron = require('node-cron');
const { config, validateConfig } = require('./config');
const { fetchOutageSchedule } = require('./scraper');
const { notifyOutageResult, sendTelegramMessage } = require('./notifier');

/**
 * Chạy kiểm tra lịch cúp điện
 * @param {boolean} alwaysNotify - Luôn gửi thông báo (kể cả không cúp điện)
 */
async function checkOutage(alwaysNotify = false) {
    const now = new Date();
    console.log(`\n${'='.repeat(50)}`);
    console.log(`⏰ [${now.toLocaleString('vi-VN')}] Bắt đầu kiểm tra lịch cúp điện...`);
    console.log('='.repeat(50));

    try {
        const result = await fetchOutageSchedule();
        await notifyOutageResult(result, alwaysNotify);
        return result;
    } catch (error) {
        console.error(`\n❌ Lỗi kiểm tra: ${error.message}`);

        // Gửi thông báo lỗi qua Telegram
        if (config.telegramBotToken && config.telegramChatId) {
            await sendTelegramMessage(
                `❌ *LỖI KIỂM TRA LỊCH CÚP ĐIỆN*\n\n` +
                `Mã KH: \`${config.customerCode}\`\n` +
                `Lỗi: ${error.message}\n\n` +
                `_Vui lòng kiểm tra lại hệ thống._`
            );
        }
        return null;
    }
}

/**
 * Chạy chế độ scheduler (cron job)
 */
function startScheduler() {
    console.log('🚀 Khởi động Power Outage Monitor...');
    console.log(`📋 Mã KH: ${config.customerCode}`);
    console.log(`⏰ Lịch check: ${config.checkCron}`);
    console.log(`📅 Check trước: ${config.daysAhead} ngày`);

    const hasTelegram = validateConfig();
    if (hasTelegram) {
        console.log('📱 Telegram: ĐÃ CẤU HÌNH ✅');
    }

    // Chạy check ngay khi start
    console.log('\n🔄 Chạy kiểm tra lần đầu...');
    checkOutage(true);

    // Lập lịch chạy tự động
    if (cron.validate(config.checkCron)) {
        cron.schedule(config.checkCron, () => {
            checkOutage(false); // Chỉ thông báo khi có cúp điện
        });
        console.log(`\n✅ Scheduler đã bật! Tự động check theo lịch: ${config.checkCron}`);
        console.log('   (Ctrl+C để dừng)\n');
    } else {
        console.error(`❌ Cron expression không hợp lệ: ${config.checkCron}`);
    }
}

// ========= MAIN =========
const args = process.argv.slice(2);

if (args.includes('--check') || args.includes('-c')) {
    // Chế độ check 1 lần rồi thoát
    console.log('🔍 Chế độ: CHECK 1 LẦN');
    validateConfig();
    checkOutage(true).then(() => {
        console.log('\n✅ Hoàn tất. Thoát.');
        process.exit(0);
    });
} else {
    // Chế độ scheduler (chạy liên tục)
    startScheduler();
}
