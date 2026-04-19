"use client";

import { useState, useTransition } from "react";
import { updateBioAction } from "./actions";

interface ProfileEditorProps {
    userId: string;
    initialBio: string;
}

export default function ProfileEditor({ userId, initialBio }: ProfileEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [bio, setBio] = useState(initialBio);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function handleSave() {
        setError(null);
        startTransition(async () => {
            try {
                await updateBioAction(userId, bio.trim());
                setIsEditing(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to update bio");
            }
        });
    }

    function handleCancel() {
        setBio(initialBio);
        setError(null);
        setIsEditing(false);
    }

    return (
        <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-black">Bio</h2>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="rounded-lg bg-[#050522] px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                        Edit
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="mt-3 space-y-3">
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell others a bit about yourself..."
                        rows={4}
                        maxLength={500}
                        className="w-full resize-none rounded-xl border border-black/10 bg-white px-4 py-3 text-neutral-700 placeholder:text-neutral-400 focus:border-[#050522] focus:outline-none focus:ring-1 focus:ring-[#050522]"
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-400">
                            {bio.length}/500
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCancel}
                                disabled={isPending}
                                className="rounded-lg border border-black/10 bg-white px-4 py-1.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isPending}
                                className="rounded-lg bg-[#050522] px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                            >
                                {isPending ? "Saving…" : "Save"}
                            </button>
                        </div>
                    </div>
                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}
                </div>
            ) : (
                <p className="mt-2 text-neutral-700">
                    {bio.trim() || "No bio added yet."}
                </p>
            )}
        </div>
    );
}
