'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LogOut, ShieldCheck, Mic, BookOpen, FileText } from 'lucide-react';
import Link from 'next/link';

export default function WorkspacePage() {
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.location.replace('/workspace/captura');
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6 flex flex-col items-center justify-center font-sans text-slate-800 antialiased">
      <div className="bg-white/80 backdrop-blur-md border border-gray-200 p-8 rounded-2xl shadow-sm max-w-md w-full text-center space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Área do Workspace Conversacao_cloud
          </h1>
          <p className="text-xs text-gray-500">
            Ambiente clínico e regulatório em conformidade LGPD & CEP/UFRN
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1">
          <span className="text-slate-500 block">Usuário autenticado:</span>
          <span className="font-semibold text-emerald-800 text-sm block truncate">
            {loading ? 'Carregando sessão...' : userEmail || 'Conectado'}
          </span>
        </div>

        {/* Links rápidos para os módulos */}
        <div className="grid grid-cols-2 gap-2 text-left">
          <Link
            href="/workspace/captura"
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-emerald-700 transition-all text-xs font-semibold text-gray-800 flex items-center gap-1.5"
          >
            <Mic className="w-3.5 h-3.5 text-emerald-700" />
            Captura
          </Link>
          <Link
            href="/workspace/grupos"
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-emerald-700 transition-all text-xs font-semibold text-gray-800 flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            Grupos CEP
          </Link>
          <Link
            href="/workspace/glossario"
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-emerald-700 transition-all text-xs font-semibold text-gray-800 flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
            Glossário
          </Link>
          <Link
            href="/workspace/modelos"
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-emerald-700 transition-all text-xs font-semibold text-gray-800 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            Modelos
          </Link>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          Sair da Conta
        </button>
      </div>
    </div>
  );
}
