'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmationModal from './ConfirmationModal';

interface Profile {
    id: string;
    name: string;
}

interface ProfilesConfig {
    activeProfileId: string;
    profiles: Profile[];
}

export default function ProfileSwitcher() {
    const router = useRouter();
    const [config, setConfig] = useState<ProfilesConfig | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
    const [profileToDelete, setProfileToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            const res = await fetch('/api/profiles');
            const data = await res.json();
            setConfig(data);
        } catch (error) {
            console.error('Error fetching profiles', error);
        }
    };

    const handleSwitch = async (id: string) => {
        if (config?.activeProfileId === id) {
            setIsOpen(false);
            return;
        }

        try {
            await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'switch', id }),
            });
            await fetchProfiles();
            setIsOpen(false);
            // Force reload to refresh all data for new profile
            window.location.reload();
        } catch (error) {
            console.error('Error switching profile', error);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', name: newProfileName }),
            });

            if (res.ok) {
                // Auto switch to new profile?
                const data = await res.json();
                await handleSwitch(data.profile.id);
                setNewProfileName('');
                setShowCreate(false);
            }
        } catch (error) {
            console.error('Error creating profile', error);
        }
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent switching
        setProfileToDelete(id);
        setDeleteStep(1);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!profileToDelete) return;

        if (deleteStep === 1) {
            setDeleteStep(2);
            return;
        }

        try {
            const res = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id: profileToDelete }),
            });

            if (res.ok) {
                setDeleteConfirmOpen(false);
                setProfileToDelete(null);
                setDeleteStep(1);

                // If we deleted the active profile, the API handles logic, but frontend needs full reload
                // Just fetch profiles first to check active
                await fetchProfiles();
                // If we are currently on the deleted profile (or if it was active), we should reload
                // Simple logic: Always reload to be safe and fresh
                window.location.reload();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete profile');
            }
        } catch (error) {
            console.error('Error deleting profile', error);
        }
    };

    const cancelDelete = () => {
        setDeleteConfirmOpen(false);
        setProfileToDelete(null);
        setDeleteStep(1);
    };

    if (!config) return null;

    const activeProfile = config.profiles.find(p => p.id === config.activeProfileId);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors text-sm"
            >
                <span className="text-gray-400">Profile:</span>
                <span className="font-semibold text-emerald-400">{activeProfile?.name || 'Loading...'}</span>
                <span className="text-gray-500 text-xs">▼</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-2 space-y-1">
                        {config.profiles.map(profile => (
                            <button
                                key={profile.id}
                                onClick={() => handleSwitch(profile.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center group ${config.activeProfileId === profile.id
                                    ? 'bg-emerald-900/30 text-emerald-400 font-medium'
                                    : 'text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                <span>
                                    {profile.name}
                                    {config.activeProfileId === profile.id && <span className="ml-2">✓</span>}
                                </span>

                                {profile.id !== 'main' && (
                                    <span
                                        onClick={(e) => handleDeleteClick(profile.id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                                        title="Delete Profile"
                                    >
                                        🗑️
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-gray-700 p-2">
                        {!showCreate ? (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 flex items-center gap-2"
                            >
                                <span>➕</span> Create New Profile
                            </button>
                        ) : (
                            <form onSubmit={handleCreate} className="p-1 space-y-2">
                                <input
                                    type="text"
                                    placeholder="Profile Name (e.g. Test)"
                                    className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-emerald-500"
                                    value={newProfileName}
                                    onChange={e => setNewProfileName(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreate(false)}
                                        className="flex-1 py-1 text-xs text-gray-400 hover:bg-gray-700 rounded"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newProfileName.trim()}
                                        className="flex-1 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded disabled:opacity-50"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteConfirmOpen}
                title={deleteStep === 1 ? "Delete Profile?" : "⚠️ Final Warning"}
                message={
                    deleteStep === 1
                        ? "Are you sure you want to delete this profile? All its data will be lost."
                        : "Double Check: This CANNOT be undone. Are you sure?"
                }
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                confirmText={deleteStep === 1 ? "Yes, Delete" : "PERMANENTLY DELETE"}
                cancelText="Cancel"
                isDanger={true}
            />
        </div>
    );
}
