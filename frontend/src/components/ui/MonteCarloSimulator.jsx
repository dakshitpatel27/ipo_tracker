import React, { useState } from 'react';
import { Activity, Play, RefreshCw, BarChart2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const MonteCarloSimulator = () => {
  const [applicationsCount, setApplicationsCount] = useState(5); // 5 family applications
  const [subscriptionMultiple, setSubscriptionMultiple] = useState(14.5); // 14.5x Retail
  const [running, setRunning] = useState(false);
  const [simResults, setSimResults] = useState(null);

  const runSimulation = () => {
    setRunning(true);
    setTimeout(() => {
      const runs = 10000;
      const probPerApp = 1 / Math.max(1, subscriptionMultiple);
      let zeroWins = 0;
      let oneWin = 0;
      let twoWins = 0;
      let threePlusWins = 0;

      for (let i = 0; i < runs; i++) {
        let wins = 0;
        for (let a = 0; a < applicationsCount; a++) {
          if (Math.random() < probPerApp) wins++;
        }
        if (wins === 0) zeroWins++;
        else if (wins === 1) oneWin++;
        else if (wins === 2) twoWins++;
        else threePlusWins++;
      }

      setSimResults({
        probAtleastOne: Math.round(((runs - zeroWins) / runs) * 100),
        probExactlyOne: Math.round((oneWin / runs) * 100),
        probMultipleWins: Math.round(((twoWins + threePlusWins) / runs) * 100),
        runs
      });
      setRunning(false);
    }, 400);
  };

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Activity size={16} className="text-emerald-400" /> Monte Carlo Allotment Probability Simulator (10,000 Runs)
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Simulate 10,000 allotment draws based on subscription multiples and family lot counts.
          </p>
        </div>
        <button
          onClick={runSimulation}
          disabled={running}
          className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 font-bold"
        >
          {running ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
          {running ? 'Simulating 10,000 Runs...' : 'Run Simulation'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-secondary mb-1 font-semibold">Number of Family Applications</label>
          <input
            type="number"
            min="1"
            max="50"
            value={applicationsCount}
            onChange={e => setApplicationsCount(Number(e.target.value))}
            className="input-field py-1.5 font-mono text-xs"
          />
        </div>
        <div>
          <label className="block text-secondary mb-1 font-semibold">Retail Subscription Multiple (x)</label>
          <input
            type="number"
            step="0.1"
            min="1"
            value={subscriptionMultiple}
            onChange={e => setSubscriptionMultiple(Number(e.target.value))}
            className="input-field py-1.5 font-mono text-xs"
          />
        </div>
      </div>

      {simResults && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs">
            <span className="text-[10px] text-emerald-300 font-bold uppercase block">Chance of ≥ 1 Allotment</span>
            <span className="text-xl font-extrabold text-emerald-400 font-mono">{simResults.probAtleastOne}%</span>
          </div>

          <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs">
            <span className="text-[10px] text-indigo-300 font-bold uppercase block">Chance of Exactly 1 Win</span>
            <span className="text-xl font-extrabold text-indigo-300 font-mono">{simResults.probExactlyOne}%</span>
          </div>

          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs">
            <span className="text-[10px] text-amber-300 font-bold uppercase block">Chance of Multiple Wins</span>
            <span className="text-xl font-extrabold text-amber-400 font-mono">{simResults.probMultipleWins}%</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MonteCarloSimulator;
