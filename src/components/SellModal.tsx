import React, { useState, useEffect } from 'react';
import ConfirmationModal from './ConfirmationModal';
import { HoldingWithCalc } from '@/types'; // Need to export this or define locally if not exported

interface SellModalProps {
    isOpen: boolean;
    holding: any; // HoldingWithCalc, using any temporarily to avoid import issues if not exported
    onConfirm: (price: number) => void;
    onCancel: () => void;
}

export default function SellModal({ isOpen, holding, onConfirm, onCancel }: SellModalProps) {
    const [sellPrice, setSellPrice] = useState('');
    const [step, setStep] = useState<1 | 2>(1); // 1 = Input/Confirm, 2 = Final Warning

    useEffect(() => {
        if (isOpen && holding) {
            // Pre-fill with CMP or AVG? User usually sells at CMP.
            // Let's leave empty or set to CMP if available. 
            // holding might have cmp from calculations.
            setSellPrice(holding.cmp ? holding.cmp.toString() : '');
            setStep(1);
        }
    }, [isOpen, holding]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2); // Move to double confirmation
    };

    const handleFinalConfirm = () => {
        const price = parseFloat(sellPrice);
        if (price > 0) {
            onConfirm(price);
            setSellPrice(''); // Reset
        }
    };

    if (!isOpen || !holding) return null;

    if (step === 2) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-white mb-2">⚠️ Final Confirmation</h3>
                        <p className="text-gray-300 mb-6">
                            Double Check: You are selling <strong>{holding.quantity}</strong> units of <strong>{holding.etfSymbol}</strong> at ₹{sellPrice}.
                            <br /><br />
                            Profit/Loss will be realized immediately.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleFinalConfirm}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
                            >
                                Confirm SELL
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Sell {holding.etfSymbol}</h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-gray-700/50 p-3 rounded-lg text-sm text-gray-300">
                            <div className="flex justify-between mb-1">
                                <span>Quantity:</span>
                                <span className="font-medium text-white">{holding.quantity}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Buy Price:</span>
                                <span className="font-medium text-white">₹{holding.buyPrice}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Sell Price</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={sellPrice}
                                onChange={(e) => setSellPrice(e.target.value)}
                                placeholder="Enter sell price"
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
                            >
                                Next
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
