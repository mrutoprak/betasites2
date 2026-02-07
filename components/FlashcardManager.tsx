
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Folder, Flashcard as FlashcardType } from '../types';
import { Flashcard } from './Flashcard';
import Sortable from 'sortablejs';

export const FlashcardManager: React.FC = () => {
  const { 
    folders, 
    createFolder: storeCreateFolder, 
    deleteFolder: storeDeleteFolder, 
    updateFoldersState, 
    updateCardInFolder, 
    deleteCardFromFolder,
    importFolder
  } = useStore();

  const [activeFolderId, setActiveFolderId] = useState<string>('default');
  
  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashcardType | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = document.getElementById('cards-grid');
    if (el) {
        const sortable = Sortable.create(el, {
            animation: 200,
            ghostClass: 'opacity-50',
            handle: '.drag-handle',
            onEnd: (evt) => {
                const activeFolder = folders.find(f => f.id === activeFolderId);
                if (activeFolder && typeof evt.oldIndex === 'number' && typeof evt.newIndex === 'number') {
                    const newCards = [...activeFolder.cards];
                    const [moved] = newCards.splice(evt.oldIndex, 1);
                    newCards.splice(evt.newIndex, 0, moved);
                    const updatedFolders = folders.map(f => f.id === activeFolderId ? { ...f, cards: newCards } : f);
                    updateFoldersState(updatedFolders);
                }
            }
        });
        return () => sortable.destroy();
    }
  }, [folders, activeFolderId, updateFoldersState]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    storeCreateFolder(newFolderName);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const handleDeleteFolder = () => {
    if (activeFolderId === 'default') return;
    if (confirm("Delete this folder and all its cards?")) {
        storeDeleteFolder(activeFolderId);
        setActiveFolderId('default');
    }
  };

  const handleExport = () => {
    const activeFolder = folders.find(f => f.id === activeFolderId);
    if (!activeFolder) return;

    // Filter cards to include only requested raw data fields
    const exportData = {
        id: activeFolder.id,
        name: activeFolder.name,
        cards: activeFolder.cards.map(c => ({
            title: c.title,
            target: c.target,
            subtext: c.subtext,
            lang: c.lang,
            imgSrc: c.imgSrc,
            nextTimer: c.nextTimer
        }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeFolder.name.replace(/\s+/g, '_')}_Backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            importFolder(json);
        } catch (err) {
            alert("Invalid file format.");
        }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const deleteCard = (id: string) => {
      if (!confirm("Delete card?")) return;
      deleteCardFromFolder(activeFolderId, id);
  };

  const openEditModal = (card: FlashcardType) => {
      setEditingCard(card);
      setShowEditModal(true);
  };

  const saveEditedCard = () => {
      if (editingCard) {
          updateCardInFolder(activeFolderId, editingCard);
          setShowEditModal(false);
          setEditingCard(null);
      }
  };

  const activeFolder = folders.find(f => f.id === activeFolderId) || folders[0];

  return (
    <div className="w-full relative animate-fade-in-up">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />

        {/* Folder Pills - iOS Scroll */}
        <div className="sticky top-0 z-[60] bg-[#F5F5F7]/95 backdrop-blur-sm pt-2 pb-4 mb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
                {folders.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setActiveFolderId(f.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                            activeFolderId === f.id 
                            ? 'bg-black text-white shadow-md' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        {f.name} <span className="opacity-50 ml-1">{f.cards.length}</span>
                    </button>
                ))}
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button onClick={() => setShowNewFolderModal(true)} className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50 transition-colors" title="New Folder">
                    <i className="fas fa-plus text-xs"></i>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50 transition-colors" title="Import JSON">
                    <i className="fas fa-upload text-xs"></i>
                </button>
            </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#1D1D1F]">{activeFolder?.name}</h2>
            <div className="flex gap-2">
                 <button 
                    onClick={handleExport} 
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-xs font-medium shadow-sm group"
                    title="Download Backup"
                 >
                    <i className="fas fa-download text-gray-400 group-hover:text-[#007AFF] transition-colors"></i>
                    <span>Export JSON</span>
                </button>
                {activeFolderId !== 'default' && (
                    <button onClick={handleDeleteFolder} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Delete Folder">
                        <i className="fas fa-trash-alt text-sm"></i>
                    </button>
                )}
            </div>
        </div>

        {/* Grid */}
        <div id="cards-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {activeFolder?.cards.map(card => (
                <Flashcard 
                    key={card.id} 
                    card={card} 
                    onDelete={deleteCard}
                    onUpdate={(updated) => updateCardInFolder(activeFolderId, updated)}
                    onEdit={openEditModal}
                />
            ))}
            {(!activeFolder?.cards || activeFolder.cards.length === 0) && (
                <div className="col-span-full flex flex-col items-center justify-center py-24 text-gray-300">
                    <div className="w-16 h-16 bg-gray-200 rounded-2xl mb-4 flex items-center justify-center">
                         <i className="fas fa-folder-open text-2xl text-gray-400"></i>
                    </div>
                    <p className="font-medium text-sm">No cards yet</p>
                </div>
            )}
        </div>

        {/* Modal: New Folder */}
        {showNewFolderModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                <div className="bg-white p-6 rounded-[1.5rem] w-full max-w-sm shadow-2xl animate-fade-in-up">
                    <h3 className="text-lg font-bold text-black mb-4">New Collection</h3>
                    <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder Name" className="w-full px-4 py-3 bg-gray-100 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-[#007AFF] text-sm font-medium" />
                    <div className="flex gap-3">
                        <button onClick={() => setShowNewFolderModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-200">Cancel</button>
                        <button onClick={handleCreateFolder} className="flex-1 py-2.5 bg-[#007AFF] text-white font-bold rounded-xl text-xs hover:bg-[#0062cc]">Create</button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal: Edit Card */}
        {showEditModal && editingCard && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                <div className="bg-white p-6 rounded-[1.5rem] w-full max-w-md shadow-2xl animate-fade-in-up">
                    <h3 className="text-lg font-bold text-black mb-4">Edit Card</h3>
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Front (Meaning)</label>
                            <input value={editingCard.title} onChange={e => setEditingCard({...editingCard, title: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-[#007AFF]" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Back (Target)</label>
                            <input value={editingCard.target} onChange={e => setEditingCard({...editingCard, target: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#007AFF]" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Story</label>
                            <textarea value={editingCard.subtext} onChange={e => setEditingCard({...editingCard, subtext: e.target.value})} rows={3} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#007AFF]" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-200">Cancel</button>
                        <button onClick={saveEditedCard} className="flex-1 py-3 bg-[#007AFF] text-white font-bold rounded-xl text-xs hover:bg-[#0062cc]">Save</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
