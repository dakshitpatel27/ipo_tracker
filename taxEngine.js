/**
 * Advance Tax (Sec 208) & Statutory Trade Charge Engine
 */
function calculateStatutoryCharges(turnover, isSme = false) {
    const total = parseFloat(turnover) || 0;
    
    // Statutory Indian Stock Market Rates
    const stt = total * 0.001; // 0.1% STT on Delivery
    const stampDuty = total * 0.00015; // 0.015%
    const exchangeCharges = total * 0.0000345; // BSE/NSE 0.00345%
    const sebiFees = total * 0.000001; // ₹10 per crore
    const dpCharges = isSme ? 25.0 : 13.5; // CDSL/NSDL Flat DP Fee
    const gst = (exchangeCharges + sebiFees + dpCharges) * 0.18; // 18% GST

    const totalCharges = stt + stampDuty + exchangeCharges + sebiFees + dpCharges + gst;

    return {
        stt: parseFloat(stt.toFixed(2)),
        stampDuty: parseFloat(stampDuty.toFixed(2)),
        exchangeCharges: parseFloat(exchangeCharges.toFixed(2)),
        sebiFees: parseFloat(sebiFees.toFixed(2)),
        dpCharges: parseFloat(dpCharges.toFixed(2)),
        gst: parseFloat(gst.toFixed(2)),
        totalCharges: parseFloat(totalCharges.toFixed(2))
    };
}

function calculateAdvanceTaxInstallments(stcgProfit = 0, ltcgProfit = 0) {
    const stcgTax = (parseFloat(stcgProfit) || 0) * 0.20; // 20% under Sec 111A
    const ltcgExempt = Math.max(0, (parseFloat(ltcgProfit) || 0) - 125000); // ₹1.25L Exempt
    const ltcgTax = ltcgExempt * 0.125; // 12.5% under Sec 112A

    const totalTaxLiability = stcgTax + ltcgTax;
    const cess = totalTaxLiability * 0.04; // 4% Health & Ed Cess
    const netTax = totalTaxLiability + cess;

    // Advance Tax Installments (Sec 208 applies if net tax > ₹10,000)
    const isApplicable = netTax >= 10000;

    return {
        stcgTax: parseFloat(stcgTax.toFixed(0)),
        ltcgTax: parseFloat(ltcgTax.toFixed(0)),
        cess: parseFloat(cess.toFixed(0)),
        totalNetTax: parseFloat(netTax.toFixed(0)),
        isAdvanceTaxRequired: isApplicable,
        installments: {
            q1_June15: parseFloat((netTax * 0.15).toFixed(0)), // 15% by June 15
            q2_Sept15: parseFloat((netTax * 0.45).toFixed(0)), // 45% by Sept 15
            q3_Dec15: parseFloat((netTax * 0.75).toFixed(0)),  // 75% by Dec 15
            q4_Mar15: parseFloat(netTax.toFixed(0))            // 100% by Mar 15
        }
    };
}

module.exports = { calculateStatutoryCharges, calculateAdvanceTaxInstallments };
