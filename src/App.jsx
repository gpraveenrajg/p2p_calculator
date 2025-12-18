import React, { useState, useEffect } from 'react';
import { RefreshCw, Copy, TrendingUp, ArrowDown, FileSpreadsheet, Sparkles, BrainCircuit, Globe, Loader2 } from 'lucide-react';

const BitcoinP2PCalculator = () => {
  // --- State ---
  const [inrAmount, setInrAmount] = useState(35000);
  const [btcAmount, setBtcAmount] = useState(0); 
  const [premium, setPremium] = useState(3.0);
  const [lastEdited, setLastEdited] = useState('INR');

  // Data State
  const [btcPrice, setBtcPrice] = useState(null);
  const [usdInrRate, setUsdInrRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [showExcel, setShowExcel] = useState(false);

  // Gemini State
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const apiKey = ""; // Set by environment

  // --- Logic Helpers ---
  const calculateBtcFromInr = (inr, rate, price, prem) => {
    if (!rate || !price) return 0;
    const marketBtc = (inr / rate) / price;
    const premiumFactor = 1 - (prem / 100);
    return marketBtc * premiumFactor;
  };

  const calculateInrFromBtc = (btc, rate, price, prem) => {
    if (!rate || !price) return 0;
    const premiumFactor = 1 - (prem / 100);
    if (premiumFactor === 0) return 0; 
    const marketBtc = btc / premiumFactor;
    return marketBtc * price * rate;
  };

  // --- Gemini API Integration ---
  const getAiInsights = async (mode = 'analysis') => {
    setAiLoading(true);
    try {
      const systemPrompt = `You are a professional Bitcoin P2P trade consultant. Analyze the following trade data:
      Target INR: ${inrAmount}
      BTC to Send: ${btcAmount}
      Premium: ${premium}%
      Current BTC/USD: ${btcPrice}
      USD/INR: ${usdInrRate}
      
      If mode is 'analysis', provide a brief 2-sentence strategy on whether this premium is competitive.
      If mode is 'market', summarize current BTC market sentiment and if any major news affects P2P trading.`;

      const userQuery = mode === 'analysis' 
        ? "Analyze this specific trade setup." 
        : "What is the current Bitcoin market sentiment and news summary for a P2P seller?";

      const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      };

      if (mode === 'market') {
        payload.tools = [{ "google_search": {} }];
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      setAiAnalysis(text);
    } catch (err) {
      console.error(err);
      setAiAnalysis("Could not reach the Satoshi AI. Check your connection.");
    } finally {
      setAiLoading(false);
    }
  };

  // --- Handlers ---
  const handleInrChange = (val) => {
    const newVal = val === '' ? '' : parseFloat(val);
    setInrAmount(newVal);
    setLastEdited('INR');
    if (usdInrRate && btcPrice && typeof newVal === 'number') {
      setBtcAmount(calculateBtcFromInr(newVal, usdInrRate, btcPrice, premium));
    }
  };

  const handleBtcChange = (val) => {
    const newVal = val === '' ? '' : parseFloat(val);
    setBtcAmount(newVal);
    setLastEdited('BTC');
    if (usdInrRate && btcPrice && typeof newVal === 'number') {
      setInrAmount(calculateInrFromBtc(newVal, usdInrRate, btcPrice, premium));
    }
  };

  const handlePremiumChange = (newPremium) => {
    setPremium(newPremium);
    if (usdInrRate && btcPrice) {
      if (lastEdited === 'INR' && typeof inrAmount === 'number') {
        setBtcAmount(calculateBtcFromInr(inrAmount, usdInrRate, btcPrice, newPremium));
      } else if (lastEdited === 'BTC' && typeof btcAmount === 'number') {
        setInrAmount(calculateInrFromBtc(btcAmount, usdInrRate, btcPrice, newPremium));
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const currencyRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const currencyData = await currencyRes.json();
      const inrRate = currencyData.rates.INR;

      const btcRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      const btcData = await btcRes.json();
      const btcUsd = btcData.bitcoin.usd;

      setUsdInrRate(inrRate);
      setBtcPrice(btcUsd);
      setLastUpdated(new Date());

      if (lastEdited === 'INR' && typeof inrAmount === 'number') {
        setBtcAmount(calculateBtcFromInr(inrAmount, inrRate, btcUsd, premium));
      } else if (lastEdited === 'BTC' && typeof btcAmount === 'number') {
        setInrAmount(calculateInrFromBtc(btcAmount, inrRate, btcUsd, premium));
      }
    } catch (err) {
      setError("Failed to fetch rates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const safePremiumFactor = 1 - (premium / 100);
  const currentBtcVal = typeof btcAmount === 'number' ? btcAmount : 0;
  const currentInrVal = typeof inrAmount === 'number' ? inrAmount : 0;
  const marketBtc = safePremiumFactor > 0 ? currentBtcVal / safePremiumFactor : 0;
  const valueOfBtcSentInInr = currentBtcVal * (btcPrice || 0) * (usdInrRate || 0);
  const profitInr = currentInrVal - valueOfBtcSentInInr;
  const btcDifference = marketBtc - currentBtcVal;

  const formatINR = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatBTC = (val) => val.toFixed(8);

  const copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center px-2">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
              P2P Satoshi <Sparkles className="text-yellow-500 size-5 animate-pulse" />
            </h1>
            <p className="text-slate-500 text-xs font-medium tracking-wide">AI-POWERED CALCULATOR</p>
          </div>
          <button onClick={fetchData} disabled={loading} className={`p-2 rounded-full bg-slate-900 border border-slate-800 transition-all ${loading ? 'animate-spin' : ''}`}>
            <RefreshCw size={18} className="text-yellow-500" />
          </button>
        </div>

        {/* Live Ticker */}
        <div className="flex gap-3">
          <div className="flex-1 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 flex flex-col items-center justify-center">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">BTC Price</span>
            <span className="text-sm font-mono font-medium text-slate-200">{btcPrice ? formatUSD(btcPrice) : '---'}</span>
          </div>
          <div className="flex-1 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 flex flex-col items-center justify-center">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">USD/INR</span>
            <span className="text-sm font-mono font-medium text-slate-200">{usdInrRate ? `₹${usdInrRate.toFixed(2)}` : '---'}</span>
          </div>
        </div>

        {/* AI Analysis View (Hidden if null) */}
        {aiAnalysis && (
          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl text-xs text-blue-100 relative group animate-in slide-in-from-top-2 duration-300">
            <button onClick={() => setAiAnalysis(null)} className="absolute top-2 right-2 text-blue-500 hover:text-white">×</button>
            <div className="flex items-start gap-2">
              <Sparkles className="size-4 text-blue-400 mt-0.5" />
              <p className="leading-relaxed">{aiAnalysis}</p>
            </div>
          </div>
        )}

        {/* Main Calculation Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase mb-2">You Receive (INR Target)</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">₹</span>
                <input 
                  type="number" 
                  value={inrAmount}
                  onChange={(e) => handleInrChange(e.target.value)}
                  onFocus={() => setLastEdited('INR')}
                  className={`w-full bg-slate-950 border ${lastEdited === 'INR' ? 'border-yellow-500 ring-1 ring-yellow-500/20' : 'border-slate-700'} rounded-xl py-4 pl-10 pr-4 text-2xl font-bold text-white focus:outline-none transition-all placeholder-slate-700`}
                />
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
              <div className="flex justify-between mb-3">
                <label className="text-slate-400 text-xs font-bold uppercase">Sell Premium</label>
                <span className="text-yellow-400 font-bold font-mono">{premium}%</span>
              </div>
              <input 
                type="range" min="0" max="20" step="0.1" value={premium}
                onChange={(e) => handlePremiumChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>
          </div>

          <div className="bg-slate-950/30 border-y border-slate-800/50 px-6 py-4">
             <div className="flex items-center justify-between mb-2">
                <div className="text-slate-500 text-xs font-medium">Actual Market Value</div>
                <div className="text-slate-300 font-mono text-sm">{formatBTC(marketBtc)} BTC</div>
             </div>
             <div className="flex items-center justify-between">
                <div className="text-green-500/80 text-xs font-medium flex items-center gap-1">
                  <ArrowDown size={12} /> Less Premium ({premium}%)
                </div>
                <div className="text-green-400 font-mono text-sm">-{formatBTC(btcDifference)} BTC</div>
             </div>
          </div>

          <div className={`p-6 bg-gradient-to-b from-slate-900 to-slate-950 relative`}>
            <label className="block text-slate-400 text-xs font-bold uppercase mb-2">You Send (Net BTC)</label>
            <div className="relative">
              <input 
                type="number" 
                value={btcAmount}
                onChange={(e) => handleBtcChange(e.target.value)}
                onFocus={() => setLastEdited('BTC')}
                className="w-full bg-transparent border-none text-3xl font-bold text-white tracking-tight focus:outline-none p-0 m-0 placeholder-slate-800 font-mono"
                step="0.00000001"
              />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-600 font-bold pointer-events-none">BTC</span>
            </div>

            <button 
              onClick={() => copyToClipboard(typeof btcAmount === 'number' ? btcAmount.toFixed(8) : '0')}
              className="absolute top-6 right-6 p-2 text-slate-600 hover:text-yellow-500 transition-colors z-20"
            >
              <Copy size={20} />
            </button>
          </div>

          <div className="bg-green-500/10 border-t border-green-500/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-400">
              <TrendingUp size={18} />
              <span className="text-sm font-bold uppercase">Your Gain</span>
            </div>
            <div className="text-green-400 font-bold text-xl font-mono">+{formatINR(profitInr)}</div>
          </div>
        </div>

        {/* AI Tools Bar */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => getAiInsights('analysis')}
            disabled={aiLoading}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600/10 border border-blue-500/30 rounded-xl text-blue-400 text-xs font-bold hover:bg-blue-600/20 transition-all disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="animate-spin size-4" /> : <BrainCircuit size={16} />}
            Analyze Trade ✨
          </button>
          <button 
            onClick={() => getAiInsights('market')}
            disabled={aiLoading}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-purple-600/10 border border-purple-500/30 rounded-xl text-purple-400 text-xs font-bold hover:bg-purple-600/20 transition-all disabled:opacity-50"
          >
             {aiLoading ? <Loader2 className="animate-spin size-4" /> : <Globe size={16} />}
            Market Pulse ✨
          </button>
        </div>

        {/* Footer Actions */}
        <div className="pt-2">
          <button onClick={() => setShowExcel(!showExcel)} className="w-full py-3 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-xs font-medium uppercase tracking-wide">
            <FileSpreadsheet size={16} />
            {showExcel ? "Hide Formulas" : "View Excel Formulas"}
          </button>

          {showExcel && (
            <div className="mt-4 bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="text-slate-400 mb-2 font-sans normal-case">A1=INR, B1=USD/INR, C1=BTC Price, D1=Premium%</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
                  <code className="text-blue-300">Market BTC: =(A1/B1)/C1</code>
                  <Copy size={14} className="text-slate-600 cursor-pointer" onClick={() => copyToClipboard('=(A1/B1)/C1')} />
                </div>
                <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
                  <code className="text-green-400">Net Send: =((A1/B1)/C1)*(1-(D1/100))</code>
                  <Copy size={14} className="text-slate-600 cursor-pointer" onClick={() => copyToClipboard('=((A1/B1)/C1)*(1-(D1/100))')} />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-center text-slate-700 text-[10px] pb-10">Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '...'}</div>
      </div>
    </div>
  );
};

export default BitcoinP2PCalculator;