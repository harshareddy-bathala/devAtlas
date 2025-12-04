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
      iconBg: 'bg-error/10',
      iconColor: 'text-error',
      buttonClass: 'bg-error hover:bg-red-600 text-white'
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      buttonClass: 'bg-warning hover:bg-amber-600 text-white'
    },
    primary: {
      icon: Info,
      iconBg: 'bg-primary-500/10',
      iconColor: 'text-primary-400',
      buttonClass: 'bg-primary-500 hover:bg-primary-600 text-white'
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      buttonClass: 'bg-success hover:bg-emerald-600 text-white'
    }
  };

  const config = variantConfig[variant] || variantConfig.danger;
  const Icon = config.icon;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-xl ${config.iconBg}`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-gray-400 text-sm">{message}</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-dark-600 rounded-lg"
              disabled={loading}
            >
              <X className="w-5 h-5" />
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
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${config.buttonClass}`}
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
