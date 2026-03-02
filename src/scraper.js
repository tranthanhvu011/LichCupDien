const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { config } = require('./config');

/**
 * Format date sang DD-MM-YYYY
 */
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

/**
 * Fetch lịch cúp điện từ EVNSPC
 * @param {string} customerCode - Mã khách hàng (default từ config)
 * @param {number} daysAhead - Số ngày phía trước cần check
 * @returns {Promise<{hasOutage: boolean, outages: Array, rawMessage: string}>}
 */
async function fetchOutageSchedule(customerCode, daysAhead) {
    const maKH = customerCode || config.customerCode;
    const days = daysAhead || config.daysAhead;

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);

    const tuNgay = formatDate(today);
    const denNgay = formatDate(endDate);

    const url = `${config.evnspcBaseUrl}?tuNgay=${tuNgay}&denNgay=${denNgay}&maKH=${maKH}&ChucNang=MaKhachHang`;

    console.log(`🔍 Đang tra cứu lịch cúp điện...`);
    console.log(`   Mã KH: ${maKH}`);
    console.log(`   Từ: ${tuNgay} → Đến: ${denNgay}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html, */*; q=0.01',
                'Referer': 'https://cskh.evnspc.vn/TraCuu/LichNgungGiamCungCapDien',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        return parseOutageHtml(html, tuNgay, denNgay);
    } catch (error) {
        console.error(`❌ Lỗi khi fetch dữ liệu: ${error.message}`);
        throw error;
    }
}

/**
 * Parse HTML response từ EVNSPC
 * @param {string} html - Raw HTML from API
 * @param {string} tuNgay - Start date string
 * @param {string} denNgay - End date string
 * @returns {{hasOutage: boolean, outages: Array, rawMessage: string}}
 */
function parseOutageHtml(html, tuNgay, denNgay) {
    const $ = cheerio.load(html);
    const outages = [];

    // Kiểm tra nếu không có lịch cúp điện
    const noOutageText = $.text().trim();
    if (noOutageText.includes('Không có lịch ngừng giảm cung cấp điện')) {
        return {
            hasOutage: false,
            outages: [],
            rawMessage: noOutageText,
            period: { from: tuNgay, to: denNgay },
        };
    }

    // Parse các row trong bảng lịch cúp điện
    // EVNSPC trả về HTML table khi có dữ liệu
    $('table tr').each((index, row) => {
        if (index === 0) return; // skip header

        const cells = $(row).find('td');
        if (cells.length >= 4) {
            const outage = {
                stt: $(cells[0]).text().trim(),
                date: $(cells[1]).text().trim(),
                time: $(cells[2]).text().trim(),
                area: $(cells[3]).text().trim(),
                reason: cells.length >= 5 ? $(cells[4]).text().trim() : 'Bảo trì lưới điện',
                status: cells.length >= 6 ? $(cells[5]).text().trim() : '',
            };
            outages.push(outage);
        }
    });

    // Nếu không parse được table, thử parse text content
    if (outages.length === 0 && noOutageText.length > 0) {
        // Parse các div/section chứa thông tin
        $('.thongtin-lichngung, .content-lichngung, .panel-body, .card-body').each((_, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 10) {
                outages.push({
                    stt: '',
                    date: '',
                    time: '',
                    area: text,
                    reason: '',
                    status: '',
                });
            }
        });
    }

    return {
        hasOutage: outages.length > 0,
        outages,
        rawMessage: noOutageText,
        period: { from: tuNgay, to: denNgay },
    };
}

module.exports = { fetchOutageSchedule, formatDate };
