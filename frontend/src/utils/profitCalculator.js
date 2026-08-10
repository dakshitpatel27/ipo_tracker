/**
 * Calculates accurate Realized / Unrealized profit for an IPO record.
 * - If not allotted (or not applied), profit is 0.
 * - If sold, returns realized net profit after commission.
 * - If allotted & holding, returns unrealized P&L from live GMP / Listing price.
 */
export function getRecordProfit(r) {
  if (!r) return 0;
  
  const isAllotted = r.alloted === 'Yes' || r.alloted === 'Allotted' || parseFloat(r.alloted) > 0;
  if (!isAllotted) return 0;

  const buyPrice = parseFloat(r.price) || 0;
  const qty = parseFloat(r.shares) || 1;

  // Realized Profit for Sold IPOs (Profit Before Tax)
  if (r.holdingStatus === 'Sold') {
    if (r.sellPrice !== undefined && r.sellPrice !== null && !isNaN(parseFloat(r.sellPrice))) {
      const sellPrice = parseFloat(r.sellPrice);
      return (sellPrice - buyPrice) * qty;
    }
    if (r.profit !== undefined && r.profit !== null && !isNaN(parseFloat(r.profit))) {
      return parseFloat(r.profit);
    }
    return 0;
  }

  // Unrealized P&L for Holding / Pending Sale Allotted IPOs
  const currentPrice = parseFloat(r.listingPrice) || (buyPrice + (parseFloat(r.gmp) || 0));
  return (currentPrice - buyPrice) * qty;
}

export function getRecordRealizedProfit(r) {
  if (!r || r.holdingStatus !== 'Sold') return 0;
  return getRecordProfit(r);
}

export function getRecordUnrealizedProfit(r) {
  const isAllotted = r?.alloted === 'Yes' || r?.alloted === 'Allotted' || parseFloat(r?.alloted) > 0;
  if (!r || !isAllotted || r.holdingStatus === 'Sold') return 0;
  return getRecordProfit(r);
}
