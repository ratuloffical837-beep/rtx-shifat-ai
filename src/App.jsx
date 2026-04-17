import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as ti from 'technicalindicators';
import axios from 'axios';
import { ShieldCheck, Activity, Lock, User, Zap, Volume2, RefreshCw, Radio, AlertCircle, TrendingUp, Info } from 'lucide-react';

const config = {
  appName: "MONEY MAKER AI V10.5",
  user: "shefat",
  pass: "SHEFAT@123@",
  tvTimeframe: "15", 
  binanceTimeframe: "15m",
  markets: [
    { id: 'BTCUSDT', name: 'Bitcoin' }, { id: 'ETHUSDT', name: 'Ethereum' },
    { id: 'BNBUSDT', name: 'Binance' }, { id: 'SOLUSDT', name: 'Solana' },
    { id: 'LINKUSDT', name: 'Chainlink' }
  ],
  nodes: ["https://api.binance.com/api/v3", "https://api1.binance.com/api/v3", "https://api2.binance.com/api/v3"]
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ u: '', p: '' });
  const [loginError, setLoginError] = useState('');
  const [symbol, setSymbol] = useState(config.markets[0]);
  const [livePrice, setLivePrice] = useState({ val: '0.00', color: '#f3ba2f' });
  const [analysis, setAnalysis] = useState({ type: 'SCANNING', entry: 0, tp1: 0, tp2: 0, sl: 0, conf: 0, reason: 'System Ready' });
  const [syncing, setSyncing] = useState(false);
  
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'));
  const nodeIndex = useRef(0);
  const lastSignalType = useRef('SCANNING');
  const isMounted = useRef(true);

  const rotateNode = () => {
    nodeIndex.current = (nodeIndex.current + 1) % config.nodes.length;
  };

  const handleLogin = () => {
    if (loginData.u === config.user && loginData.p === config.pass) {
      // Audio Silent Unlock for Mobile Security
      audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }).catch(() => {});
      setIsLoggedIn(true);
    } else {
      setLoginError("Security Alert: Invalid Access Credentials!");
      setTimeout(() => setLoginError(''), 5000);
    }
  };

  // Price Engine with Refined Color Logic (No Flickering)
  const fetchPrice = useCallback(async () => {
    if (!isLoggedIn || !isMounted.current) return;
    try {
      const node = config.nodes[nodeIndex.current];
      const r = await axios.get(`${node}/ticker/price?symbol=${symbol.id}`, { timeout: 2500 });
      const newPrice = parseFloat(r.data.price);
      
      setLivePrice(prev => {
        const pVal = parseFloat(prev.val);
        let newColor = prev.color;
        if (newPrice > pVal) newColor = '#0ecb81';
        else if (newPrice < pVal) newColor = '#f6465d';
        return { val: newPrice.toFixed(newPrice > 100 ? 2 : 4), color: newColor };
      });
    } catch (e) {
      rotateNode();
      setTimeout(fetchPrice, 500); 
    }
  }, [isLoggedIn, symbol]);

  useEffect(() => {
    isMounted.current = true;
    const pTimer = setInterval(fetchPrice, 2000);
    fetchPrice();
    return () => { clearInterval(pTimer); isMounted.current = false; };
  }, [fetchPrice]);

  // V10.5 Ultra Logic: 100-Period VWAP + RSI Guard
  const runAnalysis = useCallback(async () => {
    if (!isLoggedIn || document.hidden || syncing) return;
    setSyncing(true);

    try {
      const node = config.nodes[nodeIndex.current];
      const r = await axios.get(`${node}/klines?symbol=${symbol.id}&interval=${config.binanceTimeframe}&limit=450`, { timeout: 6000 });
      const kdata = r.data.map(d => ({ h: +d[2], l: +d[3], c: +d[4], v: +d[5] }));

      const prices = kdata.map(x => x.c);
      const lastPrice = prices[prices.length - 1];
      const lastIdx = kdata.length - 2;

      // 1. Core RSI (14)
      const rsi = ti.RSI.calculate({ values: prices, period: 14 }).pop();
      
      // 2. EMA Trend (200)
      const ema200 = ti.EMA.calculate({ values: prices, period: 200 }).pop();
      
      // 3. True VWAP-Style VWMA (100 Period for Smooth Institutional Flow)
      const slice100 = kdata.slice(-100);
      const vwap100 = slice100.reduce((acc, cur) => acc + (cur.c * cur.v), 0) / slice100.reduce((acc, cur) => acc + cur.v, 0);

      // 4. Volatility (ATR)
      const atr = ti.ATR.calculate({ high: kdata.map(x=>x.h), low: kdata.map(x=>x.l), close: prices, period: 14 }).pop();
      
      // 5. EMA Gap (Trend Strength)
      const ema20 = ti.EMA.calculate({values:prices, period:20}).pop();
      const ema50 = ti.EMA.calculate({values:prices, period:50}).pop();
      const emaGap = (Math.abs(ema20 - ema50) / lastPrice) * 100;

      let type = 'SCANNING', score = 0, reason = "Scanning Orderbook...";

      if (emaGap < 0.18) {
        reason = "Market Compression - No Trade Zone";
      } else if (lastPrice > ema200 && lastPrice > vwap100) {
        // BULLISH BIAS
        if (rsi > 45 && rsi < 80) { // Safety Guard @ 80
          score = 75;
          if (kdata[lastIdx].v > kdata[lastIdx-1].v) score += 15;
          if (score >= 90) { type = 'BUY'; reason = "Institutional Accumulation & EMA Support"; }
        } else if (rsi >= 80) { reason = "Caution: Overextended Bullish Zone"; }
      } else if (lastPrice < ema200 && lastPrice < vwap100) {
        // BEARISH BIAS
        if (rsi < 55 && rsi > 20) { // Safety Guard @ 20
          score = 75;
          if (kdata[lastIdx].v > kdata[lastIdx-1].v) score += 15;
          if (score >= 90) { type = 'SELL'; reason = "Bearish Breakdown & Volume Surge"; }
        } else if (rsi <= 20) { reason = "Caution: Extreme Capitulation Zone"; }
      }

      // Signal Audio Trigger
      if (type !== lastSignalType.current && (type === 'BUY' || type === 'SELL')) {
        audioRef.current.play().catch(() => {});
        lastSignalType.current = type;
      }

      const slDist = atr * 2.0; 
      const prec = lastPrice > 1000 ? 2 : 4;

      setAnalysis({
        type,
        entry: lastPrice.toFixed(prec),
        tp1: (type === 'BUY' ? lastPrice + (slDist * 0.70) : lastPrice - (slDist * 0.70)).toFixed(prec),
        tp2: (type === 'BUY' ? lastPrice + (slDist * 1.5) : lastPrice - (slDist * 1.5)).toFixed(prec),
        sl: (type === 'BUY' ? lastPrice - slDist : lastPrice + slDist).toFixed(prec),
        conf: score,
        reason
      });
    } catch (e) {
      rotateNode();
    } finally {
      setSyncing(false);
    }
  }, [symbol, isLoggedIn, syncing]); 

  useEffect(() => {
    if (isLoggedIn) {
      const aTimer = setInterval(runAnalysis, 15000);
      runAnalysis();
      return () => clearInterval(aTimer);
    }
  }, [isLoggedIn, runAnalysis]);

  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="shield-anim"><ShieldCheck size={55} color="#f3ba2f"/></div>
          <h1>{config.appName}</h1>
          {loginError && <div className="error-box"><AlertCircle size={14}/> {loginError}</div>}
          <div className="input-group"><User size={18}/><input type="text" placeholder="Admin ID" onChange={e=>setLoginData({...loginData, u:e.target.value})}/></div>
          <div className="input-group"><Lock size={18}/><input type="password" placeholder="Passkey" onChange={e=>setLoginData({...loginData, p:e.target.value})}/></div>
          <button className="auth-btn" onClick={handleLogin}>INITIALIZE ENGINE</button>
        </div>
        <style>{`.auth-container{height:100vh;display:flex;align-items:center;justify-content:center;background:#000;font-family:Inter}.auth-box{background:#0b0e11;padding:45px;border-radius:40px;border:1px solid #1e2329;width:360px;text-align:center}.shield-anim{animation:bounce 3s infinite ease-in-out}@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}h1{color:#f3ba2f;font-size:1.4rem;font-weight:900;margin:30px 0;letter-spacing:1px}.error-box{background:rgba(246,70,93,0.1);color:#f6465d;padding:12px;border-radius:12px;font-size:0.75rem;margin-bottom:20px;border:1px solid rgba(246,70,93,0.2);display:flex;align-items:center;gap:8px;justify-content:center}.input-group{display:flex;align-items:center;background:#1e2329;padding:16px;border-radius:16px;margin-bottom:15px;border:1px solid #2d333b;color:#848e9c}.input-group input{background:none;border:none;color:#fff;padding-left:12px;outline:none;width:100%;font-size:1rem}.auth-btn{width:100%;padding:18px;background:#f3ba2f;border:none;border-radius:16px;font-weight:900;cursor:pointer;box-shadow:0 10px 25px rgba(243,186,47,0.15)}`}</style>
      </div>
    );
  }

  return (
    <div className="v10-terminal">
      <header>
        <div className="brand"><Radio className="ping-anim" size={16} color="#0ecb81"/> <span>{config.appName}</span></div>
        <div className="status-badge">{syncing ? <RefreshCw className="rotate" size={14}/> : <Activity size={14}/>} {syncing ? 'SYNC' : 'READY'}</div>
      </header>

      <div className="market-selector">
        <select value={symbol.id} onChange={e=>setSymbol(config.markets.find(m=>m.id===e.target.value))}>
          {config.markets.map(m=><option key={m.id} value={m.id}>{m.name} Spot - {config.binanceTimeframe}</option>)}
        </select>
      </div>

      <div className="live-price-section">
        <div className="p-val" style={{color: livePrice.color}}>{livePrice.val}</div>
        <div className="p-label"><TrendingUp size={11}/> INSTITUTIONAL TREND TRACKER</div>
      </div>

      <div className="tv-chart-container">
        <iframe key={symbol.id} src={`https://s.tradingview.com/widgetembed/?symbol=BINANCE:${symbol.id}&interval=${config.tvTimeframe}&theme=dark&style=1&hide_top_toolbar=true`} width="100%" height="100%" frameBorder="0"></iframe>
      </div>

      <div className="analysis-section">
        <div className={`analysis-card ${analysis.type}`}>
          <div className="ac-header">
            <span className="ac-type"><Zap size={18} fill="currentColor"/> {analysis.type} SIGNAL</span>
            <span className="ac-conf">{analysis.conf}% CONF</span>
          </div>
          <div className="ac-reason"><Info size={13}/> {analysis.reason}</div>
          <div className="ac-grid">
            <div className="ac-row"><span>ENTRY</span><strong>{analysis.entry}</strong></div>
            <div className="ac-row"><span>TARGET 1</span><strong className="green">{analysis.tp1}</strong></div>
            <div className="ac-row"><span>TARGET 2</span><strong className="green">{analysis.tp2}</strong></div>
            <div className="ac-row"><span>STOP LOSS</span><strong className="red">{analysis.sl}</strong></div>
          </div>
          <div className="ac-footer"><Volume2 size={12}/> VOL_FLOW: {analysis.conf > 80 ? 'ACCELERATING' : 'STEADY'}</div>
        </div>
      </div>

      <footer className="v10-footer">V10.5 ULTRA STABLE • 100-PERIOD VWAP • ANTI-FLICKER ENGINE</footer>

      <style>{`
        .v10-terminal{max-width:480px;margin:auto;background:#010203;min-height:100vh;color:#fff;font-family:Inter}
        header{padding:20px 25px;display:flex;justify-content:space-between;border-bottom:1px solid #14181c}
        .brand{display:flex;align-items:center;gap:12px;font-weight:900;color:#f3ba2f}
        .ping-anim{animation:blink 1.5s infinite}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        .status-badge{font-size:0.7rem;color:#0ecb81;display:flex;align-items:center;gap:8px;font-weight:bold;letter-spacing:1px}
        .rotate{animation:rotate 1.2s linear infinite}@keyframes rotate{to{transform:rotate(360deg)}}
        .market-selector{padding:15px 20px}.market-selector select{width:100%;padding:17px;background:#161a1e;border:1px solid #2d333b;color:#f3ba2f;border-radius:20px;outline:none;font-weight:bold;font-size:0.95rem}
        .live-price-section{text-align:center;padding:15px 0}.p-val{font-size:3.6rem;font-weight:900;font-family:'JetBrains Mono';transition:color 0.4s ease-in-out}.p-label{font-size:0.6rem;color:#444;letter-spacing:4px;display:flex;align-items:center;justify-content:center;gap:6px}
        .tv-chart-container{height:320px;border-top:1px solid #14181c;border-bottom:1px solid #14181c}
        .analysis-section{padding:20px}.analysis-card{background:#0b0e11;border-radius:35px;padding:25px;border:1px solid #1e2329}
        .BUY{border-color:#0ecb81;box-shadow:0 15px 50px rgba(14,203,129,0.1)}
        .SELL{border-color:#f6465d;box-shadow:0 15px 50px rgba(246,70,93,0.1)}
        .ac-header{display:flex;justify-content:space-between;margin-bottom:12px}.ac-type{font-weight:900;display:flex;align-items:center;gap:8px}
        .ac-conf{font-size:0.65rem;background:#1e2329;padding:6px 14px;border-radius:10px;color:#848e9c;font-weight:bold}
        .ac-reason{font-size:0.8rem;color:#848e9c;margin-bottom:20px;display:flex;align-items:center;gap:8px}
        .ac-grid{display:grid;gap:15px}.ac-row{display:flex;justify-content:space-between;font-size:1rem;border-bottom:1px solid #161a1e;padding-bottom:10px}
        .green{color:#0ecb81;font-weight:bold}.red{color:#f6465d;font-weight:bold}.ac-footer{margin-top:20px;font-size:0.6rem;color:#333;display:flex;align-items:center;gap:8px}
        .v10-footer{text-align:center;padding:30px;font-size:0.6rem;color:#222;letter-spacing:1px;font-weight:bold}
      `}</style>
    </div>
  );
}

export default App;
