function calculateCharges(price, quantity, sellPrice, holdingStatus, listingPrice = 0, gmp = 0) {
    const buyPriceNum = parseFloat(price) || 0;
    const qtyNum = parseFloat(quantity) || 0;
    const sellPriceNum = parseFloat(sellPrice) || 0;
    const listingPriceNum = parseFloat(listingPrice) || 0;
    const gmpNum = parseFloat(gmp) || 0;

    const buyValue = buyPriceNum * qtyNum;
    const sellValue = sellPriceNum * qtyNum;

    // Stamp duty is 0.005% of the buy/allotment value
    const stampDuty = buyValue * 0.00005;

    let brokerage = 0;
    let stt = 0;
    let exchangeCharges = 0;
    let sebiFees = 0;
    let dpCharges = 0;
    let gst = 0;

    if (holdingStatus === 'Sold' && sellPriceNum > 0) {
        // Flat brokerage of ₹20 per trade (discount broker model)
        brokerage = 20;
        // STT is 0.1% on the sell side for delivery
        stt = sellValue * 0.001;
        // Exchange transaction charges (NSE is ~0.00345%)
        exchangeCharges = sellValue * 0.0000345;
        // SEBI fees (0.0001% of transaction value)
        sebiFees = sellValue * 0.000001;
        // DP charges (CDSL is flat ₹13.50 per company per day of sale)
        dpCharges = 13.50;
        // GST is 18% on Brokerage, Exchange Charges, SEBI fees, and DP charges
        gst = (brokerage + exchangeCharges + sebiFees + dpCharges) * 0.18;
    }

    const roundedBrokerage = Number(brokerage.toFixed(2));
    const roundedStt = Number(stt.toFixed(2));
    const roundedStampDuty = Number(stampDuty.toFixed(2));
    const roundedExchange = Number(exchangeCharges.toFixed(2));
    const roundedSebi = Number(sebiFees.toFixed(2));
    const roundedDp = Number(dpCharges.toFixed(2));
    const roundedGst = Number(gst.toFixed(2));

    const totalCharges = roundedStampDuty + roundedBrokerage + roundedStt + roundedExchange + roundedSebi + roundedDp + roundedGst;

    // Calculate gross profit
    let grossProfit = 0;
    if (holdingStatus === 'Sold' && sellPriceNum > 0) {
        grossProfit = (sellPriceNum - buyPriceNum) * qtyNum;
    } else if (listingPriceNum > 0) {
        grossProfit = (listingPriceNum - buyPriceNum) * qtyNum;
    } else if (gmpNum > 0) {
        grossProfit = gmpNum * qtyNum;
    }

    const netProfit = grossProfit - totalCharges;

    return {
        brokerage: roundedBrokerage,
        stt: roundedStt,
        stampDuty: roundedStampDuty,
        exchangeCharges: roundedExchange,
        sebiFees: roundedSebi,
        dpCharges: roundedDp,
        gst: roundedGst,
        totalCharges: Number(totalCharges.toFixed(2)),
        grossProfit: Number(grossProfit.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2))
    };
}

function calculateTaxLedger(records) {
    let stcg = 0;
    let ltcg = 0;
    let unrealized = 0;

    records.forEach(r => {
        // Use netProfit if available, fallback to gross profit
        const netProfit = r.netProfit !== undefined && r.netProfit !== null ? parseFloat(r.netProfit) : (parseFloat(r.profit) || 0);
        if (netProfit > 0) {
            if (r.holdingStatus === 'Sold' && r.sellDate && r.listingDate) {
                const sellD = new Date(r.sellDate);
                const listD = new Date(r.listingDate);
                const diffTime = Math.abs(sellD - listD);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays > 365) {
                    ltcg += netProfit;
                } else {
                    stcg += netProfit;
                }
            } else if (r.holdingStatus === 'Sold') {
                stcg += netProfit;
            } else {
                unrealized += netProfit;
            }
        }
    });

    const estimatedTax = (stcg * 0.20) + (ltcg * 0.125);

    return {
        stcg: Number(stcg.toFixed(2)),
        ltcg: Number(ltcg.toFixed(2)),
        unrealized: Number(unrealized.toFixed(2)),
        estimatedTax: Number(estimatedTax.toFixed(2))
    };
}

function calculateAllotmentOdds(subTimes = 1, quota = 'Retail', lotCount = 1) {
    const subNum = parseFloat(subTimes) || 1;
    if (subNum <= 1) {
        return {
            probabilityPct: 100,
            oddsRatio: '1:1 (Guaranteed Allotment)',
            status: 'FULL_ALLOTMENT'
        };
    }

    if (quota === 'Retail') {
        const probabilityPct = Math.min(100, Number((100 / subNum).toFixed(2)));
        const ratioInt = Math.round(subNum);
        return {
            probabilityPct,
            oddsRatio: `1:${ratioInt} Lucky Draw`,
            status: probabilityPct >= 50 ? 'HIGH_PROBABILITY' : (probabilityPct >= 20 ? 'MODERATE' : 'LOW_PROBABILITY')
        };
    } else if (quota.includes('sHNI') || quota.includes('Small HNI')) {
        const probabilityPct = Math.min(100, Number((100 / subNum).toFixed(2)));
        const ratioInt = Math.round(subNum);
        return {
            probabilityPct,
            oddsRatio: `1:${ratioInt} Lucky Draw`,
            status: probabilityPct >= 30 ? 'MODERATE' : 'LOW_PROBABILITY'
        };
    } else {
        const probabilityPct = Math.min(100, Number((100 / subNum).toFixed(2)));
        return {
            probabilityPct,
            oddsRatio: `Pro-Rata / 1:${Math.round(subNum)}`,
            status: 'PRO_RATA'
        };
    }
}

function predictListingGain(gmp = 0, issuePrice = 100, qibSubX = 1, overallSubX = 1) {
    const gmpNum = parseFloat(gmp) || 0;
    const priceNum = parseFloat(issuePrice) || 1;
    const qibNum = parseFloat(qibSubX) || 1;

    const basePct = (gmpNum / priceNum) * 100;
    
    let qibBoost = 0;
    if (qibNum > 50) qibBoost = 12;
    else if (qibNum > 20) qibBoost = 8;
    else if (qibNum > 5) qibBoost = 4;

    const minGainPct = Math.max(-20, Number((basePct * 0.85).toFixed(1)));
    const maxGainPct = Number((basePct * 1.15 + qibBoost).toFixed(1));
    const estListingPrice = Number((priceNum + gmpNum + (priceNum * (qibBoost / 100))).toFixed(2));

    return {
        baseGmpPct: Number(basePct.toFixed(1)),
        predictedGainRange: `${minGainPct}% to ${maxGainPct}%`,
        minGainPct,
        maxGainPct,
        estListingPrice,
        sentiment: basePct >= 50 ? 'STRONG_BULLISH' : (basePct >= 15 ? 'MODERATE' : (basePct >= 0 ? 'NEUTRAL' : 'BEARISH'))
    };
}

module.exports = {
    calculateCharges,
    calculateTaxLedger,
    calculateAllotmentOdds,
    predictListingGain
};
