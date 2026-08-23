import React from 'react';
import {
  Github,
  GitBranch,
  CheckCircle2,
  ExternalLink,
  X,
  Code2,
  FolderGit2,
  Sparkles,
  Download,
  Share2,
} from 'lucide-react';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubModal: React.FC<GitHubModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#161B22] border border-[#30363D] rounded-lg max-w-xl w-full p-5 shadow-2xl space-y-4 text-[#C9D1D9] animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#21262D] border border-[#30363D] text-white flex items-center justify-center">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">
                  Sincronização & Exportação GitHub
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> PRONTO PARA PUSH
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#8B949E]">
                lealt97/sol-amigo-pro
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Repository details */}
        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-lg bg-[#1C2128] border border-[#30363D] space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#8B949E]">
                <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                Branch de Trabalho:
              </span>
              <span className="text-white bg-[#21262D] px-2 py-0.5 rounded border border-[#30363D]">
                main
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#8B949E]">
                <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />
                Estrutura Portada:
              </span>
              <span className="text-white">
                React 19 + TypeScript + Vite + Tailwind v4
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#8B949E]">
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                Status do Build:
              </span>
              <span className="text-emerald-400 font-bold">
                100% Compiled & Linted
              </span>
            </div>
          </div>

          {/* Export instructions */}
          <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#30363D] space-y-2">
            <span className="font-bold text-white flex items-center gap-1.5 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Como aplicar este código no seu repositório:
            </span>
            <ol className="space-y-1.5 text-[#8B949E] text-[11px] list-decimal list-inside leading-relaxed font-mono">
              <li>
                <strong className="text-white">Opção 1 (Direto pelo AI Studio):</strong> Clique no menu de configurações (<span className="text-blue-400">Settings ⚙️</span>) no canto superior direito do editor e escolha <strong>"Export to GitHub"</strong> para fazer o push direto para o seu repositório.
              </li>
              <li>
                <strong className="text-white">Opção 2 (Download ZIP):</strong> No menu de configurações, selecione <strong>"Export as ZIP"</strong> para baixar o projeto completo e realizar o <code className="text-emerald-400">git commit && git push</code> localmente.
              </li>
            </ol>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#30363D]">
          <a
            href="https://github.com/lealt97/sol-amigo-pro"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-[#8B949E] hover:text-white flex items-center gap-1.5 transition-colors"
          >
            Abrir Repositório no GitHub <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md bg-[#238636] hover:bg-[#2EA043] text-white font-mono text-xs font-semibold transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
