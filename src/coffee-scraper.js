const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Các nguồn giá cà phê theo tỉnh
const COFFEE_SOURCES = [
    { province: 'Đắk Lắk', url: 'https://chocaphe.vn/gia-ca-phe-dak-lak.cfx' },
    { province: 'Gia Lai', url: 'https://chocaphe.vn/gia-ca-phe-gia-lai.cfx' },
    { province: 'Lâm Đồng', url: 'https://chocaphe.vn/gia-ca-phe-lam-dong.cfx' },
    { province: 'Đắk Nông', url: 'https://chocaphe.vn/gia-ca-phe-dak-nong.cfx' },
];

// Trang giá tổng hợp
const COFFEE_MAIN_URL = 'https://chocaphe.vn/gia-ca-phe-hom-nay';

/**
 * Fetch giá cà phê Việt Nam từ chocaphe.vn
 * Lấy giá từ meta tags và title (đáng tin cậy, không bị chặn)
 */
async function fetchCoffeePrices() {
    console.log('☕ Đang lấy giá cà phê...');

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9',
    };

    try {
        const prices = [];

        // Lấy giá theo từng tỉnh
        const fetches = COFFEE_SOURCES.map(async (source) => {
            try {
                const response = await fetch(source.url, { headers });
                if (!response.ok) return null;
                const html = await response.text();
                const $ = cheerio.load(html);

                // Lấy giá từ OG title / meta description
                const title = $('title').text() || '';
                const ogDesc = $('meta[property="og:description"]').attr('content') || '';
                const ogTitle = $('meta[property="og:title"]').attr('content') || '';
                const fullText = title + ' ' + ogDesc + ' ' + ogTitle;

                // Tìm giá (format: XX,XXX hoặc XXX,XXX)
                const priceMatch = fullText.match(/(\d{2,3}[.,]\d{3})\s*(?:đ|VND|đồng)/);
                if (priceMatch) {
                    return {
                        province: source.province,
                        price: priceMatch[1],
                    };
                }

                // Tìm giá từ body text
                const bodyText = $('body').text();
                const bodyMatch = bodyText.match(new RegExp(source.province + '[^\\d]*?(\\d{2,3}[.,]\\d{3})'));
                if (bodyMatch) {
                    return {
                        province: source.province,
                        price: bodyMatch[1],
                    };
                }

                return null;
            } catch (e) {
                return null;
            }
        });

        const results = await Promise.all(fetches);
        results.forEach(r => { if (r) prices.push(r); });

        // Lấy giá trung bình từ trang chính
        let averagePrice = null;
        try {
            const mainResponse = await fetch(COFFEE_MAIN_URL, { headers });
            if (mainResponse.ok) {
                const mainHtml = await mainResponse.text();
                const $main = cheerio.load(mainHtml);
                const mainTitle = $main('title').text();
                const mainOg = $main('meta[property="og:description"]').attr('content') || '';
                const mainOgTitle = $main('meta[property="og:title"]').attr('content') || '';
                const allText = mainTitle + ' ' + mainOg + ' ' + mainOgTitle;

                const avgMatch = allText.match(/(?:trung bình|bình quân)[:\s]*(\d{2,3}[.,]\d{3})/i);
                if (avgMatch) {
                    averagePrice = avgMatch[1];
                } else {
                    const simpleMatch = allText.match(/(\d{2,3}[.,]\d{3})\s*(?:đ|VND)/);
                    if (simpleMatch) averagePrice = simpleMatch[1];
                }
            }
        } catch (e) { /* ignore */ }

        // Nếu không lấy được giá theo tỉnh, dùng giá trung bình
        if (prices.length === 0 && !averagePrice) {
            throw new Error('Không thể lấy giá cà phê từ bất kỳ nguồn nào');
        }

        const today = new Date().toLocaleDateString('vi-VN');
        return {
            success: true,
            date: today,
            averagePrice: averagePrice || (prices.length > 0 ? prices[0].price : 'N/A'),
            prices,
            unit: 'đ/kg',
        };
    } catch (error) {
        console.error(`❌ Lỗi lấy giá cà phê: ${error.message}`);
        throw error;
    }
}

/**
 * Format message Telegram cho giá cà phê
 */
function formatCoffeeMessage(result) {
    const { date, averagePrice, prices, unit } = result;

    const lines = [
        '☕ *GIÁ CÀ PHÊ HÔM NAY* ☕',
        '',
        `📅 Ngày: ${date}`,
        '',
        '━━━━━━━━━━━━━━━━━━━━',
    ];

    if (averagePrice && averagePrice !== 'N/A') {
        lines.push(`📊 *Giá trung bình: ${averagePrice} ${unit}*`);
        lines.push('');
    }

    if (prices.length > 0) {
        lines.push('*Giá theo khu vực (nhân xô):*');
        for (const p of prices) {
            lines.push(`   📍 ${p.province}: ${p.price} ${unit}`);
        }
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('_Nguồn: chocaphe.vn_');

    return lines.join('\n');
}

module.exports = { fetchCoffeePrices, formatCoffeeMessage };
