import React from 'react';
import { Heart } from 'lucide-react';

export interface CustomModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  title,
  message,
  type,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-rose-950/20 backdrop-blur-md z-[3000] flex items-center justify-center p-6 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-white/95 border border-rose-100 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-scale-up backdrop-blur-lg">
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500 animate-pulse">
          <Heart size={22} fill="currentColor" />
        </div>
        <h3 className="text-base font-extrabold text-rose-800 tracking-wide">{title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed font-semibold px-2">{message}</p>
        <div className="flex space-x-3 pt-2">
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-2xl border border-rose-150 text-rose-700 text-xs font-extrabold bg-rose-50/50 hover:bg-rose-100/50 active:scale-95 transition"
            >
              取消
            </button>
          )}
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white text-xs font-extrabold shadow-md active:scale-95 transition"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
