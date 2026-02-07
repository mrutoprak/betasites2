
import React from 'react';
import { FlashcardManager } from '../components/FlashcardManager';

export const Library: React.FC = () => {
  return (
    <div className="w-full animate-fade-in">
        <div className="mb-6">
            <h2 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">Library</h2>
        </div>
        <FlashcardManager />
    </div>
  );
};
