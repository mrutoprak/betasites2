
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Folder, Flashcard } from '../types';
import { loadFolders, saveFolders, addCardToFolder as serviceAddCard } from '../services/storageService';

interface StoreContextType {
  activeLang: string;
  setActiveLang: (lang: string) => void;
  folders: Folder[];
  refreshFolders: () => void;
  createFolder: (name: string) => void;
  deleteFolder: (id: string) => void;
  importFolder: (folderData: any) => void;
  updateFoldersState: (newFolders: Folder[]) => void;
  addCard: (folderId: string, card: Omit<Flashcard, 'id' | 'createdAt'>) => Promise<void>;
  updateCardInFolder: (folderId: string, updatedCard: Flashcard) => void;
  deleteCardFromFolder: (folderId: string, cardId: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- Language State ---
  const [activeLang, setActiveLangState] = useState<string>(() => localStorage.getItem('hafiza_pref_lang') || 'en');

  const setActiveLang = (lang: string) => {
    setActiveLangState(lang);
    localStorage.setItem('hafiza_pref_lang', lang);
  };

  // --- Folders State ---
  const [folders, setFolders] = useState<Folder[]>([]);

  const refreshFolders = () => {
    setFolders(loadFolders());
  };

  useEffect(() => {
    refreshFolders();
  }, []);

  const updateFoldersState = (newFolders: Folder[]) => {
    setFolders(newFolders);
    saveFolders(newFolders);
  };

  const createFolder = (name: string) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: name,
      cards: []
    };
    const updated = [...folders, newFolder];
    updateFoldersState(updated);
  };

  const deleteFolder = (id: string) => {
    const updated = folders.filter(f => f.id !== id);
    updateFoldersState(updated);
  };

  const importFolder = (folderData: any) => {
    // Basic validation
    if (!folderData || typeof folderData.name !== 'string' || !Array.isArray(folderData.cards)) {
        alert("Invalid folder data format.");
        return;
    }

    // Create safe copy with new IDs to prevent collisions
    const newFolder: Folder = {
      id: `folder-imp-${Date.now()}`,
      name: folderData.name + (folders.some(f => f.name === folderData.name) ? ' (Imported)' : ''),
      cards: folderData.cards.map((c: any) => ({
        ...c,
        id: `card-imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }))
    };
    
    const updated = [...folders, newFolder];
    updateFoldersState(updated);
  };

  const addCard = async (folderId: string, card: Omit<Flashcard, 'id' | 'createdAt'>) => {
    await serviceAddCard(folderId, card);
    refreshFolders(); // Reload from storage to get the new state including compression logic results
  };

  const updateCardInFolder = (folderId: string, updatedCard: Flashcard) => {
    const updated = folders.map(f => {
      if (f.id === folderId) {
        return {
          ...f,
          cards: f.cards.map(c => c.id === updatedCard.id ? updatedCard : c)
        };
      }
      return f;
    });
    updateFoldersState(updated);
  };

  const deleteCardFromFolder = (folderId: string, cardId: string) => {
    const updated = folders.map(f => {
      if (f.id === folderId) {
        return {
          ...f,
          cards: f.cards.filter(c => c.id !== cardId)
        };
      }
      return f;
    });
    updateFoldersState(updated);
  };

  return (
    <StoreContext.Provider value={{
      activeLang,
      setActiveLang,
      folders,
      refreshFolders,
      createFolder,
      deleteFolder,
      importFolder,
      updateFoldersState,
      addCard,
      updateCardInFolder,
      deleteCardFromFolder
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
