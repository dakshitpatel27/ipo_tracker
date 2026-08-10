// Compliance and ITR-2 Export Integration Tests
const { calculateCharges } = require('../calculator');

function formatItrTaxRow(r) {
    const qty = parseFloat(r.shares) || 0;
    const buyPrice = parseFloat(r.price) || 0;
    const sellPrice = parseFloat(r.sellPrice) || 0;
    
    const costOfAcquisition = buyPrice * qty;
    const consideration = sellPrice * qty;
    
    const stampDuty = parseFloat(r.stampDuty) || 0;
    const brokerage = parseFloat(r.brokerage) || 0;
    const stt = parseFloat(r.stt) || 0;
    const exchange = parseFloat(r.exchangeCharges) || 0;
    const sebi = parseFloat(r.sebiFees) || 0;
    const dp = parseFloat(r.dpCharges) || 0;
    const gst = parseFloat(r.gst) || 0;
    
    const transferCharges = stampDuty + brokerage + stt + exchange + sebi + dp + gst;
    const netGain = consideration - costOfAcquisition - transferCharges;

    let isLongTerm = false;
    if (r.sellDate && r.listingDate) {
        const sellD = new Date(r.sellDate);
        const listD = new Date(r.listingDate);
        const diffTime = Math.abs(sellD - listD);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 365) isLongTerm = true;
    }
    
    const gainType = isLongTerm ? 'Long Term' : 'Short Term';
    const sectionCode = isLongTerm ? 'Section 112A' : 'Section 111A';

    return [
        `"${(r.ipoName || 'Unknown').replace(/"/g, '""')}"`,
        qty,
        r.listingDate ? r.listingDate.split('T')[0] : '—',
        costOfAcquisition.toFixed(2),
        r.sellDate ? r.sellDate.split('T')[0] : '—',
        consideration.toFixed(2),
        transferCharges.toFixed(2),
        netGain.toFixed(2),
        gainType,
        sectionCode
    ].join(',');
}

describe('Compliance & ITR Reporting Tests', () => {
    describe('ITR-Ready CSV Formatting Helper', () => {
        test('formats sold IPO record into valid CSV row with Section 111A (STCG)', () => {
            const record = {
                ipoName: 'Ola Electric',
                shares: 30,
                price: 76,
                sellPrice: 90,
                listingDate: '2024-08-01',
                sellDate: '2024-08-10',
                stampDuty: 0.11,
                brokerage: 20,
                stt: 2.7,
                exchangeCharges: 0.09,
                sebiFees: 0.01,
                dpCharges: 13.5,
                gst: 6.05
            };

            const csvRow = formatItrTaxRow(record);
            const columns = csvRow.split(',');

            expect(columns[0]).toBe('"Ola Electric"');
            expect(columns[1]).toBe('30');
            expect(columns[2]).toBe('2024-08-01');
            expect(columns[3]).toBe('2280.00'); // 30 * 76
            expect(columns[4]).toBe('2024-08-10');
            expect(columns[5]).toBe('2700.00'); // 30 * 90
            expect(columns[6]).toBe('42.46'); // total charges
            expect(columns[7]).toBe('377.54'); // 2700 - 2280 - 42.46 = 377.54
            expect(columns[8]).toBe('Short Term');
            expect(columns[9]).toBe('Section 111A');
        });

        test('formats sold IPO record into valid CSV row with Section 112A (LTCG)', () => {
            const record = {
                ipoName: 'TCS',
                shares: 10,
                price: 3000,
                sellPrice: 4200,
                listingDate: '2023-01-01',
                sellDate: '2024-06-01', // >365 days
                stampDuty: 1.5,
                brokerage: 20,
                stt: 42,
                exchangeCharges: 1.45,
                sebiFees: 0.04,
                dpCharges: 13.5,
                gst: 6.29
            };

            const csvRow = formatItrTaxRow(record);
            const columns = csvRow.split(',');

            expect(columns[8]).toBe('Long Term');
            expect(columns[9]).toBe('Section 112A');
        });
    });
});
