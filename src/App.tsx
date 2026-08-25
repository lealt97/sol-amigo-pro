import React, { useState, useEffect } from 'react';
import {
  PageKey,
  ThemeConfig,
  PdfSettingsConfig,
  SolarProposal,
  Client,
  Opportunity,
  OpportunityStage,
  SolarProduct,
  TaskItem,
  ContractItem,
  FinancialRecord,
} from './types';
import {
  loadSavedTheme,
  loadSavedPdfSettings,
  applyThemeToDOM,
} from './utils/themeEngine';
import {
  INITIAL_PROPOSALS,
  INITIAL_CLIENTS,
  INITIAL_OPPORTUNITIES,
  INITIAL_PRODUCTS,
  INITIAL_TASKS,
  INITIAL_CONTRACTS,
  INITIAL_FINANCIAL,
} from './data/initialData';

import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { DashboardView } from './components/DashboardView';
import { PersonalizacaoView } from './components/PersonalizacaoView';
import { PdfCustomizacoesView } from './components/PdfCustomizacoesView';
import { PropostasView } from './components/PropostasView';
import { ClientesView } from './components/ClientesView';
import { OportunidadesView } from './components/OportunidadesView';
import { ProdutosView } from './components/ProdutosView';
import { TarefasView } from './components/TarefasView';
import { ContratosView } from './components/ContratosView';
import { FinanceiroView } from './components/FinanceiroView';
import { EmpresasView } from './components/EmpresasView';
import { RelatoriosView } from './components/RelatoriosView';

import { NewProposalModal } from './components/NewProposalModal';
import { ProposalViewerModal } from './components/ProposalViewerModal';
import { QuickAddModal } from './components/QuickAddModal';
import { GitHubModal } from './components/GitHubModal';
import { HelpModal } from './components/HelpModal';
import { CheckCircle2 } from 'lucide-react';

