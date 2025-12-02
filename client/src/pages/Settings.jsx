import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Upload, Trash2, Database, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { LoadingButton } from '../components/LoadingStates';
import ConfirmDialog from '../components/ConfirmDialog';

function Settings() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devorbit-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await api.importData(data);
      toast.success(`Imported ${result.imported?.skills || 0} skills, ${result.imported?.projects || 0} projects, ${result.imported?.resources || 0} resources`);
      // Reload page to reflect changes
      window.location.reload();
    } catch (error) {
      toast.error(error.message || 'Failed to import data. Make sure the file is a valid DevOrbit backup.');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleClearData = async () => {
    try {
      await api.clearAllData();
      toast.success('All data cleared successfully');
      // Reload page to reflect changes
      window.location.reload();
    } catch (error) {
      toast.error(error.message || 'Failed to clear data');
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400">Manage your data and preferences</p>
      </div>

      {/* Data Management Section */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-purple/10 rounded-lg">
            <Database className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Data Management</h2>
            <p className="text-sm text-gray-400">Export, import, or clear your data</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Export */}
          <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg">
            <div>
              <h3 className="font-medium">Export Data</h3>
              <p className="text-sm text-gray-400">Download a backup of all your skills, projects, resources, and activities</p>
            </div>
            <LoadingButton 
              onClick={handleExport} 
              loading={exporting}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </LoadingButton>
          </div>

          {/* Import */}
          <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg">
            <div>
              <h3 className="font-medium">Import Data</h3>
              <p className="text-sm text-gray-400">Restore from a backup file (existing data will be kept)</p>
            </div>
            <label className={`btn-secondary flex items-center gap-2 cursor-pointer ${importing ? 'opacity-50' : ''}`}>
              <Upload className="w-4 h-4" />
              {importing ? 'Importing...' : 'Import'}
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImport} 
                className="hidden"
                disabled={importing}
              />
            </label>
          </div>

          {/* Clear Data */}
          <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div>
              <h3 className="font-medium text-red-400">Clear All Data</h3>
              <p className="text-sm text-gray-400">Permanently delete all your data and start fresh</p>
            </div>
            <button 
              onClick={() => setClearConfirm(true)}
              className="btn-danger flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Data
            </button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-accent-orange mt-0.5" />
          <div>
            <h3 className="font-medium mb-1">About Data Storage</h3>
            <p className="text-sm text-gray-400">
              Your data is stored locally on the server in a JSON file. It's recommended to export 
              backups regularly. Clearing data will create an automatic backup before deletion.
            </p>
          </div>
        </div>
      </div>

      {/* Clear Data Confirmation */}
      <ConfirmDialog
        isOpen={clearConfirm}
        onClose={() => setClearConfirm(false)}
        onConfirm={handleClearData}
        title="Clear All Data"
        message="Are you sure you want to delete ALL your data? This includes all skills, projects, resources, and activity history. A backup will be created automatically, but this action cannot be easily undone."
        confirmText="Yes, Clear Everything"
        variant="danger"
      />
    </div>
  );
}

export default Settings;
