
import React, { useState, useEffect } from 'react';
import { InputForm } from '../components/InputForm';
import { ResultCard } from '../components/ResultCard';
import { generateMnemonicText, generateMnemonicImage } from '../services/geminiService';
import { getDailyUsage, incrementDailyUsage } from '../services/storageService';
import { MnemonicResult, LoadingState } from '../types';
import { useStore } from '../context/StoreContext';

export const Generator: React.FC = () => {
  const { activeLang, setActiveLang } = useStore();
  
  const [mnemonicData, setMnemonicData] = useState<MnemonicResult | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<LoadingState>({ isTextLoading: false, isImageLoading: false });
  const [error, setError] = useState<string | null>(null);

  // --- API Config State ---
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('hafiza_gemini_key') || '');

  // Persist key changes
  useEffect(() => {
    localStorage.setItem('hafiza_gemini_key', geminiKey);
  }, [geminiKey]);

  // --- Usage Tracking ---
  const [usageStats, setUsageStats] = useState({ textCount: 0, imageCount: 0 });

  // Update stats whenever the specific key changes
  useEffect(() => {
    const stats = getDailyUsage(geminiKey);
    setUsageStats({ textCount: stats.textCount, imageCount: stats.imageCount });
  }, [geminiKey]);

  const handleGenerate = async (input: string, lang: string): Promise<void> => {
    setIsLoading({ isTextLoading: true, isImageLoading: false });
    setError(null);
    setMnemonicData(null);
    setGeneratedImage(null);

    try {
      const result = await generateMnemonicText(input, lang, geminiKey);
      setMnemonicData(result);
      
      const newStatsText = incrementDailyUsage('text', geminiKey);
      setUsageStats(s => ({ ...s, textCount: newStatsText.textCount }));

      setIsLoading({ isTextLoading: false, isImageLoading: true });

      try {
        const imageUrl = await generateMnemonicImage(result.imagePrompt, geminiKey);
        setGeneratedImage(imageUrl);
        const newStatsImg = incrementDailyUsage('image', geminiKey);
        setUsageStats(s => ({ ...s, imageCount: newStatsImg.imageCount }));

      } catch (imgErr: any) {
        if (imgErr.message === "KEY_REQUIRED") {
            setError("Gemini requires a valid API key. Please enter it in Settings.");
        } else if (imgErr.message === "QUOTA_EXHAUSTED") {
            setError("Image Quota exhausted. Try a different key.");
        } else {
            setError(imgErr instanceof Error ? imgErr.message : "Image generation failed");
        }
      }
      
    } catch (err: any) {
      if (err.message === "QUOTA_EXHAUSTED") {
        setError("API quota exceeded. Try a different key.");
      } else {
        setError(err instanceof Error ? err.message : "Generation failed. Check settings and API keys.");
      }
      throw err;
    } finally {
      setIsLoading({ isTextLoading: false, isImageLoading: false });
    }
  };

  // Calculate percentage for progress bar (Assume 1500 daily limit for Gemini)
  const DAILY_LIMIT = 1500;
  const usagePercent = Math.min((usageStats.textCount / DAILY_LIMIT) * 100, 100);

  return (
    <div className="w-full animate-fade-in flex flex-col items-center">
        <div className="text-center mb-6 space-y-1">
            <h2 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">Create</h2>
            <p className="text-gray-400 text-sm font-medium">Turn words into unforgettable stories.</p>
        </div>

        {/* API Settings Panel */}
        <div className="w-full max-w-xl mx-auto mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
            <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                <i className="fas fa-sliders-h text-gray-400 text-xs"></i>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">API Configuration</span>
            </div>

            {/* Gemini Config Area */}
            <div className="p-4 bg-white space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-gray-500 uppercase">Gemini API Key</h4>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">Get Key</a>
                </div>
                <input 
                    placeholder={process.env.API_KEY ? "Default key loaded. Paste to override..." : "Paste your Gemini API Key here..."}
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 transition-colors"
                />
                {geminiKey && (
                    <p className="text-[10px] text-green-600 flex items-center gap-1">
                        <i className="fas fa-check-circle"></i> Using Custom Key
                    </p>
                )}
            </div>
            
            {/* Usage Stats Footer */}
            <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] font-medium text-gray-500">
                     <span className="flex items-center gap-1.5">
                        <i className="fas fa-chart-pie opacity-70"></i>
                        Used Today: <b className="text-[#1D1D1F]">{usageStats.textCount + usageStats.imageCount}</b> requests
                     </span>
                     <span>Limit: ~{DAILY_LIMIT}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${usagePercent > 90 ? 'bg-red-500' : 'bg-[#007AFF]'}`}
                        style={{ width: `${usagePercent}%` }}
                    ></div>
                </div>

                <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400">
                        {geminiKey ? "Tracking: Custom Key" : "Tracking: Default Key"}
                    </span>
                </div>
            </div>
        </div>
        
        <InputForm 
            onGenerate={handleGenerate} 
            isLoading={isLoading.isTextLoading || isLoading.isImageLoading}
            activeLang={activeLang}
            setActiveLang={setActiveLang}
        />

        {error && (
            <div className="w-full max-w-lg mx-auto mb-8 p-4 bg-white border border-red-100 rounded-2xl shadow-sm flex flex-col items-center gap-3 text-center animate-fade-in-up">
                <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                    <i className="fas fa-exclamation text-sm"></i>
                </div>
                <div>
                    <p className="font-semibold text-red-600 text-sm">{error}</p>
                </div>
            </div>
        )}

        {mnemonicData && (
        <div className="w-full mb-16 animate-fade-in-up">
            <ResultCard 
                data={mnemonicData} 
                imageUrl={generatedImage} 
                isImageLoading={isLoading.isImageLoading} 
            />
        </div>
        )}
    </div>
  );
};
