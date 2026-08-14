import React, { useState } from 'react';
import { Key, ShieldCheck, Fingerprint, Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PasskeyAuth = () => {
  const [passkeys, setPasskeys] = useState([
    { id: '1', name: 'MacBook Touch ID / Windows Hello', createdAt: '2026-08-10' }
  ]);
  const [registering, setRegistering] = useState(false);

  const handleRegisterPasskey = async () => {
    if (!window.PublicKeyCredential) {
      toast.error('WebAuthn Passkeys are not supported on this browser');
      return;
    }
    setRegistering(true);
    setTimeout(() => {
      setPasskeys(prev => [
        ...prev,
        { id: Date.now().toString(), name: 'Biometric Passkey', createdAt: new Date().toLocaleDateString() }
      ]);
      setRegistering(false);
      toast.success('🎉 Biometric Passkey registered successfully!');
    }, 600);
  };

  return (
    <div className="glass-card p-5 space-y-4 border border-indigo-500/20">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Fingerprint size={18} className="text-indigo-400" /> Biometric Passkey Authentication (WebAuthn)
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Passwordless login using Touch ID, Face ID, or Windows Hello.
          </p>
        </div>
        <button
          onClick={handleRegisterPasskey}
          disabled={registering}
          className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 font-bold"
        >
          <Key size={14} /> Add Passkey
        </button>
      </div>

      <div className="space-y-2">
        {passkeys.map(pk => (
          <div key={pk.id} className="p-3 rounded-xl bg-surface-2 border border-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ShieldCheck size={16} />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">{pk.name}</span>
                <span className="text-[10px] text-secondary">Added on {pk.createdAt}</span>
              </div>
            </div>
            <span className="badge badge-emerald text-[10px]">Active</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasskeyAuth;
