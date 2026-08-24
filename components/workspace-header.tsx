"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Mic,
  ShieldCheck,
  BookOpen,
  FileText,
  Radio,
  LogOut,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface WorkspaceHeaderProps {
  currentTitle: string;
  badgeText?: string;
}

export function WorkspaceHeader({ currentTitle, badgeText }: WorkspaceHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    router.push("/login");
    router.refresh();
  };

  const navLinks = [
    {
      href: "/workspace/captura",
      label: "Captura de Áudio",
      icon: Mic,
    },
    {
      href: "/workspace/grupos",
      label: "Grupos",
      icon: ShieldCheck,
    },
    {
      href: "/workspace/glossario",
      label: "Glossário",
      icon: BookOpen,
    },
    {
      href: "/workspace/modelos",
      label: "Relatórios",
      icon: FileText,
    },
  ];

  return (
    <header className="w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <Link
            href="/workspace/captura"
            className="flex items-center gap-2.5 group transition-transform active:scale-95"
          >
            <div
              style={{ backgroundColor: "#006A55" }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md shadow-[#006A55]/20 group-hover:opacity-90 transition-opacity"
            >
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900">
                  Conversação
                </span>
                <span
                  style={{ color: "#006A55", backgroundColor: "rgba(0, 106, 85, 0.08)" }}
                  className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border border-[#006A55]/20"
                >
                  Cloud
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">CEP &bull; Pure-Batch</p>
            </div>
          </Link>

          <ChevronRight className="w-4 h-4 text-slate-300 hidden md:block" />

          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">{currentTitle}</span>
            {badgeText && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                {badgeText}
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto custom-scrollbar">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/workspace/captura" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  isActive
                    ? "bg-white text-[#006A55] shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#006A55]" : "text-slate-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User / Sign Out Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSignOut}
            title="Encerrar sessão"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
