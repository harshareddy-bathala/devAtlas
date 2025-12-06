import { AlertTriangle, X, Info, CheckCircle } from 'lucide-react';

export function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Are you sure?', 
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false
}) {
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-400',
      buttonClass: 'bg-red-500 hover:bg-red-600 text-white'
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-[#F59E0B]/10',
      iconColor: 'text-[#F59E0B]',
      buttonClass: 'bg-[#F59E0B] hover:bg-amber-600 text-white'
    },
    primary: {
      icon: Info,
      iconBg: 'bg-accent-primary/10',
      iconColor: 'text-accent-primary',
      buttonClass: 'bg-accent-primary hover:bg-accent-primary/90 text-white'
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-[#22C55E]/10',
      iconColor: 'text-[#22C55E]',
      buttonClass: 'bg-[#22C55E] hover:bg-emerald-600 text-white'
    }
  };

  const config = variantConfig[variant] || variantConfig.danger;
  const Icon = config.icon;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-dark-850 border border-dark-600 rounded w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded ${config.iconBg}`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
              <p className="text-light-500 text-sm">{message}</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-dark-600 rounded"
              disabled={loading}
            >
              <X className="w-5 h-5 text-light-400" />
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 p-6 pt-0">
          <button 
            onClick={onClose}
            className="btn-secondary flex-1"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              if (!loading) onClose();
            }}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded font-medium transition-colors disabled:opacity-50 ${config.buttonClass}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
