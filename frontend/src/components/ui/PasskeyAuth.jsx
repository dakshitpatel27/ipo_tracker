import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, Fingerprint, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';

const PasskeyAuth = () => {
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const fetchPasskeys = async () => {
    try {
      setLoading(true);
      const data = await api.getWebAuthnCredentials();
      setPasskeys(data || []);
    } catch (e) {
      console.warn('Failed to load passkeys:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const handleRegisterPasskey = async () => {
    if (!window.PublicKeyCredential) {
      toast.error('WebAuthn Passkeys are not supported on this browser/device');
      return;
    }
    setRegistering(true);
    try {
      const options = await api.getWebAuthnRegisterOptions();
      
      const challengeBuffer = Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0));
      const userIdBuffer = Uint8Array.from(atob(options.user.id), c => c.charCodeAt(0));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challengeBuffer,
          rp: options.rp,
          user: {
            id: userIdBuffer,
            name: options.user.name,
            displayName: options.user.displayName
          },
          pubKeyCredParams: options.pubKeyCredParams,
          authenticatorSelection: options.authenticatorSelection,
          timeout: options.timeout
        }
      });

      if (!credential) throw new Error('Biometric registration was cancelled');

      const rawIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      const deviceName = navigator.userAgent.includes('Mac') ? 'MacBook Touch ID' :
                         navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') ? 'Apple Face ID / Touch ID' :
                         navigator.userAgent.includes('Win') ? 'Windows Hello Biometric' : 'Android Biometric Key';

      await api.verifyWebAuthnRegister({
        credentialId: credential.id || rawIdBase64,
        publicKey: rawIdBase64,
        deviceName
      });

      toast.success('🎉 Biometric Passkey registered successfully!');
      fetchPasskeys();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        toast.error('Biometric prompt cancelled or timed out');
      } else {
        toast.error('Passkey Registration: ' + err.message);
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteWebAuthnCredential(id);
      toast.success('Passkey removed');
      fetchPasskeys();
    } catch (e) {
      toast.error('Failed to delete passkey: ' + e.message);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
        <div>
          <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
            <Fingerprint size={18} className="text-indigo-400" /> Biometric Passkey Authentication (WebAuthn)
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Passwordless 1-click login using Touch ID, Face ID, or Windows Hello.
          </p>
        </div>
        <button
          onClick={handleRegisterPasskey}
          disabled={registering}
          className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 font-bold shadow-lg shadow-indigo-500/20"
        >
          <Key size={14} className={registering ? 'animate-spin' : ''} />
          <span>{registering ? 'Scanning...' : 'Add Passkey'}</span>
        </button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="p-3 text-center text-xs text-[var(--text-secondary)]">Loading registered passkeys...</div>
        ) : passkeys.length > 0 ? (
          passkeys.map(pk => (
            <div key={pk.id} className="p-3 rounded-xl bg-surface-2 border border-[var(--border)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <span className="font-bold text-[var(--text-primary)] text-sm block">{pk.deviceName || 'Biometric Key'}</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">Added on {new Date(pk.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-emerald text-[10px]">Active</span>
                <button
                  onClick={() => handleDelete(pk.id)}
                  className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
                  title="Remove Passkey"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 rounded-xl bg-surface-2 text-center text-xs text-[var(--text-secondary)] border border-dashed border-[var(--border)]">
            No hardware biometric passkeys added yet. Click <strong>Add Passkey</strong> to enable 1-tap Touch ID / Face ID login.
          </div>
        )}
      </div>
    </div>
  );
};

export default PasskeyAuth;