type AuthScreen = 'login' | 'register';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');

  // Navigation
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme & PDF configuration
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(loadSavedTheme);
  const [currentPdfSettings, setCurrentPdfSettings] = useState<PdfSettingsConfig>(
    loadSavedPdfSettings
  );

  // Data Collections (initialized from initialData and kept in local state)
  const [proposals, setProposals] = useState<SolarProposal[]>(INITIAL_PROPOSALS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(
    INITIAL_OPPORTUNITIES
  );
  const [products, setProducts] = useState<SolarProduct[]>(INITIAL_PRODUCTS);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [contracts, setContracts] = useState<ContractItem[]>(INITIAL_CONTRACTS);
  const [financial, setFinancial] = useState<FinancialRecord[]>(INITIAL_FINANCIAL);

  // Modals state
  const [isNewProposalModalOpen, setIsNewProposalModalOpen] = useState(false);
  const [viewingProposal, setViewingProposal] = useState<SolarProposal | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Global Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Sync DOM with current theme whenever it changes
  useEffect(() => {
    applyThemeToDOM(currentTheme);
  }, [currentTheme]);

  const handleLogin = (_remember?: boolean) => {
    setIsAuthenticated(true);
  };

  const handleRegister = () => {
    setIsAuthenticated(true);
  };

  const handleApplyTheme = (newTheme: ThemeConfig) => {
    setCurrentTheme(newTheme);
  };

  const handleSavePdfSettings = (newSettings: PdfSettingsConfig) => {
    setCurrentPdfSettings(newSettings);
  };

  if (!isAuthenticated) {
    if (authScreen === 'register') {
      return (
        <RegisterView
          onRegister={handleRegister}
          onBackToLogin={() => setAuthScreen('login')}
        />
      );
    }

    return (
      <LoginView
        onLogin={handleLogin}
        onOpenRegister={() => setAuthScreen('register')}
      />
    );
  }

  // Proposal handlers
  const handleSaveNewProposal = (newProposal: SolarProposal) => {
    setProposals((prev) => [newProposal, ...prev]);
    const newOpp: Opportunity = {
      id: `opp-${Date.now()}`,
      title: `Proposta ${newProposal.code} - ${newProposal.clientName}`,
      clientName: newProposal.clientName,
      value: newProposal.totalValue,
      stage: 'proposta_enviada',
      expectedCloseDate: newProposal.validUntil,
      systemPowerKWp: newProposal.systemPowerKWp,
      assignedTo: 'Rodrigo Leal',
    };
    setOpportunities((prev) => [newOpp, ...prev]);
    setClients((prev) =>
      prev.map((c) =>
        c.name === newProposal.clientName
          ? { ...c, proposalsCount: c.proposalsCount + 1 }
          : c
      )
    );
  };

  const handleUpdateProposalStatus = (
    id: string,
    newStatus: SolarProposal['status']
  ) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
    showToast(`Status da proposta alterado para "${newStatus}"`);
  };

  const handleDeleteProposal = (id: string) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
    showToast('Proposta excluída');
  };

  const handleUpdateOpportunityStage = (
    id: string,
    newStage: OpportunityStage
  ) => {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, stage: newStage } : o))
    );
    showToast('Etapa da oportunidade atualizada!');
  };

  const handleAddOpportunity = (opp: Opportunity) => {
    setOpportunities((prev) => [opp, ...prev]);
  };

  const handleAddClient = (client: Client) => {
    setClients((prev) => [client, ...prev]);
  };

  const handleUpdateTaskStatus = (id: string, newStatus: TaskItem['status']) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
    showToast(`Status da tarefa atualizado para "${newStatus}"`);
  };

  const handleAddTask = (task: TaskItem) => {
    setTasks((prev) => [task, ...prev]);
  };

  const handleAddProduct = (prod: SolarProduct) => {
    setProducts((prev) => [prod, ...prev]);
  };

  const renderCurrentView = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardView
            proposals={proposals}
            theme={currentTheme}
            onNavigate={(page) => setActivePage(page)}
            onOpenNewProposal={() => setIsNewProposalModalOpen(true)}
            onViewProposal={(prop) => setViewingProposal(prop)}
          />
        );
      case 'personalizacao':
        return (
          <PersonalizacaoView
            currentTheme={currentTheme}
            onApplyTheme={handleApplyTheme}
            onShowToast={showToast}
          />
        );
      case 'pdf-customizacoes':
        return (
          <PdfCustomizacoesView
            currentPdfSettings={currentPdfSettings}
            currentTheme={currentTheme}
            onSavePdfSettings={handleSavePdfSettings}
            onShowToast={showToast}
          />
        );
      case 'propostas':
        return (
          <PropostasView
            proposals={proposals}
            theme={currentTheme}
            onOpenNewProposal={() => setIsNewProposalModalOpen(true)}
            onViewProposal={(prop) => setViewingProposal(prop)}
            onUpdateStatus={handleUpdateProposalStatus}
            onDeleteProposal={handleDeleteProposal}
            onShowToast={showToast}
          />
        );
      case 'clientes':
        return (
          <ClientesView
            clients={clients}
            theme={currentTheme}
            onAddClient={handleAddClient}
            onShowToast={showToast}
          />
        );
      case 'oportunidades':
        return (
          <OportunidadesView
            opportunities={opportunities}
            theme={currentTheme}
            onUpdateStage={handleUpdateOpportunityStage}
            onAddOpportunity={handleAddOpportunity}
            onShowToast={showToast}
          />
        );
      case 'produtos':
        return (
          <ProdutosView
            products={products}
            theme={currentTheme}
            onAddProduct={handleAddProduct}
            onShowToast={showToast}
          />
        );
      case 'tarefas':
        return (
          <TarefasView
            tasks={tasks}
            theme={currentTheme}
            onUpdateStatus={handleUpdateTaskStatus}
            onAddTask={handleAddTask}
            onShowToast={showToast}
          />
        );
      case 'contratos':
        return (
          <ContratosView
            contracts={contracts}
            theme={currentTheme}
            onShowToast={showToast}
          />
        );
      case 'financeiro':
        return (
          <FinanceiroView
            records={financial}
            theme={currentTheme}
            onShowToast={showToast}
          />
        );
      case 'empresas':
        return <EmpresasView theme={currentTheme} onShowToast={showToast} />;
      case 'relatorios':
        return <RelatoriosView theme={currentTheme} onShowToast={showToast} />;
      default:
        return (
          <DashboardView
            proposals={proposals}
            theme={currentTheme}
            onNavigate={(page) => setActivePage(page)}
            onOpenNewProposal={() => setIsNewProposalModalOpen(true)}
            onViewProposal={(prop) => setViewingProposal(prop)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#C9D1D9] flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 bg-[#161B22] text-[#C9D1D9] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 border border-[#30363D] animate-in fade-in slide-in-from-bottom-5 font-mono text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium text-white">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[#8B949E] hover:text-white text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <Sidebar
        activePage={activePage}
        onNavigate={(page) => setActivePage(page)}
        theme={currentTheme}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          sidebarCollapsed ? 'md:pl-[64px]' : 'md:pl-64'
        }`}
      >
        <Topbar
          activePage={activePage}
          theme={currentTheme}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
          onOpenGitHub={() => setIsGitHubModalOpen(true)}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          onOpenNewProposal={() => setIsNewProposalModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0D1117]">
          {renderCurrentView()}
        </main>

        <footer className="h-8 bg-[#161B22] border-t border-[#30363D] flex items-center justify-between px-4 md:px-6 shrink-0 select-none">
          <div className="flex items-center space-x-3 text-[10px] text-[#8B949E] uppercase tracking-wider font-bold">
            <span className="flex items-center text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></span>
              System OK
            </span>
            <span className="w-1 h-1 bg-[#484F58] rounded-full"></span>
            <span className="font-mono text-[#8B949E]">Latency: 24ms</span>
            <span className="w-1 h-1 bg-[#484F58] rounded-full hidden sm:inline-block"></span>
            <span className="hidden sm:inline-block text-[#8B949E]">Region: US-EAST-1</span>
          </div>
          <div className="text-[10px] text-[#484F58] font-mono">
            BUILD_ID: 2024.11.02_RELEASE
          </div>
        </footer>
      </div>

      <NewProposalModal
        isOpen={isNewProposalModalOpen}
        onClose={() => setIsNewProposalModalOpen(false)}
        clients={clients}
        theme={currentTheme}
        onSaveProposal={handleSaveNewProposal}
        onShowToast={showToast}
      />

      <ProposalViewerModal
        proposal={viewingProposal}
        pdfSettings={currentPdfSettings}
        theme={currentTheme}
        onClose={() => setViewingProposal(null)}
        onShowToast={showToast}
      />

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onNavigate={(page) => setActivePage(page)}
        onOpenNewProposal={() => setIsNewProposalModalOpen(true)}
        onShowToast={showToast}
      />

      <GitHubModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />

      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
}
