/**
 * AI Valuation & DRHP Peer Comparison Engine
 */
function analyzePeerValuations(ipoPrice, peRatio, sectorPe = 25.0) {
    const price = parseFloat(ipoPrice) || 1;
    const pe = parseFloat(peRatio) || 20;

    const discountVsSector = ((sectorPe - pe) / sectorPe) * 100;
    let valuationRating = 'Fairly Valued';
    if (discountVsSector >= 20) valuationRating = 'Under-Valued / Attractive';
    else if (discountVsSector <= -20) valuationRating = 'Over-Valued / Expensive';

    return {
        peRatio: pe,
        sectorPe,
        discountVsSector: discountVsSector.toFixed(1),
        valuationRating
    };
}

function calculateAllotmentProbabilityV2(qibSub = 1, retailSub = 1, familyApps = 1) {
    const qib = Math.max(1, parseFloat(qibSub) || 1);
    const retail = Math.max(1, parseFloat(retailSub) || 1);
    const N = Math.max(1, parseInt(familyApps) || 1);

    const baseProb = 1 / retail;
    const qibWeightBonus = Math.min(0.25, (qib / 100) * 0.1);
    const finalSingleProb = Math.min(1.0, baseProb + qibWeightBonus);
    
    const overallFamilyProb = (1 - Math.pow(1 - finalSingleProb, N)) * 100;

    return {
        singleAccountProb: (finalSingleProb * 100).toFixed(1),
        overallFamilyProb: overallFamilyProb.toFixed(1),
        expectedLots: (finalSingleProb * N).toFixed(2)
    };
}

module.exports = { analyzePeerValuations, calculateAllotmentProbabilityV2 };
