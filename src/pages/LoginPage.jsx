import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogIn, UserPlus, FileWarning, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils'; // if you need to merge classes

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // The user mentioned no verification, so we assume Supabase is configured
        // to not require email confirmations and will autologin upon signup.
        // If it isn't, the user might stay stuck here depending on their exact SB project config.
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center p-4 bg-background overflow-hidden relative">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 p-8 w-1/2 h-full opacity-[0.03] pointer-events-none flex justify-end">
        <svg viewBox="0 0 100 100" className="h-full border-l border-primary/50" preserveAspectRatio="none">
           <line x1="10%" y1="0" x2="10%" y2="100" stroke="currentColor" strokeWidth="0.5"/>
           <line x1="30%" y1="0" x2="30%" y2="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2"/>
           <line x1="70%" y1="0" x2="70%" y2="100" stroke="currentColor" strokeWidth="0.5"/>
        </svg>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] z-10"
      >
        <div className="flex items-end gap-2 mb-8 px-2">
           <div className="w-10 h-10 border-4 border-primary rounded-xl bg-primary/10 flex items-center justify-center">
             <div className="w-4 h-4 bg-primary rounded-sm" />
           </div>
           <h1 className="text-4xl font-black tracking-tight leading-none text-foreground uppercase">
             Kinetic
           </h1>
        </div>

        <form onSubmit={handleAuth} className="bg-card border border-border sm:rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
          
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {isLogin ? 'Access System' : 'Initialize Account'}
            </h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              {isLogin ? 'Enter your credentials to continue.' : 'Create a new local ledger.'}
            </p>
          </div>

          {errorMsg && (
            <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex gap-3 text-rose-500 items-start">
              <FileWarning size={16} className="mt-0.5 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider">{errorMsg}</span>
            </motion.div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Identity string (Email)</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-muted-foreground/50 placeholder:font-medium"
                placeholder="node@network.app"
              />
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Access Key (Password)</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-muted-foreground/50 placeholder:font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : (isLogin ? <LogIn size={16}/> : <UserPlus size={16}/>)}
            {loading ? 'Processing...' : (isLogin ? 'Authenticate' : 'Establish Node')}
          </button>

          <div className="flex items-center justify-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg(null);
              }}
              className="text-[11px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already established? Log in"}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
