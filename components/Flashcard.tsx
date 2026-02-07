
import React, { useState, useEffect, useRef } from 'react';
import { Flashcard as FlashcardType } from '../types';

interface FlashcardProps {
  card: FlashcardType;
  onDelete: (id: string) => void;
  onUpdate: (card: FlashcardType) => void;
  onEdit: (card: FlashcardType) => void;
}

const TIMER_SEQUENCE = [5, 25, 120, 3600, 18000];

export const Flashcard: React.FC<FlashcardProps> = ({ card, onDelete, onUpdate, onEdit }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showMask, setShowMask] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const isRTL = card.lang === 'ar';

  // --- Timer Logic ---
  useEffect(() => {
    if (card.lastTimerStartedAt && card.nextTimer) {
      const calculateRemaining = () => {
        const elapsed = Math.floor((Date.now() - (card.lastTimerStartedAt || 0)) / 1000);
        const remaining = (card.nextTimer || 0) - elapsed;
        return remaining > 0 ? remaining : 0;
      };

      const rem = calculateRemaining();
      if (rem > 0) {
        setTimeLeft(rem);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
          const currentRem = calculateRemaining();
          setTimeLeft(currentRem);
          if (currentRem <= 0 && timerRef.current) clearInterval(timerRef.current);
        }, 1000);
      } else {
        setTimeLeft(0);
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [card.id, card.lastTimerStartedAt, card.nextTimer]);

  const handleManualReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timerRef.current) clearInterval(timerRef.current);
    onUpdate({ ...card, nextTimer: 5, lastTimerStartedAt: undefined });
    setTimeLeft(0);
  };

  // --- TTS Logic ---
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const getBestVoice = (langCode: string) => {
    if (voices.length === 0) return null;
    const target = langCode.split('-')[0].toLowerCase();
    
    if (target === 'ar') {
      return voices.find(v => v.lang.startsWith('ar-SA')) 
          || voices.find(v => v.lang.startsWith('ar')) 
          || voices.find(v => v.name.toLowerCase().includes('arabic')) || null;
    }
    const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(target));
    return langVoices.find(v => v.name.includes('Google')) || langVoices[0] || null;
  };

  const handleTTS = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    
    setIsSpeaking(true);
    
    // Ensure voices are loaded if array was empty
    if (voices.length === 0) {
        const freshVoices = window.speechSynthesis.getVoices();
        setVoices(freshVoices);
    }

    const speak = (text: string, lang: string) => new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        const tLang = lang === 'ar' ? 'ar-SA' : (lang === 'en' ? 'en-US' : (lang.includes('-') ? lang : `${lang}-${lang.toUpperCase()}`));
        u.lang = tLang;
        const v = getBestVoice(lang);
        if (v) u.voice = v;
        u.rate = 0.85;
        
        u.onend = () => resolve();
        u.onerror = () => resolve();
        
        window.speechSynthesis.speak(u);
    });

    try {
        await speak(card.title, 'tr-TR');
        await new Promise(r => setTimeout(r, 400));
        await speak(card.target, card.lang);
        
        const currentIdx = TIMER_SEQUENCE.indexOf(card.nextTimer || 5);
        const nextVal = currentIdx < TIMER_SEQUENCE.length - 1 ? TIMER_SEQUENCE[currentIdx + 1] : TIMER_SEQUENCE[TIMER_SEQUENCE.length - 1];
        onUpdate({ 
          ...card, 
          nextTimer: nextVal, 
          lastTimerStartedAt: Date.now() 
        });
    } catch (err) {
        console.error("TTS Error", err);
    } finally {
        setIsSpeaking(false);
    }
  };

  const cleanLabel = (text: string) => text.replace(/^(Line\s*\d+:|Keyword:)\s*/i, '').trim();

  return (
    <div style={{ perspective: '1000px' }} className="h-[360px] w-full group relative select-none" onClick={() => setIsFlipped(!isFlipped)}>
       
       {/* Drag Handle */}
       <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 drag-handle cursor-grab active:cursor-grabbing p-2 opacity-0 group-hover:opacity-100 transition-opacity">
         <div className="w-8 h-1 bg-gray-300 rounded-full shadow-sm"></div>
       </div>

       {/* Edit Controls */}
       <div className="absolute top-4 right-4 z-50 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 no-flip">
           <button onClick={(e) => { e.stopPropagation(); onEdit(card); }} className="w-8 h-8 rounded-full bg-white/90 backdrop-blur text-gray-600 shadow-lg border border-gray-100 flex items-center justify-center hover:bg-[#007AFF] hover:text-white transition-all"><i className="fas fa-pen text-[10px]"></i></button>
           <button onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="w-8 h-8 rounded-full bg-white/90 backdrop-blur text-red-500 shadow-lg border border-gray-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash text-[10px]"></i></button>
       </div>

      <div className={`relative w-full h-full transition-all duration-500 shadow-lg hover:shadow-xl rounded-[1.5rem] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
        
        {/* FRONT FACE - Apple Widget Style */}
        <div className="absolute inset-0 flex flex-col bg-white rounded-[1.5rem] overflow-hidden [backface-visibility:hidden] border border-gray-100">
           
           {/* Image Area */}
           <div className="relative h-[65%] w-full bg-gray-50 flex items-center justify-center overflow-hidden">
               {card.imgSrc ? <img src={card.imgSrc} className="w-full h-full object-cover" /> : <div className="text-4xl font-bold text-gray-200">{card.title[0]}</div>}
               
               {showMask && <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-20"><i className="fas fa-eye-slash text-gray-300 text-3xl mb-2"></i></div>}
               
               {/* Controls */}
               <button onClick={(e) => { e.stopPropagation(); setShowMask(!showMask); }} className="absolute bottom-3 left-3 z-30 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:bg-black/70 transition-all flex items-center justify-center"><i className={`fas ${showMask ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i></button>
               
               <button onClick={handleTTS} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm text-black shadow-lg transition-all flex items-center justify-center hover:scale-105 active:scale-95 ${showMask ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
                 <i className={`fas ${isSpeaking ? 'fa-spinner fa-spin' : 'fa-play'} text-lg ml-0.5`}></i>
               </button>
           </div>

           {/* Text Area */}
           <div className="h-[35%] flex flex-col items-center justify-center p-4 text-center bg-white">
               <h3 className="text-xl font-bold text-[#1D1D1F] leading-tight mb-1 line-clamp-2">{cleanLabel(card.title)}</h3>
               {timeLeft > 0 ? (
                 <span className="text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Review in {Math.ceil(timeLeft/60)}m</span>
               ) : (
                 <span className="text-[10px] font-medium text-gray-400">Ready to review</span>
               )}
           </div>
        </div>

        {/* BACK FACE */}
        <div className="absolute inset-0 flex flex-col p-6 text-white text-center [backface-visibility:hidden] [transform:rotateY(180deg)] bg-[#1D1D1F] rounded-[1.5rem] border border-gray-800">
            <button onClick={handleManualReset} className="absolute top-4 left-4 text-gray-500 hover:text-white transition-colors no-flip"><i className="fas fa-undo text-xs"></i></button>
            
            <div className="flex-1 flex flex-col justify-center items-center gap-4">
                <div className="bg-white/10 px-4 py-2 rounded-lg">
                     <span className="text-lg font-bold text-yellow-400 tracking-wide block">{cleanLabel(card.subtext.split('\n')[0])}</span>
                </div>

                <h2 className={`text-3xl font-bold ${isRTL ? 'font-serif' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>{card.target}</h2>
                
                <div className="w-full bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-sm text-gray-300 leading-snug font-medium line-clamp-4 italic">
                    "{card.subtext.split('\n').slice(1).join('\n').replace(/^["']|["']$/g, '').trim()}"
                    </p>
                </div>
            </div>
            
            <div className="mt-2 flex justify-center gap-1">
                {TIMER_SEQUENCE.map((t, i) => (
                    <div key={t} className={`h-1 rounded-full w-4 ${TIMER_SEQUENCE.indexOf(card.nextTimer || 5) >= i ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
