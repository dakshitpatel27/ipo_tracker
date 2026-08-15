import React from 'react';
import { Download, FileText, Printer, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PartySettlementPDF = ({ partyName = 'Family Partner Account', balance = 0 }) => {
  const handlePrintStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Khatabook Settlement Statement - ${partyName}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #111; }
            h2 { border-bottom: 2px solid #333; padding-bottom: 5px; }
            .meta { margin-bottom: 20px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f4f4f5; }
            .total { font-weight: bold; font-size: 14px; margin-top: 20px; text-align: right; }
          </style>
        </head>
        <body>
          <h2>IPO TRACKER - KHATABOOK SETTLEMENT STATEMENT</h2>
          <div class="meta">
            <p><strong>Party Name:</strong> ${partyName}</p>
            <p><strong>Statement Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
            <p><strong>Settlement Balance:</strong> ₹${balance.toLocaleString('en-IN')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Debit (₹)</th>
                <th>Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${new Date().toLocaleDateString('en-IN')}</td>
                <td>IPO_ALLOTMENT</td>
                <td>IPO Allotment Settlement Statement</td>
                <td>—</td>
                <td>₹${balance.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
          <div class="total">Net Payable Balance: ₹${balance.toLocaleString('en-IN')}</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success('Generated printable settlement statement!');
  };

  return (
    <div className="p-4 rounded-xl bg-surface-2 border border-border flex items-center justify-between text-xs">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
          <FileText size={18} />
        </div>
        <div>
          <span className="font-bold text-white text-sm block">Khatabook Printable Settlement Statement</span>
          <span className="text-secondary">Generate itemized PDF / print receipt for {partyName}</span>
        </div>
      </div>

      <button
        onClick={handlePrintStatement}
        className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5 font-bold"
      >
        <Printer size={14} /> Print / Export PDF
      </button>
    </div>
  );
};

export default PartySettlementPDF;
