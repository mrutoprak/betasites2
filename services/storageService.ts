
import { Folder, Flashcard } from "../types";

const STORAGE_KEY = 'hafiza_flashcards_v1';
const USAGE_KEY = 'hafiza_daily_usage_v2'; // Bumped version for new structure

interface UsageStats {
  textCount: number;
  imageCount: number;
}

interface UsageStorage {
  date: string;
  keys: Record<string, UsageStats>;
}

export const loadFolders = (): Folder[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    const defaultFolder: Folder = {
      id: 'default',
      name: 'General',
      cards: []
    };
    saveFolders([defaultFolder]);
    return [defaultFolder];
  } catch (e) {
    console.error("Failed to load folders", e);
    return [];
  }
};

export const saveFolders = (folders: Folder[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  } catch (e) {
    console.error("Failed to save folders", e);
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      alert("Storage full! Images might be too large.");
    }
  }
};

// --- Usage Tracking (Per Key) ---

const getKeyId = (apiKey?: string) => {
    // If no key provided, track as 'env_default'. Otherwise use the key itself.
    if (!apiKey || apiKey.trim() === '') return 'env_default';
    return apiKey.trim();
};

export const getDailyUsage = (apiKey?: string): UsageStats => {
  const today = new Date().toISOString().split('T')[0];
  const keyId = getKeyId(apiKey);

  try {
    const stored = localStorage.getItem(USAGE_KEY);
    if (stored) {
      const data: UsageStorage = JSON.parse(stored);
      // If date changed, return 0 (logic handles reset on save)
      if (data.date !== today) {
        return { textCount: 0, imageCount: 0 };
      }
      return data.keys[keyId] || { textCount: 0, imageCount: 0 };
    }
  } catch (e) { console.error(e); }
  
  return { textCount: 0, imageCount: 0 };
};

export const incrementDailyUsage = (type: 'text' | 'image', apiKey?: string) => {
  const today = new Date().toISOString().split('T')[0];
  const keyId = getKeyId(apiKey);
  
  let data: UsageStorage = { date: today, keys: {} };
  
  try {
    const stored = localStorage.getItem(USAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) {
        data = parsed;
      }
      // If date doesn't match, we keep the new 'data' object which resets everything
    }
  } catch(e) {}

  if (!data.keys[keyId]) {
    data.keys[keyId] = { textCount: 0, imageCount: 0 };
  }

  if (type === 'text') data.keys[keyId].textCount++;
  if (type === 'image') data.keys[keyId].imageCount++;

  localStorage.setItem(USAGE_KEY, JSON.stringify(data));
  return data.keys[keyId];
};

// --- Image Compression ---

export const compressImage = (src: string, maxWidth = 400, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = src;
      img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          // Maintain aspect ratio
          if (width > maxWidth) { 
              height *= maxWidth / width; 
              width = maxWidth; 
          }
          canvas.width = width; 
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            try {
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            } catch (e) {
                console.warn("Canvas export failed (likely CORS), saving original URL.", e);
                resolve(src);
            }
          } else {
            resolve(src);
          }
      };
      img.onerror = () => {
        console.warn("Image load failed, saving original URL.");
        resolve(src);
      };
  });
};

export const addCardToFolder = async (folderId: string, card: Omit<Flashcard, 'id' | 'createdAt'>) => {
  const folders = loadFolders();
  const folderIndex = folders.findIndex(f => f.id === folderId);
  
  if (folderIndex >= 0) {
    // Attempt to compress image if it is a URL or a Data URI (to ensure it's a small JPEG)
    let finalImg = card.imgSrc;
    if (finalImg && (finalImg.startsWith('http') || finalImg.startsWith('data:'))) { 
        finalImg = await compressImage(finalImg);
    }

    const newCard: Flashcard = {
      ...card,
      imgSrc: finalImg,
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now()
    };
    
    folders[folderIndex].cards.unshift(newCard);
    saveFolders(folders);
    return true;
  }
  return false;
};
