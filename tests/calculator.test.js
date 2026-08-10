const { calculateCharges, calculateTaxLedger } = require('../calculator');

describe('IPO Tracker Charges & Tax Calculator Tests', () => {
    
    describe('calculateCharges', () => {
        
        test('calculates only stamp duty when record is not sold (Holding)', () => {
            const price = 500;
            const shares = 30; // ₹15,000 buy value
            const sellPrice = 0;
            const status = 'Holding';

            const result = calculateCharges(price, shares, sellPrice, status);
            
            // Buy value = 500 * 30 = 15000
            // Stamp duty = 15000 * 0.00005 = 0.75
            expect(result.stampDuty).toBe(0.75);
            expect(result.brokerage).toBe(0);
            expect(result.stt).toBe(0);
            expect(result.exchangeCharges).toBe(0);
            expect(result.sebiFees).toBe(0);
            expect(result.dpCharges).toBe(0);
            expect(result.gst).toBe(0);
            expect(result.totalCharges).toBe(0.75);
            expect(result.netProfit).toBe(-0.75); // Gross profit is 0, so net profit is -charges
        });

        test('calculates full charges breakdown when record is Sold', () => {
            const price = 500;
            const shares = 30; // ₹15,000 buy value
            const sellPrice = 600; // ₹18,000 sell value
            const status = 'Sold';

            const result = calculateCharges(price, shares, sellPrice, status);
            
            // Buy value = 15000
            // Sell value = 18000
            // Stamp duty = 15000 * 0.00005 = 0.75
            // Brokerage = 20
            // STT = 18000 * 0.001 = 18
            // Exchange charges = 18000 * 0.0000345 = 0.621 -> 0.62
            // SEBI fees = 18000 * 0.000001 = 0.018 -> 0.02
            // DP charges = 13.50
            // GST = (20 + 0.621 + 0.018 + 13.50) * 0.18 = 34.139 * 0.18 = 6.145 -> 6.15 (depending on rounding)
            
            expect(result.stampDuty).toBe(0.75);
            expect(result.brokerage).toBe(20);
            expect(result.stt).toBe(18);
            expect(result.dpCharges).toBe(13.50);
            
            // Gross profit = (600 - 500) * 30 = 3000
            expect(result.grossProfit).toBe(3000);
            
            // Total charges should be sum of individual charges
            const calculatedSum = result.stampDuty + result.brokerage + result.stt + result.exchangeCharges + result.sebiFees + result.dpCharges + result.gst;
            expect(result.totalCharges).toBe(Number(calculatedSum.toFixed(2)));
            expect(result.netProfit).toBe(Number((3000 - result.totalCharges).toFixed(2)));
        });
    });

    describe('calculateTaxLedger', () => {
        
        test('separates short term and long term capital gains and calculates estimated tax', () => {
            const records = [
                {
                    id: '1',
                    netProfit: 10000,
                    holdingStatus: 'Sold',
                    listingDate: '2024-01-01',
                    sellDate: '2024-06-01' // 5 months, STCG
                },
                {
                    id: '2',
                    netProfit: 20000,
                    holdingStatus: 'Sold',
                    listingDate: '2023-01-01',
                    sellDate: '2024-06-01' // 17 months, LTCG
                },
                {
                    id: '3',
                    netProfit: 5000,
                    holdingStatus: 'Holding' // Unrealized
                }
            ];

            const ledger = calculateTaxLedger(records);
            
            expect(ledger.stcg).toBe(10000);
            expect(ledger.ltcg).toBe(20000);
            expect(ledger.unrealized).toBe(5000);
            
            // Estimated tax: STCG * 20% + LTCG * 12.5%
            // 10000 * 0.20 = 2000
            // 20000 * 0.125 = 2500
            // Total = 4500
            expect(ledger.estimatedTax).toBe(4500);
        });

        test('falls back to profit column if netProfit is missing', () => {
            const records = [
                {
                    id: '1',
                    profit: 5000,
                    holdingStatus: 'Sold',
                    listingDate: '2024-01-01',
                    sellDate: '2024-02-01' // STCG
                }
            ];

            const ledger = calculateTaxLedger(records);
            expect(ledger.stcg).toBe(5000);
            expect(ledger.estimatedTax).toBe(1000);
        });
    });
});
