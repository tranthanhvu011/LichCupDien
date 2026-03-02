const fetch = require('node-fetch');

const GOLD_API = 'https://vang.today/api/prices';

/**
 * Fetch giá vàng từ vang.today API (miễn phí, không cần API key)
 * @returns {Promise<object>}
 */
async function fetchGoldPrices() {
    console.log('🥇 Đang lấy giá vàng...');

    try {
        const response = await fetch(GOLD_API, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.prices) {
            throw new Error('API response không hợp lệ');
        }

        // Trích xuất giá chính
        const sjc = data.prices['SJL1L10'];     // SJC 9999 (miếng)
        const sjcRing = data.prices['SJ9999'];   // SJC nhẫn
        const pnj24k = data.prices['PQHN24NTT']; // PNJ 24K
        const pnj999 = data.prices['PQHNVM'];    // PNJ 999 (Hà Nội)
        const doji = data.prices['DOJINHTV'];    // DOJI
        const world = data.prices['XAUUSD'];     // Thế giới

        return {
            success: true,
            date: data.date,
            time: data.time,
            prices: {
                sjc: sjc ? { name: 'SJC 9999 (miếng)', buy: sjc.buy, sell: sjc.sell, change: sjc.change_buy } : null,
                sjcRing: sjcRing ? { name: 'SJC Nhẫn', buy: sjcRing.buy, sell: sjcRing.sell, change: sjcRing.change_buy } : null,
                pnj24k: pnj24k ? { name: 'PNJ 24K', buy: pnj24k.buy, sell: pnj24k.sell, change: pnj24k.change_buy } : null,
                pnj999: pnj999 ? { name: 'PNJ 999', buy: pnj999.buy, sell: pnj999.sell, change: pnj999.change_buy } : null,
                doji: doji ? { name: 'DOJI', buy: doji.buy, sell: doji.sell, change: doji.change_buy } : null,
                world: world ? { name: 'Thế giới (XAU/USD)', price: world.buy, change: world.change_buy } : null,
            },
            raw: data.prices,
        };
    } catch (error) {
        console.error(`❌ Lỗi lấy giá vàng: ${error.message}`);
        throw error;
    }
}

/**
 * Format giá VND đẹp
 */
function formatVND(amount) {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

/**
 * Format message Telegram cho giá vàng
 */
function formatGoldMessage(result) {
    const { date, time, prices } = result;

    const lines = [
        '🥇 *GIÁ VÀNG HÔM NAY* 🥇',
        '',
        `📅 Ngày: ${date}`,
        `⏰ Cập nhật: ${time}`,
        '',
        '━━━━━━━━━━━━━━━━━━━━',
    ];

    if (prices.sjc) {
        const arrow = prices.sjc.change > 0 ? '📈' : prices.sjc.change < 0 ? '📉' : '➡️';
        lines.push(`*${prices.sjc.name}*`);
        lines.push(`   Mua: ${formatVND(prices.sjc.buy)}`);
        lines.push(`   Bán: ${formatVND(prices.sjc.sell)}`);
        lines.push(`   ${arrow} Thay đổi: ${prices.sjc.change > 0 ? '+' : ''}${formatVND(prices.sjc.change)}`);
        lines.push('');
    }

    if (prices.sjcRing) {
        lines.push(`*${prices.sjcRing.name}*`);
        lines.push(`   Mua: ${formatVND(prices.sjcRing.buy)}`);
        lines.push(`   Bán: ${formatVND(prices.sjcRing.sell)}`);
        lines.push('');
    }

    if (prices.pnj24k) {
        lines.push(`*${prices.pnj24k.name}*`);
        lines.push(`   Mua: ${formatVND(prices.pnj24k.buy)}`);
        lines.push(`   Bán: ${formatVND(prices.pnj24k.sell)}`);
        lines.push('');
    }

    if (prices.pnj999) {
        lines.push(`*${prices.pnj999.name}*`);
        lines.push(`   Mua: ${formatVND(prices.pnj999.buy)}`);
        lines.push(`   Bán: ${formatVND(prices.pnj999.sell)}`);
        lines.push('');
    }

    if (prices.doji) {
        lines.push(`*${prices.doji.name}*`);
        lines.push(`   Mua: ${formatVND(prices.doji.buy)}`);
        lines.push(`   Bán: ${formatVND(prices.doji.sell)}`);
        lines.push('');
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━');
    if (prices.world) {
        lines.push(`🌍 *${prices.world.name}*: $${prices.world.price}`);
    }

    return lines.join('\n');
}

module.exports = { fetchGoldPrices, formatGoldMessage, formatVND };
