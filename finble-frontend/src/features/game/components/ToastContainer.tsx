import React from "react";
import { useGameStore } from "../store/useGameStore.ts";
import type { ToastMessage } from "../types/gameTypes.ts";

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({
  toast
}) => {
  const getToastStyle = (type: ToastMessage["type"]) => {
    const baseStyle = "mb-3 p-5 rounded-xl shadow-xl border-2 w-96 relative animate-fadeInScale backdrop-blur-sm mx-auto";

    switch (type) {
      case "success":
        return `${baseStyle} bg-green-100/90 border-green-400 text-green-900`;
      case "error":
        return `${baseStyle} bg-red-100/90 border-red-400 text-red-900`;
      case "warning":
        return `${baseStyle} bg-orange-100/90 border-orange-400 text-orange-900`;
      case "info":
      default:
        return `${baseStyle} bg-blue-100/90 border-blue-400 text-blue-900`;
    }
  };

  const getIcon = (type: ToastMessage["type"]) => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
      default:
        return "ℹ️";
    }
  };

  return (
    <div className={getToastStyle(toast.type)}>
      <div className="flex items-start">
        <span className="text-2xl mr-4 flex-shrink-0">
          {getIcon(toast.type)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg mb-2" style={{ fontFamily: 'Galmuri14, monospace' }}>
            {toast.title}
          </div>
          <div className="text-base leading-relaxed break-words whitespace-pre-line" style={{ fontFamily: 'Galmuri14, monospace' }}>
            {toast.message}
          </div>
        </div>
      </div>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toastMessages, removeToast } = useGameStore();

  if (toastMessages.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%'
      }}
    >
      <div className="space-y-3 pointer-events-auto flex flex-col items-center">
        <style jsx>{`
          @keyframes fadeInScale {
            from {
              transform: scale(0.8);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }

          .animate-fadeInScale {
            animation: fadeInScale 0.3s ease-out;
          }
        `}</style>
        {toastMessages.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;