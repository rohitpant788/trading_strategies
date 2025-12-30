import React, { useState, useEffect } from 'react';
import { HoldingWithCalc } from '@/types'; // Or just Holding if Calc not needed, but likely passed from parent

interface EditHoldingModalProps {
    isOpen: boolean;
    holding: any | null; // using any to match flexible types or HoldingWithCalc
    onConfirm: (id: number, newPrice: number, newQty: number) => void;
    onCancel: () => void;
}

export default function EditHoldingModal({ isOpen, holding, onConfirm, onCancel }: EditHoldingModalProps) {
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('');

    useEffect(() => {
        if (holding) {
            setPrice(holding.buyPrice.toString());
            setQuantity(holding.quantity.toString());
        }
    }, [holding]);

    if (!isOpen || !holding) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(holding.id, parseFloat(price), parseInt(quantity));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4">✏️ Edit Holding</h2>

                <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-400">ETF</p>
                    <p className="font-medium text-white text-lg">{holding.etfSymbol}</p>
                    <p className="text-xs text-gray-500">{holding.etfName}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Buy Price</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                        <input
                            type="number"
                            required
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors text-white"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
