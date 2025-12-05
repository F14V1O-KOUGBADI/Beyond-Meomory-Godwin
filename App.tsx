import React, { useState, useRef, useEffect } from 'react';
import { analyzeMemory, askLegacyAdvisor } from './services/geminiService';
import { Memory, ChatMessage, Product } from './types';
import Scene3D from './components/Scene3D';

// --- MOCK DATA FOR SHOP ---
const PRODUCTS: Product[] = [
  { id: '1', title: 'Marble Mausoleum', category: 'Monuments', price: 0.5, rarity: 'Legendary', image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=600' },
  { id: '2', title: 'Eternal Garden', category: 'Univers', price: 0.2, rarity: 'Rare', image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=600' },
  { id: '3', title: 'Digital Candle', category: 'Decorations', price: 0.05, rarity: 'Classic', image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=600' },
  { id: '4', title: 'Ancestral Statue', category: 'Monuments', price: 1.2, rarity: 'Immortal', image: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=600' },
  { id: '5', title: 'Nebula Skybox', category: 'Univers', price: 0.8, rarity: 'Legendary', image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=600' },
  { id: '6', title: 'Golden Frame', category: 'Decorations', price: 0.1, rarity: 'Classic', image: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&q=80&w=600' },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'library' | 'shop' | 'advisor' | 'tokenomics' | 'metaverse'>('home');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  // --- LIBRARY STATE ---
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryInput, setMemoryInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- ADVISOR STATE ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'intro', role: 'ai', text: 'Welcome, traveler. I am the guardian of your legacy. What memories do you wish to preserve for eternity today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // --- SHOP STATE ---
  const [shopFilter, setShopFilter] = useState<'All' | 'Monuments' | 'Decorations' | 'Univers'>('All');

  // --- HANDLERS ---
  const connectWallet = () => {
    if (!isWalletConnected) {
      setIsWalletConnected(true);
      setWalletAddress('0x71C...9A23');
    } else {
      setIsWalletConnected(false);
      setWalletAddress('');
    }
  };

  const handleSaveMemory = async () => {
    if (!memoryInput.trim()) return;
    setIsAnalyzing(true);
    
    const { emotions, themes } = await analyzeMemory(memoryInput);
    
    const newMemory: Memory = {
      id: Date.now().toString(),
      content: memoryInput,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      emotions,
      themes
    };

    setMemories([newMemory, ...memories]);
    setMemoryInput('');
    setIsAnalyzing(false);
  };

  const handleAdvisorSubmit = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiTyping(true);

    const history = chatMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    const responseText = await askLegacyAdvisor(history, userMsg.text);
    
    setIsAiTyping(false);
    setChatMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'ai', text: responseText || "Silence..." }]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-200">
      
      {/* --- STICKY NAVIGATION --- */}
      <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-white/10 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span className="font-serif text-2xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-white to-purple-200">
              BeyondMemories
            </span>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium tracking-wide text-slate-300">
            {['Home', 'MyLibrary', 'Life-Shop', 'Legacy Advisor', 'Tokenomics'].map((item) => {
               const viewKey = item.toLowerCase().replace(' ', '').replace('-', '') as any;
               const isActive = currentView === (viewKey === 'mylibrary' ? 'library' : viewKey === 'lifeshop' ? 'shop' : viewKey === 'legacyadvisor' ? 'advisor' : viewKey);
               return (
                 <button 
                  key={item}
                  onClick={() => setCurrentView(viewKey === 'mylibrary' ? 'library' : viewKey === 'lifeshop' ? 'shop' : viewKey === 'legacyadvisor' ? 'advisor' : viewKey)}
                  className={`hover:text-white transition-colors py-2 relative ${isActive ? 'text-white' : ''}`}
                 >
                   {item}
                   {isActive && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>}
                 </button>
               );
            })}
          </div>

          {/* Wallet Button */}
          <button 
            onClick={connectWallet}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all border border-white/10 ${
              isWalletConnected 
                ? 'bg-gradient-to-r from-emerald-900 to-emerald-800 text-emerald-300 border-emerald-700/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                : 'bg-white/5 hover:bg-white/10 text-white shadow-lg'
            }`}
          >
            {isWalletConnected ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {walletAddress}
              </span>
            ) : (
              "Connect Wallet"
            )}
          </button>
        </div>
      </nav>

      <main>
        {/* ================= HERO SECTION (HOME) ================= */}
        {currentView === 'home' && (
          <div className="bg-[#0B1120] min-h-[calc(100vh-80px)] relative overflow-hidden text-white flex flex-col items-center">
            
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/30 rounded-full blur-[120px] mix-blend-screen"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-purple-900/20 rounded-full blur-[100px] mix-blend-screen"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto text-center pt-24 px-6">
              <div className="inline-block mb-6 px-4 py-1 rounded-full border border-indigo-500/30 bg-indigo-900/30 text-indigo-300 text-xs font-bold tracking-[0.2em] uppercase">
                Web3 Legacy Protocol
              </div>
              <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl font-medium leading-tight mb-8">
                Your Story,<br/> 
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-white to-amber-100 italic pr-2">
                  Eternally Preserved.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
                BeyondMemories secures your most precious moments on the blockchain and brings them to life in an immersive Metaverse sanctuary.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button onClick={() => setCurrentView('library')} className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-full text-white font-medium shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all transform hover:scale-105">
                  Start Your Legacy
                </button>
                <button onClick={() => setCurrentView('metaverse')} className="px-8 py-4 bg-transparent border border-white/20 hover:bg-white/5 rounded-full text-white font-medium backdrop-blur-sm transition-all flex items-center gap-2 group">
                  <span>Enter Metaverse</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="relative z-10 mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-6 w-full pb-20">
              {[
                { title: 'Metaverse Sanctuary', desc: 'A persistent 3D world where your memories live as artifacts.', icon: '🏛️' },
                { title: 'AI Guardian', desc: 'Gemini AI analyzes and organizes your legacy for future generations.', icon: '🤖' },
                { title: 'Blockchain Security', desc: 'Immutable storage ensures your story can never be deleted.', icon: '⛓️' }
              ].map((card, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-2xl hover:bg-white/10 transition-colors group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{card.icon}</div>
                  <h3 className="font-serif text-xl font-bold mb-2 text-indigo-100">{card.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= METAVERSE VIEW ================= */}
        {currentView === 'metaverse' && (
             <div className="h-[calc(100vh-80px)] w-full relative bg-black">
                 <Scene3D images={[]} /> {/* Reusing the existing robust 3D scene */}
                 <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-xs text-center pointer-events-none">
                    Use <span className="font-bold text-white">WASD</span> or <span className="font-bold text-white">Arrows</span> to explore your Sanctuary
                 </div>
             </div>
        )}

        {/* ================= LIBRARY VIEW ================= */}
        {currentView === 'library' && (
          <div className="max-w-7xl mx-auto px-6 py-12">
            <h2 className="font-serif text-4xl text-slate-800 mb-8">My Memory Vault</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left: Input */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 sticky top-24">
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4">New Entry</h3>
                  <p className="text-slate-500 mb-6 text-sm">Describe a moment you wish to freeze in time. Our AI will analyze its emotional core.</p>
                  
                  <textarea 
                    value={memoryInput}
                    onChange={(e) => setMemoryInput(e.target.value)}
                    placeholder="It was a rainy Tuesday in November..."
                    className="w-full h-48 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-0 transition-colors resize-none font-serif text-lg leading-relaxed text-slate-700 placeholder:text-slate-300 mb-6"
                  />
                  
                  <button 
                    onClick={handleSaveMemory}
                    disabled={isAnalyzing || !memoryInput.trim()}
                    className="w-full py-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-indigo-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Analyzing Essence...
                      </>
                    ) : (
                      "Encrypt & Save to Chain"
                    )}
                  </button>
                </div>
              </div>

              {/* Right: List */}
              <div className="lg:col-span-7 space-y-6">
                 {memories.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-96 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                     <span className="text-4xl mb-4">🕯️</span>
                     <p>Your vault is empty. Write your first memory.</p>
                   </div>
                 ) : (
                   memories.map((mem) => (
                     <div key={mem.id} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow border border-slate-100 group">
                        <div className="flex justify-between items-start mb-4">
                           <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{mem.date}</span>
                           <div className="flex gap-2">
                              {mem.emotions.map(emo => (
                                <span key={emo} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">{emo}</span>
                              ))}
                           </div>
                        </div>
                        <p className="font-serif text-xl text-slate-700 leading-relaxed mb-6 group-hover:text-indigo-900 transition-colors">
                          "{mem.content}"
                        </p>
                        <div className="pt-4 border-t border-slate-50 flex gap-2">
                           {mem.themes.map(theme => (
                             <span key={theme} className="text-xs text-slate-400">#{theme}</span>
                           ))}
                        </div>
                     </div>
                   ))
                 )}
              </div>
            </div>
          </div>
        )}

        {/* ================= SHOP VIEW ================= */}
        {currentView === 'shop' && (
          <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
             {/* Sidebar */}
             <div className="lg:w-64 bg-white border-r border-slate-200 p-6 space-y-8">
               <h3 className="font-serif text-xl font-bold">Life-Shop</h3>
               <div className="space-y-2">
                 {['All', 'Monuments', 'Decorations', 'Univers'].map(cat => (
                   <button 
                    key={cat}
                    onClick={() => setShopFilter(cat as any)}
                    className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${shopFilter === cat ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                   >
                     {cat}
                   </button>
                 ))}
               </div>
               
               <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs text-amber-800 font-medium mb-1">Your Balance</p>
                  <p className="text-xl font-bold text-amber-600">1,240.50 MEME</p>
               </div>
             </div>

             {/* Grid */}
             <div className="flex-1 bg-slate-50 p-8">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {PRODUCTS.filter(p => shopFilter === 'All' || p.category === shopFilter).map(product => (
                    <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all group">
                       <div className="h-48 overflow-hidden relative">
                         <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                         <span className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white ${
                           product.rarity === 'Legendary' ? 'bg-purple-600' :
                           product.rarity === 'Immortal' ? 'bg-amber-500' :
                           product.rarity === 'Rare' ? 'bg-indigo-500' : 'bg-slate-500'
                         }`}>
                           {product.rarity}
                         </span>
                       </div>
                       <div className="p-5">
                          <p className="text-xs text-slate-400 mb-1">{product.category}</p>
                          <h4 className="font-serif text-lg font-bold text-slate-800 mb-3">{product.title}</h4>
                          <div className="flex items-center justify-between">
                             <span className="font-bold text-indigo-600">{product.price} ETH</span>
                             <button className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded hover:bg-indigo-600 transition-colors">Purchase</button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
             </div>
          </div>
        )}

        {/* ================= ADVISOR VIEW ================= */}
        {currentView === 'advisor' && (
          <div className="max-w-4xl mx-auto px-6 py-12 h-[calc(100vh-80px)] flex flex-col">
            <div className="text-center mb-10">
              <h2 className="font-serif text-3xl text-slate-800 mb-2">The Legacy Advisor</h2>
              <p className="text-slate-500 text-sm">A philosophical AI guide for your digital eternity.</p>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto mb-8 space-y-8 pr-4 scrollbar-hide">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                     <div className="w-10 h-10 rounded-full bg-slate-900 flex-shrink-0 flex items-center justify-center mr-4 text-xl shadow-lg border-2 border-amber-500/30">🦉</div>
                  )}
                  
                  <div className={`max-w-2xl p-8 rounded-sm shadow-md ${
                    msg.role === 'user' 
                      ? 'bg-white text-slate-700 border-l-4 border-indigo-500' 
                      : 'bg-[#fdfbf7] text-slate-800 border border-stone-200 font-serif leading-relaxed relative'
                  }`}>
                    {msg.role === 'ai' && <span className="absolute -top-3 left-4 bg-[#fdfbf7] px-2 text-xs text-amber-600 font-bold uppercase tracking-widest border border-stone-200">The Scroll</span>}
                    <p className={msg.role === 'ai' ? 'first-letter:text-4xl first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-amber-700' : ''}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex justify-start animate-pulse">
                   <div className="w-10 h-10 rounded-full bg-slate-900 mr-4"></div>
                   <div className="bg-[#fdfbf7] p-8 rounded-sm shadow-sm border border-stone-200 w-64 h-24 flex items-center justify-center">
                      <span className="font-serif italic text-slate-400">Inscribing answer...</span>
                   </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="relative">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdvisorSubmit()}
                placeholder="Ask a question about life, legacy, or the future..."
                className="w-full py-5 px-6 pr-16 bg-white rounded-full border border-slate-200 shadow-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-600 placeholder:text-slate-300 transition-all"
              />
              <button 
                onClick={handleAdvisorSubmit}
                disabled={!chatInput.trim() || isAiTyping}
                className="absolute right-2 top-2 bottom-2 w-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
              >
                ↑
              </button>
            </div>
          </div>
        )}

        {/* ================= TOKENOMICS VIEW ================= */}
        {currentView === 'tokenomics' && (
          <div className="bg-slate-900 min-h-[calc(100vh-80px)] text-white p-6 md:p-12">
             <div className="max-w-6xl mx-auto">
               <h2 className="font-serif text-4xl mb-12 border-b border-white/10 pb-6">Protocol Statistics</h2>
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                 
                 {/* PIE CHART (CSS Conic Gradient) */}
                 <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700">
                   <h3 className="text-lg font-bold text-slate-300 mb-8">Token Distribution</h3>
                   <div className="flex flex-col md:flex-row items-center gap-12">
                      <div className="relative w-64 h-64 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                           style={{
                             background: `conic-gradient(
                               #4f46e5 0% 40%, 
                               #fbbf24 40% 65%, 
                               #10b981 65% 85%, 
                               #ef4444 85% 100%
                             )`
                           }}>
                         <div className="absolute inset-4 bg-slate-800 rounded-full flex items-center justify-center">
                           <span className="font-serif text-2xl font-bold">100M</span>
                         </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3"><span className="w-3 h-3 bg-indigo-600 rounded-full"></span><span>Community (40%)</span></div>
                        <div className="flex items-center gap-3"><span className="w-3 h-3 bg-amber-400 rounded-full"></span><span>Staking Rewards (25%)</span></div>
                        <div className="flex items-center gap-3"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span><span>Development (20%)</span></div>
                        <div className="flex items-center gap-3"><span className="w-3 h-3 bg-red-500 rounded-full"></span><span>Liquidity (15%)</span></div>
                      </div>
                   </div>
                 </div>

                 {/* BAR CHART (CSS Flex) */}
                 <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-300 mb-8">Staking APY Forecast</h3>
                    <div className="flex-1 flex items-end justify-between gap-4 px-4 pb-4 border-b border-slate-600">
                        {[85, 65, 45, 30, 15].map((h, i) => (
                          <div key={i} className="w-full relative group">
                            <div 
                              style={{height: `${h}%`}} 
                              className="w-full bg-gradient-to-t from-indigo-900 to-indigo-500 rounded-t-sm group-hover:to-amber-400 transition-all cursor-pointer relative"
                            >
                              <span className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs font-bold transition-opacity">{h}%</span>
                            </div>
                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-slate-400">Year {i+1}</span>
                          </div>
                        ))}
                    </div>
                 </div>
               </div>

               {/* CTA */}
               <div className="mt-12 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-12 text-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                 <div className="relative z-10">
                   <h3 className="font-serif text-3xl font-bold mb-4">Secure Your Legacy Today</h3>
                   <p className="max-w-xl mx-auto mb-8 opacity-90">Invest in the eternity of your memories. Stakers receive premium Metaverse plots.</p>
                   <button className="px-8 py-3 bg-white text-orange-700 font-bold rounded-full hover:bg-slate-100 transition-colors">
                     Buy $MEME Token
                   </button>
                 </div>
               </div>

             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
