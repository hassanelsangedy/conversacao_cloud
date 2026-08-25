'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, Eye, EyeOff, Radio, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const supabase = createClient();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [method, setMethod] = useState<'password' | 'magic'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (method === 'magic') {
        const { data, error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/workspace/captura`,
          },
        });
        if (error) {
          setErrorMessage(error.message);
          return;
        }
        setSuccessMessage('Link de acesso enviado! Verifique sua caixa de entrada.');
      } else if (mode === 'signin') {
        console.log('Tentando login com:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        console.log('Resposta Supabase:', { data, error });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        if (data?.user) {
          window.location.replace('/workspace/captura');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/workspace/captura`,
          },
        });
        if (error) {
          setErrorMessage(error.message);
          return;
        }
        setSuccessMessage('Conta criada! Verifique seu e-mail para confirmação.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocorreu um erro durante a autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4 font-sans text-slate-800 antialiased">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-md border border-gray-200/60 rounded-2xl p-8 shadow-sm">
        
        {/* Header Visual */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-3 shadow-md">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Conversação Cloud</h1>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">V14</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            Sistema que transforma uma conversa em ação
          </p>
        </div>

        {/* Alternador Entrar / Criar Conta */}
        <div className="grid grid-cols-2 gap-1 bg-gray-100/80 p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'signin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Alternador Método */}
        <div className="flex justify-center gap-6 mb-6 text-xs border-b border-gray-100 pb-2">
          <button
            type="button"
            onClick={() => { setMethod('password'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`pb-1 font-medium transition-all cursor-pointer ${
              method === 'password' ? 'text-blue-600 border-b-2 border-blue-600 font-semibold' : 'text-gray-400'
            }`}
          >
            Com E-mail e Senha
          </button>
          <button
            type="button"
            onClick={() => { setMethod('magic'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`pb-1 font-medium transition-all cursor-pointer ${
              method === 'magic' ? 'text-blue-600 border-b-2 border-blue-600 font-semibold' : 'text-gray-400'
            }`}
          >
            Com Magic Link
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-tight">{errorMessage}</div>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="leading-tight">{successMessage}</div>
          </div>
        )}

        {/* Formulário com id, name e autoComplete */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
              E-mail Institucional
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@instituicao.br"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {method === 'password' && (
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Entrar no Workspace' : 'Cadastrar Conta'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <p className="text-[10px] text-gray-400 text-center mt-6">
          Ambiente Seguro • LGPD & Padrão Ético CEP
        </p>
      </div>
    </main>
  );
}
