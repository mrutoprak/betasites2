
import React, { useState, useEffect } from 'react';
import { MnemonicResult, LANGUAGE_MAP } from '../types';
import { useStore } from '../context/StoreContext';

interface ResultCardProps {
  data: MnemonicResult;
  imageUrl: string | null;
  isImageLoading: boolean;
  onSave?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ data, imageUrl, isImageLoading, onSave }) => {
  const { folders, addCard } = useStore();
  const [isSaved, setIsSaved] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('default');

  const isRTL = data.targetLangCode === 'ar';
  
  // Reset saved state when data changes
  useEffect(() => { setIsSaved(false); }, [data]);

  // Handle folder selection state
  useEffect(() => {
    if (folders.length > 0) {
       // If currently selected folder no longer exists, reset to default or first available
       const currentExists = folders.some(f => f.id === selectedFolderId);
       
       if (!currentExists) {
           const defaultExists = folders.some(f => f.id === 'default');
           if (defaultExists) setSelectedFolderId('default');
           else setSelectedFolderId(folders[0].id);
       }
    }
  }, [folders, selectedFolderId]);

  const handleSave = async () => {
    await addCard(selectedFolderId, {
        title: data.meaning,
        target: data.targetWord,
        subtext: `${data.keyword}\n\n${data.story}`,
        lang: data.targetLangCode,
        imgSrc: imageUrl || ''
    });
    setIsSaved(true);
    if (onSave) onSave();
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col md:flex-row relative animate-fade-in-up">
      
      {/* Save Controls - Floating Pill */}
      <div className="absolute top-5 right-5 z-20 flex gap-2">
         {!isSaved && folders.length > 0 && (
             <div className="relative">
                <select 
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="appearance-none pl-4 pr-8 py-2 rounded-full bg-white/80 backdrop-blur-md border border-gray-200 text-xs font-medium text-gray-700 focus:outline-none shadow-sm cursor-pointer hover:bg-gray-50"
                >
                    {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
                <i className="fas fa-chevron-down absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none"></i>
             </div>
         )}
         <button 
            onClick={handleSave}
            disabled={isSaved}
            className={`px-5 py-2 rounded-full text-xs font-semibold shadow-sm transition-all flex items-center gap-2 ${
                isSaved 
                ? 'bg-green-100 text-green-700 cursor-default' 
                : 'bg-[#1D1D1F] text-white hover:bg-black active:scale-95'
            }`}
        >
            <i className={`fas ${isSaved ? 'fa-check' : 'fa-plus'}`}></i>
            {isSaved ? 'Saved' : 'Add to Library'}
        </button>
      </div>

      {/* Text Side */}
      <div className="w-full md:w-1/2 p-10 flex flex-col justify-center relative">
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Meaning</p>
          <h2 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">{data.meaning}</h2>
        </div>

        <div className="mb-8">
           <div className="flex items-baseline gap-3">
               <p 
                 className={`text-5xl font-bold text-[#007AFF] tracking-tight ${isRTL ? 'font-serif' : ''}`} 
                 lang={data.targetLangCode} 
                 dir={isRTL ? "rtl" : "ltr"}
               >
                 {data.targetWord}
               </p>
               <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold uppercase">{LANGUAGE_MAP[data.targetLangCode] || 'Word'}</span>
           </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100/50 flex gap-4 items-center">
             <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
                <i className="fas fa-volume-up text-sm"></i>
             </div>
             <div>
                <p className="text-[10px] font-bold text-orange-400 uppercase">Sounds Like</p>
                <p className="text-xl font-bold text-gray-800">{data.keyword}</p>
             </div>
          </div>

          <div className="pl-4 border-l-2 border-gray-200">
             <p className="text-base text-gray-600 leading-relaxed font-medium">
               {data.story.replace(/^["']|["']$/g, '')}
             </p>
          </div>
        </div>
      </div>

      {/* Image Side */}
      <div className="w-full md:w-1/2 bg-gray-50 relative min-h-[400px]">
        {isImageLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-[#007AFF] rounded-full animate-spin mb-4"></div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Visualizing...</p>
          </div>
        ) : imageUrl ? (
          <img 
              src={imageUrl} 
              alt={data.story} 
              className="absolute inset-0 w-full h-full object-cover" 
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
             <i className="fas fa-image text-4xl mb-2"></i>
          </div>
        )}
      </div>
    </div>
  );
};
