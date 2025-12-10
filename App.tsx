import React, { useState, useRef, useEffect } from 'react';
import { analyzeMemory, askLegacyAdvisor } from './services/geminiService';
import { audioService } from './services/audioService';
import { Memory, ChatMessage, Product } from './types';
import Scene3D from './components/Scene3D';

// --- MOCK DATA FOR SHOP ---
const PRODUCTS: Product[] = [
  { id: '1', title: 'Marble Mausoleum', category: 'Monuments', price: 500, rarity: 'Legendary', image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=600' },
  { id: '2', title: 'Eternal Garden', category: 'Univers', price: 200, rarity: 'Rare', image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=600' },
  { id: '3', title: 'Digital Candle', category: 'Decorations', price: 50, rarity: 'Classic', image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=600' },
  { id: '4', title: 'Ancestral Statue', category: 'Monuments', price: 1200, rarity: 'Immortal', image: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=600' },
  { id: '5', title: 'Nebula Skybox', category: 'Univers', price: 800, rarity: 'Legendary', image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=600' },
  { id: '6', title: 'Golden Ring', category: 'Decorations', price: 100, rarity: 'Classic', image: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&q=80&w=600' },
];

export type OriginTheme = 'European' | 'African' | 'Asian';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'onboarding' | 'library' | 'shop' | 'advisor' | 'statistics' | 'metaverse'>('home');

  // --- ECONOMY STATE ---
  const [balance, setBalance] = useState(2500); // Credits/Essence
  const [inventory, setInventory] = useState<string[]>([]); // Array of Product IDs
  const [equippedItemId, setEquippedItemId] = useState<string | null>(null); // For Monuments/Environments

  // --- ORIGIN / THEME STATE ---
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<OriginTheme>('European');

  // --- ONBOARDING / UPLOAD STATE ---
  const [uploadAge, setUploadAge] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadImage, setUploadImage] = useState<string | null>(null);

  // --- LIBRARY STATE ---
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryInput, setMemoryInput] = useState('');
  const [libraryImage, setLibraryImage] = useState<string | null>(null);
  const [libraryAge, setLibraryAge] = useState('');
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
  const handleNavChange = (view: typeof currentView) => {
      if (view !== currentView) {
          audioService.playNav();
          setCurrentView(view);
      }
  };

  const handleStartLegacyClick = () => {
    audioService.playClick();
    setShowOriginModal(true);
  };

  const handleOriginSelection = (theme: OriginTheme) => {
    audioService.playSuccess();
    setSelectedTheme(theme);
    setShowOriginModal(false);
    setCurrentView('onboarding'); 
  };

  // Handle Image Upload for Onboarding
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      audioService.playClick();
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setUploadImage(imageUrl);
    }
  };

  // Handle Image Upload for Library
  const handleLibraryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      audioService.playClick();
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setLibraryImage(imageUrl);
    }
  };

  const handleFinishOnboarding = async () => {
    if (!uploadDesc.trim()) return;
    
    audioService.playClick();
    setIsAnalyzing(true);
    // Analyze the initial memory
    const { emotions, themes } = await analyzeMemory(uploadDesc);
    
    const newMemory: Memory = {
      id: Date.now().toString(),
      content: uploadDesc,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      emotions,
      themes,
      image: uploadImage || undefined,
      ageAtMoment: uploadAge
    };

    setMemories([newMemory, ...memories]);
    
    // Reset and go to library
    setUploadAge('');
    setUploadDesc('');
    setUploadImage(null);
    setIsAnalyzing(false);
    audioService.playSuccess();
    setCurrentView('library');
  };

  const handleSaveMemory = async () => {
    if (!memoryInput.trim()) return;
    audioService.playClick();
    setIsAnalyzing(true);
    
    const { emotions, themes } = await analyzeMemory(memoryInput);
    
    const newMemory: Memory = {
      id: Date.now().toString(),
      content: memoryInput,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      emotions,
      themes,
      image: libraryImage || undefined,
      ageAtMoment: libraryAge
    };

    setMemories([newMemory, ...memories]);
    setMemoryInput('');
    setLibraryImage(null);
    setLibraryAge('');
    setIsAnalyzing(false);
    audioService.playSuccess();
  };

  const handlePurchase = (product: Product) => {
    if (inventory.includes(product.id)) {
      audioService.playClick();
      // Logic to equip if it's a monument
      if (product.category === 'Monuments') {
         if (equippedItemId === product.id) {
           setEquippedItemId(null); 
         } else {
           setEquippedItemId(product.id); 
           audioService.playSuccess();
           alert(`You have transformed your Metaverse into the ${product.title}.`);
         }
      }
      return;
    }

    if (balance >= product.price) {
      audioService.playClick();
      setBalance(prev => prev - product.price);
      setInventory(prev => [...prev, product.id]);
      audioService.playSuccess();
      // Auto equip monuments on purchase
      if (product.category === 'Monuments') {
        setEquippedItemId(product.id);
        alert(`You purchased ${product.title}. Your world has been transformed.`);
      } else {
        alert(`You purchased ${product.title}. It has been added to your Metaverse.`);
      }
    } else {
      audioService.playError();
      alert("Insufficient Essence credits.");
    }
  };

  const handleAdvisorSubmit = async () => {
    if (!chatInput.trim()) return;
    audioService.playClick();
    
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
    audioService.playSuccess();
  };

  return (
    <div className="min-h-screen bg-brand-black text-slate-900 font-sans selection:bg-brand-purple selection:text-white">
      
      {/* --- ORIGIN SELECTION MODAL --- */}
      {showOriginModal && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
          <div className="max-w-5xl w-full bg-brand-surface border border-brand-purple/20 rounded-2xl p-8 md:p-12 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/10 rounded-full blur-[80px]"></div>
            
            <h2 className="text-3xl md:text-5xl font-serif text-white text-center mb-4">Honor Your Roots</h2>
            <p className="text-slate-400 text-center mb-12 max-w-lg mx-auto">
              Your heritage shapes your digital sanctuary. Select your origin to customize your Metaverse architecture.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* African Card */}
              <button 
                onClick={() => handleOriginSelection('African')}
                onMouseEnter={() => audioService.playNav()}
                className="group relative h-96 rounded-xl overflow-hidden border border-white/10 hover:border-brand-yellow/50 transition-all hover:scale-105"
              >
                <img src="https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=800&auto=format&fit=crop" alt="African" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 text-left w-full">
                  <h3 className="text-3xl font-serif text-brand-yellow mb-2">African</h3>
                  <p className="text-xs text-slate-300 font-medium tracking-widest uppercase">Warmth, Earth, & Gold</p>
                  <p className="mt-2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-500">
                    A sanctuary built from the eternal earth, bathed in golden sunset light.
                  </p>
                </div>
              </button>

              {/* European Card */}
              <button 
                onClick={() => handleOriginSelection('European')}
                onMouseEnter={() => audioService.playNav()}
                className="group relative h-96 rounded-xl overflow-hidden border border-white/10 hover:border-brand-purple/50 transition-all hover:scale-105"
              >
                <img src="https://images.unsplash.com/photo-1552432552-06c0b3d6ee56?q=80&w=800&auto=format&fit=crop" alt="European" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 text-left w-full">
                  <h3 className="text-3xl font-serif text-brand-purple mb-2">European</h3>
                  <p className="text-xs text-slate-300 font-medium tracking-widest uppercase">Marble, History, & Class</p>
                  <p className="mt-2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-500">
                    Grand halls of white marble and classic columns echoing through time.
                  </p>
                </div>
              </button>

              {/* Asian Card */}
              <button 
                onClick={() => handleOriginSelection('Asian')}
                onMouseEnter={() => audioService.playNav()}
                className="group relative h-96 rounded-xl overflow-hidden border border-white/10 hover:border-brand-pink/50 transition-all hover:scale-105"
              >
                <img src="https://images.unsplash.com/photo-1528360983277-13d9b152c6d4?q=80&w=800&auto=format&fit=crop" alt="Asian" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 text-left w-full">
                  <h3 className="text-3xl font-serif text-brand-pink mb-2">Asian</h3>
                  <p className="text-xs text-slate-300 font-medium tracking-widest uppercase">Zen, Nature, & Harmony</p>
                  <p className="mt-2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-500">
                    A peaceful retreat of red lacquer, jade, and whispering paper lanterns.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- STICKY NAVIGATION --- */}
      <nav className="sticky top-0 z-50 bg-brand-black/90 backdrop-blur-md border-b border-white/10 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleNavChange('home')}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-purple to-brand-pink flex items-center justify-center shadow-[0_0_15px_rgba(157,142,255,0.4)] group-hover:shadow-[0_0_25px_rgba(157,142,255,0.6)] transition-shadow">
              <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span className="font-serif text-2xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-brand-pink via-white to-brand-purple group-hover:to-brand-pink transition-all duration-500">
              BeyondMemories
            </span>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium tracking-wide text-slate-400">
            {['Home', 'MyLibrary', 'Life-Shop', 'Legacy Advisor', 'Statistics'].map((item) => {
               const viewKey = item.toLowerCase().replace(' ', '').replace('-', '') as any;
               const isActive = currentView === (viewKey === 'mylibrary' ? 'library' : viewKey === 'lifeshop' ? 'shop' : viewKey === 'legacyadvisor' ? 'advisor' : viewKey);
               return (
                 <button 
                  key={item}
                  onClick={() => handleNavChange(viewKey === 'mylibrary' ? 'library' : viewKey === 'lifeshop' ? 'shop' : viewKey === 'legacyadvisor' ? 'advisor' : viewKey)}
                  className={`hover:text-brand-pink transition-colors py-2 relative ${isActive ? 'text-white' : ''}`}
                 >
                   {item}
                   {isActive && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-brand-purple shadow-[0_0_10px_rgba(157,142,255,0.8)]"></span>}
                 </button>
               );
            })}
          </div>

          {/* Balance / Profile Button */}
          <div className="px-6 py-2.5 rounded-lg text-sm font-bold bg-white/5 border border-white/10 text-white shadow-lg flex items-center gap-2">
            <span className="text-brand-purple">{balance} Essence</span>
            <div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* ================= HERO SECTION (HOME) ================= */}
        {currentView === 'home' && (
          <div className="bg-brand-black min-h-[calc(100vh-80px)] relative overflow-hidden text-white flex flex-col items-center animate-fade-in">
            
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-purple/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-brand-pink/10 rounded-full blur-[100px] mix-blend-screen animate-pulse-slow"></div>
              <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-brand-yellow/5 rounded-full blur-[80px] mix-blend-screen"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto text-center pt-24 px-6">
              <div className="inline-block mb-6 px-4 py-1 rounded-full border border-brand-purple/30 bg-brand-purple/10 text-brand-purple text-xs font-bold tracking-[0.2em] uppercase">
                Digital Legacy Protocol
              </div>
              <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl font-medium leading-tight mb-8">
                Your Story,<br/> 
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-yellow via-brand-pink to-brand-purple italic pr-2">
                  Eternally Preserved.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
                BeyondMemories secures your most precious moments in a secure vault and brings them to life in an immersive Metaverse sanctuary.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button onClick={handleStartLegacyClick} className="px-8 py-4 bg-gradient-to-r from-brand-purple to-brand-pink hover:from-brand-purple/90 hover:to-brand-pink/90 rounded-full text-black font-bold shadow-[0_0_30px_rgba(157,142,255,0.4)] transition-all transform hover:scale-105">
                  Start Your Legacy
                </button>
                <button 
                  onClick={() => handleNavChange('metaverse')} 
                  className="px-8 py-4 bg-transparent border border-white/20 hover:bg-white/5 rounded-full text-white font-medium backdrop-blur-sm transition-all flex items-center gap-2 group"
                >
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
                { title: 'Secure Cloud Storage', desc: 'Encrypted storage ensures your story is safe and private.', icon: '☁️' }
              ].map((card, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-2xl hover:bg-white/10 transition-colors group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300 grayscale group-hover:grayscale-0">{card.icon}</div>
                  <h3 className="font-serif text-xl font-bold mb-2 text-brand-pink">{card.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= ONBOARDING / UPLOAD VIEW ================= */}
        {currentView === 'onboarding' && (
          <div className="min-h-[calc(100vh-80px)] bg-brand-black flex items-center justify-center p-6 relative overflow-hidden animate-fade-in">
             {/* Background Image depending on Theme */}
             <div className="absolute inset-0 opacity-20 pointer-events-none">
                 <img 
                    src={selectedTheme === 'African' ? 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&q=80' : 
                         selectedTheme === 'Asian' ? 'https://images.unsplash.com/photo-1542640244-7e672d6bd4e8?auto=format&fit=crop&q=80' :
                         'https://images.unsplash.com/photo-1548625361-12c62c2cb989?auto=format&fit=crop&q=80'}
                    className="w-full h-full object-cover blur-sm"
                    alt="Theme bg"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/80 to-transparent"></div>
             </div>

             <div className="max-w-3xl w-full bg-brand-surface/90 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-2xl shadow-2xl relative z-10">
                <div className="text-center mb-10">
                   <h2 className="font-serif text-4xl text-white mb-2">The Harvest</h2>
                   <p className="text-slate-400">Deposit your first memory seed into the {selectedTheme} vault.</p>
                </div>

                <div className="space-y-6">
                   {/* 1. Photo Upload */}
                   <div className="flex flex-col items-center justify-center">
                      <div className="w-full h-64 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center hover:bg-white/5 transition-colors cursor-pointer relative overflow-hidden bg-black/50">
                          {uploadImage ? (
                            <img src={uploadImage} alt="Preview" className="w-full h-full object-contain" />
                          ) : (
                            <>
                              <span className="text-4xl mb-2">📸</span>
                              <span className="text-sm text-slate-400">Click to upload a photograph</span>
                            </>
                          )}
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                   </div>

                   {/* 2. Age Input */}
                   <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-pink mb-2">Age at that moment</label>
                      <input 
                        type="text" 
                        value={uploadAge}
                        onChange={(e) => setUploadAge(e.target.value)}
                        placeholder="e.g. 7 years old"
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-4 text-white placeholder:text-slate-600 focus:border-brand-purple focus:outline-none"
                      />
                   </div>

                   {/* 3. Description */}
                   <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-purple mb-2">Memory Description</label>
                      <textarea 
                        value={uploadDesc}
                        onChange={(e) => setUploadDesc(e.target.value)}
                        placeholder="Describe what happened, how you felt..."
                        className="w-full h-32 bg-black/50 border border-white/10 rounded-lg p-4 text-white placeholder:text-slate-600 focus:border-brand-purple focus:outline-none resize-none font-serif"
                      />
                   </div>

                   <button 
                      onClick={handleFinishOnboarding}
                      disabled={!uploadDesc || isAnalyzing}
                      className="w-full py-4 mt-4 bg-gradient-to-r from-brand-purple to-brand-pink text-black font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(157,142,255,0.3)]"
                   >
                      {isAnalyzing ? "Saving to Vault..." : "Preserve Memory Forever"}
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* ================= METAVERSE VIEW ================= */}
        {currentView === 'metaverse' && (
             <div className="h-[calc(100vh-80px)] w-full relative bg-black animate-fade-in">
                 <Scene3D 
                    memories={memories} 
                    theme={selectedTheme} 
                    inventory={inventory} 
                    equippedItemId={equippedItemId}
                 /> 
                 <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-xs text-center pointer-events-none z-10">
                    Use <span className="font-bold text-brand-yellow">ZQSD / WASD / Arrows</span> to walk.<br/>
                    Camera follows you automatically. Click memories to zoom.
                 </div>
                 <div className="absolute top-8 right-8 text-white/30 text-xs text-right pointer-events-none z-10">
                    Theme: <span className="font-bold text-white">
                      {equippedItemId === '1' ? 'Marble Mausoleum' : equippedItemId === '4' ? 'Ancestral Sanctuary' : `${selectedTheme} Architecture`}
                    </span><br/>
                    Objects Owned: <span className="font-bold text-brand-pink">{inventory.length}</span>
                 </div>
             </div>
        )}

        {/* ================= LIBRARY VIEW ================= */}
        {currentView === 'library' && (
          <div className="max-w-7xl mx-auto px-6 py-12 bg-white min-h-[calc(100vh-80px)] animate-fade-in">
            <h2 className="font-serif text-4xl text-black mb-8">My Memory Vault</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left: Input */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-50 p-8 rounded-2xl shadow-xl border border-slate-100 sticky top-24">
                  <h3 className="text-sm font-bold text-brand-purple uppercase tracking-widest mb-4">New Entry</h3>
                  <p className="text-slate-500 mb-6 text-sm">Describe a moment you wish to freeze in time. Our AI will analyze its emotional core.</p>
                  
                  {/* Library Image Upload */}
                  <div className="mb-4">
                     <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Photo (Optional)</label>
                     <div className="relative w-full h-32 border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer">
                        {libraryImage ? (
                          <img src={libraryImage} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-slate-400 text-xs">Click to upload image</span>
                        )}
                        <input type="file" accept="image/*" onChange={handleLibraryImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                     </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Age at moment (Optional)</label>
                    <input 
                      type="text" 
                      value={libraryAge}
                      onChange={(e) => setLibraryAge(e.target.value)}
                      placeholder="e.g. 21"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                    />
                  </div>

                  <textarea 
                    value={memoryInput}
                    onChange={(e) => setMemoryInput(e.target.value)}
                    placeholder="It was a rainy Tuesday in November..."
                    className="w-full h-32 p-4 bg-white rounded-xl border-2 border-slate-200 focus:border-brand-purple focus:ring-0 transition-colors resize-none font-serif text-lg leading-relaxed text-slate-700 placeholder:text-slate-300 mb-6"
                  />
                  
                  <button 
                    onClick={handleSaveMemory}
                    disabled={isAnalyzing || !memoryInput.trim()}
                    className="w-full py-4 bg-black text-white font-medium rounded-xl hover:bg-brand-purple hover:text-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Analyzing Essence...
                      </>
                    ) : (
                      "Encrypt & Add to Vault"
                    )}
                  </button>
                </div>
              </div>

              {/* Right: List */}
              <div className="lg:col-span-7 space-y-6">
                 {memories.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-96 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                     <span className="text-4xl mb-4 grayscale opacity-50">🕯️</span>
                     <p>Your vault is empty. Write your first memory.</p>
                   </div>
                 ) : (
                   memories.map((mem) => (
                     <div key={mem.id} className="bg-slate-50 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-shadow border border-slate-100 group flex flex-col md:flex-row gap-6">
                        {/* Memory Image Display */}
                        {mem.image && (
                          <div className="w-full md:w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-slate-200 relative">
                             <img src={mem.image} alt="Memory" className="w-full h-full object-cover" />
                             {mem.ageAtMoment && (
                               <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-1 font-bold">
                                 Age: {mem.ageAtMoment}
                               </div>
                             )}
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-4">
                             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{mem.date}</span>
                             <div className="flex gap-2">
                                {mem.emotions.map(emo => (
                                  <span key={emo} className="px-2 py-1 bg-brand-purple/10 text-brand-purple text-xs rounded-full font-medium">{emo}</span>
                                ))}
                             </div>
                          </div>
                          <p className="font-serif text-xl text-slate-700 leading-relaxed mb-6 group-hover:text-black transition-colors">
                            "{mem.content}"
                          </p>
                          <div className="pt-4 border-t border-slate-200 flex gap-2">
                             {mem.themes.map(theme => (
                               <span key={theme} className="text-xs text-slate-500 font-medium">#{theme}</span>
                             ))}
                          </div>
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
          <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] bg-white animate-fade-in">
             {/* Sidebar */}
             <div className="lg:w-64 bg-slate-50 border-r border-slate-200 p-6 space-y-8">
               <h3 className="font-serif text-xl font-bold text-black">Life-Shop</h3>
               <div className="space-y-2">
                 {['All', 'Monuments', 'Decorations', 'Univers'].map(cat => (
                   <button 
                    key={cat}
                    onClick={() => { audioService.playNav(); setShopFilter(cat as any); }}
                    className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${shopFilter === cat ? 'bg-brand-purple text-white font-bold shadow-lg shadow-brand-purple/30' : 'text-slate-600 hover:bg-white'}`}
                   >
                     {cat}
                   </button>
                 ))}
               </div>
               
               <div className="p-4 bg-brand-yellow/10 rounded-xl border border-brand-yellow/20">
                  <p className="text-xs text-slate-500 font-medium mb-1">Your Balance</p>
                  <p className="text-xl font-bold text-brand-purple">{balance.toFixed(0)} Essence</p>
               </div>
             </div>

             {/* Grid */}
             <div className="flex-1 bg-white p-8">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {PRODUCTS.filter(p => shopFilter === 'All' || p.category === shopFilter).map(product => {
                    const isOwned = inventory.includes(product.id);
                    const isEquipped = equippedItemId === product.id;
                    const isMonument = product.category === 'Monuments';

                    return (
                    <div key={product.id} className={`bg-slate-50 rounded-xl shadow-sm border overflow-hidden hover:shadow-xl hover:shadow-brand-purple/10 transition-all group ${isEquipped ? 'border-brand-purple ring-2 ring-brand-purple/30' : 'border-slate-100'}`}>
                       <div className="h-48 overflow-hidden relative">
                         <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                         <span className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-black ${
                           product.rarity === 'Legendary' ? 'bg-brand-pink' :
                           product.rarity === 'Immortal' ? 'bg-brand-yellow' :
                           product.rarity === 'Rare' ? 'bg-brand-purple text-white' : 'bg-slate-200'
                         }`}>
                           {product.rarity}
                         </span>
                         {isEquipped && (
                           <div className="absolute inset-0 bg-brand-purple/20 flex items-center justify-center backdrop-blur-[2px]">
                              <span className="bg-black/80 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-brand-purple">Active Environment</span>
                           </div>
                         )}
                       </div>
                       <div className="p-5">
                          <p className="text-xs text-slate-400 mb-1">{product.category}</p>
                          <h4 className="font-serif text-lg font-bold text-slate-800 mb-3">{product.title}</h4>
                          <div className="flex items-center justify-between">
                             <span className="font-bold text-brand-purple">{product.price} Credits</span>
                             <button 
                               onClick={() => handlePurchase(product)}
                               disabled={(!isOwned && balance < product.price)}
                               className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                                 isOwned 
                                  ? (isMonument 
                                      ? (isEquipped ? 'bg-brand-purple text-white cursor-pointer hover:bg-red-500 hover:text-white' : 'bg-black text-white hover:bg-brand-purple')
                                      : 'bg-green-100 text-green-700 cursor-default')
                                  : balance < product.price 
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-black text-white hover:bg-brand-pink hover:text-black'
                               }`}
                             >
                               {isOwned 
                                 ? (isMonument 
                                     ? (isEquipped ? 'Unequip' : 'Equip World') 
                                     : 'Owned') 
                                 : 'Purchase'}
                             </button>
                          </div>
                       </div>
                    </div>
                  )})}
               </div>
             </div>
          </div>
        )}

        {/* ================= ADVISOR VIEW ================= */}
        {currentView === 'advisor' && (
          <div className="max-w-4xl mx-auto px-6 py-12 h-[calc(100vh-80px)] flex flex-col bg-white animate-fade-in">
            <div className="text-center mb-10">
              <h2 className="font-serif text-3xl text-black mb-2">The Legacy Advisor</h2>
              <p className="text-slate-500 text-sm">A philosophical AI guide for your digital eternity.</p>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto mb-8 space-y-8 pr-4 scrollbar-hide">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                     <div className="w-10 h-10 rounded-full bg-black flex-shrink-0 flex items-center justify-center mr-4 text-xl shadow-lg border-2 border-brand-yellow">🦉</div>
                  )}
                  
                  <div className={`max-w-2xl p-8 rounded-sm shadow-md ${
                    msg.role === 'user' 
                      ? 'bg-brand-purple/10 text-slate-800 border-l-4 border-brand-purple' 
                      : 'bg-[#fafafa] text-slate-800 border border-slate-200 font-serif leading-relaxed relative'
                  }`}>
                    {msg.role === 'ai' && <span className="absolute -top-3 left-4 bg-[#fafafa] px-2 text-xs text-brand-purple font-bold uppercase tracking-widest border border-slate-200">The Scroll</span>}
                    <p className={msg.role === 'ai' ? 'first-letter:text-4xl first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-brand-purple' : ''}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex justify-start animate-pulse">
                   <div className="w-10 h-10 rounded-full bg-black mr-4"></div>
                   <div className="bg-[#fafafa] p-8 rounded-sm shadow-sm border border-slate-200 w-64 h-24 flex items-center justify-center">
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
                className="w-full py-5 px-6 pr-16 bg-slate-50 rounded-full border border-slate-200 shadow-xl focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple text-slate-600 placeholder:text-slate-300 transition-all"
              />
              <button 
                onClick={handleAdvisorSubmit}
                disabled={!chatInput.trim() || isAiTyping}
                className="absolute right-2 top-2 bottom-2 w-12 bg-brand-purple hover:bg-brand-black text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
              >
                ↑
              </button>
            </div>
          </div>
        )}

        {/* ================= STATISTICS VIEW (EX TOKENOMICS) ================= */}
        {currentView === 'statistics' && (
          <div className="bg-brand-black min-h-[calc(100vh-80px)] text-white p-6 md:p-12 animate-fade-in">
             <div className="max-w-6xl mx-auto">
               <h2 className="font-serif text-4xl mb-12 border-b border-white/10 pb-6 text-brand-pink">Community Statistics</h2>
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                 
                 {/* PIE CHART */}
                 <div className="bg-brand-surface p-8 rounded-2xl border border-white/5">
                   <h3 className="text-lg font-bold text-slate-300 mb-8">Memory Distribution</h3>
                   <div className="flex flex-col md:flex-row items-center gap-12">
                      <div className="relative w-64 h-64 rounded-full shadow-[0_0_50px_rgba(157,142,255,0.2)]"
                           style={{
                             background: `conic-gradient(
                               #9D8EFF 0% 40%, 
                               #FFDF8C 40% 65%, 
                               #FFA5B7 65% 85%, 
                               #ffffff 85% 100%
                             )`
                           }}>
                         <div className="absolute inset-4 bg-brand-surface rounded-full flex items-center justify-center">
                           <span className="font-serif text-2xl font-bold">10K+</span>
                         </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3"><span className="w-3 h-3 bg-brand-purple rounded-full"></span><span>Happy Memories (40%)</span></div>
                        <div className="flex items-center gap-3"><span className="w-3 h-3 bg-brand-yellow rounded-full"></span><span>Family (25%)</span></div>
                        <div className="flex items-center gap-3"><span className="w-3 h-3 bg-brand-pink rounded-full"></span><span>Milestones (20%)</span></div>
                        <div className="flex items-center gap-3"><span className="w-3 h-3 bg-white rounded-full"></span><span>Travel (15%)</span></div>
                      </div>
                   </div>
                 </div>

                 {/* BAR CHART */}
                 <div className="bg-brand-surface p-8 rounded-2xl border border-white/5 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-300 mb-8">Legacy Growth (Years)</h3>
                    <div className="flex-1 flex items-end justify-between gap-4 px-4 pb-4 border-b border-white/10">
                        {[85, 65, 45, 30, 15].map((h, i) => (
                          <div key={i} className="w-full relative group">
                            <div 
                              style={{height: `${h}%`}} 
                              className="w-full bg-gradient-to-t from-brand-purple/20 to-brand-purple rounded-t-sm group-hover:to-brand-yellow transition-all cursor-pointer relative"
                            >
                            </div>
                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-slate-500">Year {i+1}</span>
                          </div>
                        ))}
                    </div>
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