import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { loginWithGoogle, logout, fetchCapitalTransactions, auth, testConnection } from '../firebase';
import { User, Wallet, ArrowUpRight, ArrowDownRight, LogOut, ShieldCheck } from 'lucide-react';

export default function CapitalNode() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial verification of database connection
    testConnection();

    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        fetchCapitalTransactions(u.uid).then(transactions => {
          setData(transactions);
          setLoading(false);
        });
      } else {
        setData([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-[#161618] border border-[#D4AF37]/20">
        <span className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-[#161618] border border-white/5 p-8 flex flex-col items-center justify-center text-center">
        <ShieldCheck className="w-12 h-12 text-[#D4AF37] mb-4" />
        <h3 className="font-display italic text-[24px] text-white">Nodo de Capital Global</h3>
        <p className="text-[13px] opacity-70 mb-6 max-w-[300px] mt-2">
          Autentícate para acceder al despliegue de distribución de capital interno y ecosistema de transacciones.
        </p>
        <button 
          onClick={() => loginWithGoogle().catch(console.error)}
          className="btn-primary text-[12px] flex items-center gap-2"
        >
          <User className="w-4 h-4" /> Autenticar vía Nieve (Google)
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#161618] border border-white/10 p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-4">
          {user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full border-2 border-[#D4AF37]/50" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#0d0d0f] flex items-center justify-center border-2 border-[#D4AF37]/50">
              <User className="w-6 h-6 text-[#D4AF37]" />
            </div>
          )}
          <div>
            <h3 className="font-display text-[20px] text-white">{user.displayName || 'Acceso Autónomo'}</h3>
            <p className="text-[10px] uppercase tracking-[2px] text-[#D4AF37]">{user.email}</p>
          </div>
        </div>
        <button onClick={() => logout()} className="text-[11px] uppercase tracking-[1px] text-white/50 hover:text-white flex items-center gap-2 transition-colors">
          Cerrar Conexión <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-6">
          <Wallet className="w-5 h-5 text-[#D4AF37]" />
          <h4 className="font-display italic text-[18px]">Distribución de Capital</h4>
        </div>

        {data.length === 0 ? (
          <div className="text-center py-10 opacity-50 text-[13px]">
            No se han registrado flujos de capital en tu nodo por el momento.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.map((tx) => (
              <motion.div 
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-[#0A0A0B] border border-white/5 hover:border-[#D4AF37]/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {tx.type === 'deposit' || tx.type === 'dividend' || tx.type === 'bonus' ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-amber-500" />
                  )}
                  <span className="text-[12px] uppercase tracking-[1px] font-medium">
                    {tx.type === 'deposit' ? 'Inyección' : tx.type === 'bonus' ? 'Expansión' : tx.type}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[#D4AF37]">${tx.amount.toFixed(2)}</span>
                  <span className={`text-[9px] uppercase tracking-[1px] px-2 py-1 rounded ${tx.status === 'completed' ? 'bg-green-500/10 text-green-400' : tx.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                    {tx.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
