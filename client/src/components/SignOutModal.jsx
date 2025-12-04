import { LogOut } from 'lucide-react';
import Modal from './common/Modal';

function SignOutModal({ isOpen, onClose, onConfirm, loading }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnOutsideClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2.5 rounded-xl bg-primary-500/10">
          <LogOut className="w-5 h-5 text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-1">Sign Out</h3>
          <p className="text-gray-400 text-sm">
            Are you sure you want to sign out of your account?
          </p>
        </div>
      </div>
      
      <div className="flex gap-3">
        <button 
          onClick={onClose}
          className="btn-secondary flex-1"
          disabled={loading}
        >
          Cancel
        </button>
        <button 
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              Sign Out
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}

export default SignOutModal;
