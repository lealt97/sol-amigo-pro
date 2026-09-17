import React from 'react';
import { Building2, Plus, Phone, Mail, MapPin, Globe, Shield } from 'lucide-react';
import { ThemeConfig } from '../types';

interface EmpresasViewProps {
  theme: ThemeConfig;
  onShowToast: (msg: string) => void;
}

export const EmpresasView: React.FC<EmpresasViewProps> = ({
  theme,
  onShowToast,
}) => {
  const companies = [
    {
      id: 'emp-1',
      name: 'Sol Amigo Energia Solar Ltda',
      cnpj: '38.129.450/0001-92',
      type: 'Matriz / Integradora',
      crea: 'CREA-SP 2618903-D',
      city: 'Campinas/SP',
      phone: '(19) 98822-4411',
      email: 'contato@solamigo.com.br',
      activeProjects: 46,
    },
    {
      id: 'emp-2',
      name: 'Aldo Solar Distribuidora',
      cnpj: '04.582.911/0001-33',
      type: 'Fornecedor de Kits FV',
      crea: 'Parceiro Master Tier-1',
      city: 'Maringá/PR',
      phone: '(44) 3032-9000',
      email: 'pedidos@aldosolar.com.br',
      activeProjects: 28,
    },
    {
      id: 'emp-3',
      name: 'EletroInstala Engenharia & Montagens',
      cnpj: '19.482.001/0001-18',
      type: 'Equipe de Instalação Credenciada',
      crea: 'CFT-BR 992014-A',
      city: 'Belo Horizonte/MG',
      phone: '(31) 98765-4321',
      email: 'obras@eletroinstala.eng.br',
      activeProjects: 14,
    },
  ];

  return (
    <div id="empresas-page" className="space-y-6 max-w-7xl mx-auto">
      <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Parcerias & Distribuidores
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Empresas, Integradores & Fornecedores
          </h2>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Cadastro de distribuidores de módulos/inversores, empresas parceiras de instalação e equipes de engenharia credenciadas.
          </p>
        </div>

        <button
          onClick={() => onShowToast('Cadastro de nova empresa parceira')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-xs font-bold shadow-md transition-all hover:brightness-105 active:scale-95 shrink-0"
          style={{
            backgroundColor: theme.secondary,
            boxShadow: `0 4px 14px ${theme.secondary}40`,
          }}
        >
          <Plus className="w-4 h-4" />
          Cadastrar Empresa
        </button>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {companies.map((comp) => (
          <div
            key={comp.id}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
                {comp.type}
              </span>
              <h3 className="font-extrabold text-slate-900 text-base mt-2">
                {comp.name}
              </h3>
              <span className="text-xs font-mono text-slate-400 block">
                {comp.cnpj}
              </span>

              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">{comp.crea}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{comp.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{comp.phone}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{comp.email}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">Projetos Ativos:</span>
              <span className="font-extrabold text-blue-600">
                {comp.activeProjects} projetos
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
