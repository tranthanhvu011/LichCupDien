const cron = require('node-cron');
const { config, validateConfig } = require('./config');
const { fetchOutageSchedule } = require('./scraper');
const { notifyOutageResult, sendTelegramMessage } = require('./notifier');
const { fetchGoldPrices, formatGoldMessage } = require('./gold-scraper');
const { fetchCoffeePrices, formatCoffeeMessage } = require('./coffee-scraper');

/**
 * Chạy kiểm tra lịch cúp điện
 */
async function checkOutage(alwaysNotify = false) {
    const now = new Date();
    console.log(`\n${'='.repeat(50)}`);
    console.log(`⏰ [${now.toLocaleString('vi-VN')}] Kiểm tra lịch cúp điện...`);
    console.log('='.repeat(50));

    try {
        const result = await fetchOutageSchedule();
        await notifyOutageResult(result, alwaysNotify);
        return result;
    } catch (error) {
        console.error(`\n❌ Lỗi kiểm tra cúp điện: ${error.message}`);
        return null;
    }
}

/**
 * Lấy và gửi giá vàng
 */
async function checkGold() {
    console.log(`\n${'='.repeat(50)}`);
    console.log('🥇 Lấy giá vàng...');
    console.log('='.repeat(50));

    try {
        const result = await fetchGoldPrices();
        const message = formatGoldMessage(result);

        // In ra console
        console.log('\n' + message.replace(/\*/g, '').replace(/_/g, '') + '\n');

        // Gửi Telegram
        if (config.telegramBotToken && config.telegramChatId) {
            await sendTelegramMessage(message);
        }
        return result;
    } catch (error) {
        console.error(`❌ Lỗi lấy giá vàng: ${error.message}`);
        return null;
    }
}

/**
 * Lấy và gửi giá cà phê
 */
async function checkCoffee() {
    console.log(`\n${'='.repeat(50)}`);
    console.log('☕ Lấy giá cà phê...');
    console.log('='.repeat(50));

    try {
        const result = await fetchCoffeePrices();
        const message = formatCoffeeMessage(result);

        // In ra console
        console.log('\n' + message.replace(/\*/g, '').replace(/_/g, '') + '\n');

        // Gửi Telegram
        if (config.telegramBotToken && config.telegramChatId) {
            await sendTelegramMessage(message);
        }
        return result;
    } catch (error) {
        console.error(`❌ Lỗi lấy giá cà phê: ${error.message}`);
        return null;
    }
}

/**
 * Chạy tất cả checks
 */
async function checkAll(alwaysNotify = false) {
    await checkOutage(alwaysNotify);
    await checkGold();
    await checkCoffee();
}

/**
 * Chạy chế độ scheduler (cron job)
 */
function startScheduler() {
    console.log('🚀 Khởi động Daily Monitor...');
    console.log(`📋 Mã KH: ${config.customerCode}`);
    console.log(`⏰ Lịch check: ${config.checkCron}`);
    console.log(`📅 Check trước: ${config.daysAhead} ngày`);
    console.log('📊 Modules: Cúp điện + Giá vàng + Giá cà phê');

    const hasTelegram = validateConfig();
    if (hasTelegram) {
        console.log('📱 Telegram: ĐÃ CẤU HÌNH ✅');
    }

    // Chạy check ngay khi start
    console.log('\n🔄 Chạy kiểm tra lần đầu...');
    checkAll(true);

    // Lập lịch chạy tự động
    if (cron.validate(config.checkCron)) {
        cron.schedule(config.checkCron, () => {
            checkAll(false);
        });
        console.log(`\n✅ Scheduler đã bật! Tự động check theo lịch: ${config.checkCron}`);
        console.log('   (Ctrl+C để dừng)\n');
    } else {
        console.error(`❌ Cron expression không hợp lệ: ${config.checkCron}`);
    }
}

// ========= MAIN =========
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
⚡ Daily Monitor - Cúp điện, Giá vàng, Giá cà phê

Cách dùng:
  node src/index.js              Chạy scheduler (tự động check hàng ngày)
  node src/index.js --check      Check tất cả 1 lần rồi thoát
  node src/index.js --gold       Chỉ lấy giá vàng
  node src/index.js --coffee     Chỉ lấy giá cà phê
  node src/index.js --outage     Chỉ check lịch cúp điện
  node src/index.js --help       Hiện hướng dẫn này
  `);
    process.exit(0);
}

if (args.includes('--check') || args.includes('-c')) {
    console.log('🔍 Chế độ: CHECK TẤT CẢ 1 LẦN\n');
    validateConfig();
    checkAll(true).then(() => {
        console.log('\n✅ Hoàn tất. Thoát.');
        process.exit(0);
    });
} else if (args.includes('--gold')) {
    console.log('🥇 Chế độ: CHỈ GIÁ VÀNG\n');
    validateConfig();
    checkGold().then(() => process.exit(0));
} else if (args.includes('--coffee')) {
    console.log('☕ Chế độ: CHỈ GIÁ CÀ PHÊ\n');
    validateConfig();
    checkCoffee().then(() => process.exit(0));
} else if (args.includes('--outage')) {
    console.log('⚡ Chế độ: CHỈ LỊCH CÚP ĐIỆN\n');
    validateConfig();
    checkOutage(true).then(() => process.exit(0));
} else {
    // Chế độ scheduler (chạy liên tục)
    startScheduler();
}
