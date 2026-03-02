const fetch = require('node-fetch');

// PNJ Gold Price API (từ pnj.com.vn)
const PNJ_API = 'https://edge-cf-api.pnj.io/ecom-frontend/v1/get-gold-price';

// Khu vực - mặc định Hồ Chí Minh
const ZONES = {
    HCM: '00',
    CAN_THO: '07',
    HA_NOI: '11',
    DA_NANG: '13',
    TAY_NGUYEN: '14',
    DONG_NAM_BO: '21',
};

/**
 * Fetch giá vàng từ PNJ API
 * @param {string} zone - Mã khu vực (default: HCM)
 * @returns {Promise<object>}
 */
async function fetchGoldPrices(zone) {
    const zoneCode = zone || ZONES.HCM;
    console.log('🥇 Đang lấy giá vàng PNJ...');

    try {
        const response = await fetch(`${PNJ_API}?zone=${zoneCode}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json',
                'Referer': 'https://www.pnj.com.vn/blog/gia-vang/',
                'Origin': 'https://www.pnj.com.vn',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.data) {
            throw new Error('API response không hợp lệ');
        }

        // Tìm Nhẫn Trơn 999 (masp: N24K)
        const nhan999 = data.data.find(item => item.masp === 'N24K');
        // Tìm Vàng miếng SJC
        const sjc = data.data.find(item => item.masp === 'SJC');

        return {
            success: true,
            updateDate: data.updateDate || new Date().toLocaleString('vi-VN'),
            region: data.chinhanh || 'HCM',
            nhan999: nhan999 ? {
                name: nhan999.tensp || 'Nhẫn Trơn PNJ 999.9',
                buy: nhan999.giamua * 10000, // API trả đơn vị 10.000đ
                sell: nhan999.giaban * 10000,
            } : null,
            sjc: sjc ? {
                name: sjc.tensp || 'Vàng miếng SJC 999.9',
                buy: sjc.giamua * 10000,
                sell: sjc.giaban * 10000,
            } : null,
            allProducts: data.data,
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
 * Format message Telegram cho giá vàng PNJ
 */
function formatGoldMessage(result) {
    const { updateDate, nhan999, sjc } = result;

    const lines = [
        '🥇 *GIÁ VÀNG PNJ HÔM NAY* 🥇',
        '',
        `⏰ Cập nhật: ${updateDate}`,
        '',
        '━━━━━━━━━━━━━━━━━━━━',
    ];

    if (nhan999) {
        lines.push(`💍 *${nhan999.name}*`);
        lines.push(`   Mua vào: ${formatVND(nhan999.buy)}`);
        lines.push(`   Bán ra:  ${formatVND(nhan999.sell)}`);
        lines.push('');
    }

    if (sjc) {
        lines.push(`🏅 *${sjc.name}*`);
        lines.push(`   Mua vào: ${formatVND(sjc.buy)}`);
        lines.push(`   Bán ra:  ${formatVND(sjc.sell)}`);
        lines.push('');
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('_Nguồn: pnj.com.vn_');

    return lines.join('\n');
}

module.exports = { fetchGoldPrices, formatGoldMessage, formatVND };
