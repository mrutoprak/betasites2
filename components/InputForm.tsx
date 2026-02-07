
import React, { useState } from 'react';
import { PRIMARY_LANGUAGES } from '../types';

interface InputFormProps {
  onGenerate: (word: string, langCode: string) => Promise<void>;
  isLoading: boolean;
  activeLang: string;
  setActiveLang: (code: string) => void;
}

export const InputForm: React.FC<InputFormProps> = ({ onGenerate, isLoading, activeLang, setActiveLang }) => {
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      try {
        await onGenerate(input, activeLang);
        // Only clear input if generation was successful
        setInput('');
      } catch (e) {
        // Keep input if there was an error (allows user to retry or switch provider easily)
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mb-10 space-y-8">
      
      {/* iOS Segmented Control */}
      <div className="bg-[#E5E5EA] p-1 rounded-xl flex items-stretch">
        {Object.entries(PRIMARY_LANGUAGES).map(([code, name]) => {
          const isActive = activeLang === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setActiveLang(code)}
              className={`flex-1 py-1.5 rounded-[0.5rem] text-[11px] font-semibold transition-all duration-200 ${
                isActive 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* Clean Input Field */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className={`relative bg-white rounded-2xl shadow-sm border border-gray-200 transition-all duration-300 ${input.trim() ? 'ring-2 ring-blue-500/20 border-blue-500' : 'focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500'}`}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a word to memorize..."
            className="w-full px-6 py-5 text-lg bg-transparent outline-none text-[#1D1D1F] placeholder-gray-400 font-medium rounded-2xl"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`absolute right-2 top-2 bottom-2 aspect-square rounded-xl flex items-center justify-center transition-all duration-300 ${
              isLoading || !input.trim()
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-[#007AFF] text-white shadow-md hover:bg-[#0062cc] active:scale-95'
            }`}
          >
            {isLoading ? (
              <i className="fas fa-spinner fa-spin text-lg"></i>
            ) : (
              <i className="fas fa-arrow-up text-lg"></i>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
