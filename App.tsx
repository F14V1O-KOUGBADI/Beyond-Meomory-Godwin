import React, { useState, useRef, useCallback } from 'react';
import { editImageWithAI } from './services/geminiService';
import CanvasEditor, { CanvasHandle } from './components/CanvasEditor';
import Scene3D from './components/Scene3D';
import { MemeState } from './types';

// Placeholder templates
const TEMPLATES = [
  'https://picsum.photos/id/1025/600/600',
  'https://picsum.photos/id/1074/600/600',
  'https://picsum.photos/id/1003/600/600',
  'https://picsum.photos/id/237/600/600',
];

export interface GalleryItem {
  url: string;
  roomId: 'library' | 'rotunda';
}

const App: React.FC = () => {
  const [state, setState] = useState<MemeState>({
    originalImage: null,
    currentImage: null,
    selectedCaption: '',
    topText: '',
    bottomText: '',
    isLoading: false,
    loadingMessage: '',
  });

  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  
  // Update gallery to store objects with room IDs
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  
  // Track where the user is in the 3D world
  const [currentRoom, setCurrentRoom] = useState<'library' | 'rotunda'>('library');

  const [editPrompt, setEditPrompt] = useState('');
  const canvasRef = useRef<CanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to convert URL/Blob to Base64
  const toBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      try {
        const base64 = await toBase64(file);
        setState(prev => ({ 
          ...prev, 
          originalImage: base64, 
          currentImage: base64, 
          selectedCaption: '' 
        }));
      } catch (e) {
        console.error("File read error", e);
      }
    }
  };

  const selectTemplate = async (url: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, loadingMessage: 'Loading template...' }));
      const response = await fetch(url);
      const blob = await response.blob();
      const base64 = await toBase64(blob);
      setState(prev => ({ 
        ...prev, 
        originalImage: base64, 
        currentImage: base64, 
        selectedCaption: '',
        isLoading: false
      }));
    } catch (e) {
      console.error("Template load error", e);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleAIEdit = async () => {
    if (!state.currentImage || !editPrompt.trim()) return;

    setState(prev => ({ ...prev, isLoading: true, loadingMessage: '🎨 Gemini is remixing your pixels...' }));

    try {
      const newImageBase64 = await editImageWithAI(state.currentImage, editPrompt);
      setState(prev => ({ 
        ...prev, 
        currentImage: newImageBase64, // Update displayed image
        isLoading: false 
      }));
      setEditPrompt('');
    } catch (error) {
      console.error(error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        loadingMessage: 'Failed to edit image.' 
      }));
      setTimeout(() => setState(prev => ({ ...prev, loadingMessage: '' })), 2000);
    }
  };

  const handleResetImage = () => {
    setState(prev => ({
      ...prev,
      currentImage: prev.originalImage
    }));
  };

  const addToGallery = () => {
    if (state.currentImage) {
        // Add image to the SPECIFIC room the user is currently in
        const newItem: GalleryItem = {
          url: state.currentImage,
          roomId: currentRoom
        };
        
        // Prevent exact duplicates in the same room if desired, or allow them
        setGallery(prev => [...prev, newItem]);
        
        // Optional: Switch to 3D mode automatically when adding
        setViewMode('3D');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-brand-500 selection:text-white pb-12">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-br from-brand-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20">
              <span className="text-xl">✨</span>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-300 to-blue-300">
              MemeGen AI
            </h1>
          </div>
          <div className="text-sm text-slate-400 hidden sm:block">
            Powered by Gemini 2.5
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Canvas/Preview */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-800/50 rounded-2xl p-4 shadow-xl border border-slate-700 backdrop-blur-sm relative overflow-hidden group min-h-[500px]">
              
              {/* View Mode Toggle */}
              <div className="absolute top-4 right-4 z-30 flex space-x-2 bg-slate-900/90 rounded-lg p-1 border border-slate-600 shadow-xl backdrop-blur-md">
                <button
                  onClick={() => setViewMode('2D')}
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                    viewMode === '2D' 
                      ? 'bg-brand-600 text-white shadow-lg scale-105' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  2D Editor
                </button>
                <button
                  onClick={() => setViewMode('3D')}
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                    viewMode === '3D' 
                      ? 'bg-brand-600 text-white shadow-lg scale-105' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  3D Museum
                </button>
              </div>

              {/* Display Area */}
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                {viewMode === '2D' ? (
                  <CanvasEditor 
                    ref={canvasRef}
                    imageSrc={state.currentImage}
                    topText={state.topText}
                    bottomText={state.bottomText}
                    caption={state.selectedCaption}
                  />
                ) : (
                  // Pass gallery (objects) and room handler
                  <Scene3D 
                    images={gallery.length > 0 ? gallery : (state.currentImage ? [{ url: state.currentImage, roomId: 'library' }] : [])} 
                    onRoomChange={setCurrentRoom}
                  />
                )}
              </div>

              {/* Loading Overlay */}
              {state.isLoading && (
                <div className="absolute inset-0 z-40 bg-slate-900/80 flex flex-col items-center justify-center backdrop-blur-sm transition-all duration-300">
                  <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-brand-300 font-medium animate-pulse">{state.loadingMessage}</p>
                </div>
              )}
            </div>
            
            {viewMode === '3D' && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center text-slate-400 text-sm flex items-center justify-between">
                <p>🏺 You are in the <span className="text-white font-bold uppercase">{currentRoom === 'library' ? 'Renaissance Library' : 'Winter Cabin'}</span>.</p>
                <div className="text-brand-400 font-bold">
                    Photos: {gallery.length}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Upload Section */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Source Image</h2>
              
              <div className="space-y-4">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  ref={fileInputRef}
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 font-medium transition-colors flex items-center justify-center gap-2 border border-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Upload Photo
                </button>

                <div className="grid grid-cols-4 gap-2">
                  {TEMPLATES.map((url, idx) => (
                    <button 
                      key={idx}
                      onClick={() => selectTemplate(url)}
                      className="relative aspect-square rounded-md overflow-hidden hover:opacity-80 transition-opacity focus:ring-2 focus:ring-brand-500"
                    >
                      <img src={url} alt="Template" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. AI Tools Section */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
              <h2 className="text-sm font-semibold text-brand-400 uppercase tracking-wider mb-4">AI Magic Tools</h2>
              
              <div className="space-y-4">
                {/* AI Edit */}
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Edit with AI (e.g. "Add a cat", "Make it retro")</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="Describe your edit..."
                      className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                    <button
                      onClick={handleAIEdit}
                      disabled={!editPrompt.trim() || !state.currentImage || state.isLoading}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Go
                    </button>
                  </div>
                </div>

                {/* Reset */}
                 <button 
                  onClick={handleResetImage}
                  disabled={!state.originalImage || state.originalImage === state.currentImage}
                  className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 disabled:opacity-0 transition-all"
                >
                  Reset to Original
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
                 {/* Add to 3D Button */}
                 <button
                  onClick={addToGallery}
                  disabled={!state.currentImage}
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 border border-amber-600 rounded-xl text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xl">🖼️</span> Add to {currentRoom === 'library' ? 'Library' : 'Cabin'}
                </button>

                {/* Download Button */}
                 <button
                  onClick={() => canvasRef.current?.download()}
                  disabled={!state.currentImage || viewMode === '3D'}
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-200 font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  {viewMode === '2D' ? 'Download Meme' : 'Switch to 2D to Download'}
                </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;