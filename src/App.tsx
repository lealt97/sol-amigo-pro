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
import { supabase } from './lib/supabase';

import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { MfaChallengeView } from './components/MfaChallengeView';
import { SecurityView } from './components/SecurityView';
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

type AuthScreen = 'login' | 'register' | 'mfa';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(loadSavedTheme);
  const [currentPdfSettings, setCurrentPdfSettings] = useState<PdfSettingsConfig>(
    loadSavedPdfSettings
  );

  const [proposals, setProposals] = useState<SolarProposal[]>(INITIAL_PROPOSALS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [products, setProducts] = useState<SolarProduct[]>(INITIAL_PRODUCTS);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [contracts] = useState<ContractItem[]>(INITIAL_CONTRACTS);
  const [financial] = useState<FinancialRecord[]>(INITIAL_FINANCIAL);

  const [isNewProposalModalOpen, setIsNewProposalModalOpen] = useState(false);
  const [viewingProposal, setViewingProposal] = useState<SolarProposal | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  useEffect(() => {
    applyThemeToDOM(currentTheme);
  }, [currentTheme]);

  const resolveMfaRequirement = async (): Promise<boolean> => {
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel === 'aal1' && assurance?.nextLevel === 'aal2') {
      const { data: factorData, error } = await supabase.auth.mfa.listFactors();
      if (error) return false;
      const factor = factorData?.totp?.find((item) => item.status === 'verified') ??
        factorData?.all?.find((item: any) => item.factor_type === 'totp' && item.status === 'verified');
      if (factor) {
        setMfaFactorId(factor.id);
        setMfaError('');
        setAuthScreen('mfa');
        setIsAuthenticated(false);
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!data.session) {
        setIsAuthenticated(false);
        setAuthLoading(false);
        return;
      }

      const needsMfa = await resolveMfaRequirement();
      if (!mounted) return;
      if (!needsMfa) setIsAuthenticated(true);
      setAuthLoading(false);
    };

    void restoreSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
        setMfaFactorId(null);
        setAuthScreen('login');
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async ({
    email,
    password,
    remember,
  }: {
    email: string;
    password: string;
    remember: boolean;
  }): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes('invalid login')) {
        return 'E-mail ou senha incorretos.';
      }
      if (error.message.toLowerCase().includes('email not confirmed')) {
        return 'Confirme seu e-mail antes de entrar.';
      }
      return error.message;
    }

    if (remember) localStorage.setItem('solamigo.login.email', email);
    else localStorage.removeItem('solamigo.login.email');

    const needsMfa = await resolveMfaRequirement();
    if (!needsMfa) {
      setIsAuthenticated(true);
      setAuthScreen('login');
    }
    return null;
  };

  const handleRegister = async ({
    name,
    company,
    email,
    password,
  }: {
    name: string;
    company: string;
    email: string;
    password: string;
  }): Promise<{ error?: string; message?: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          company,
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        return { error: 'Já existe uma conta cadastrada com este e-mail.' };
      }
      return { error: error.message };
    }

    if (data.session) {
      setIsAuthenticated(true);
      setAuthScreen('login');
      return {};
    }

    return {
      message: 'Conta criada. Verifique sua caixa de e-mail para confirmar o cadastro antes de entrar.',
    };
  };

  const handleForgotPassword = async (email: string): Promise<string> => {
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return `Não foi possível enviar o e-mail: ${error.message}`;
    return 'Enviamos as instruções de recuperação para o seu e-mail.';
  };

  const handleVerifyMfa = async (code: string) => {
    if (!mfaFactorId) {
      setMfaError('Fator MFA não encontrado. Faça login novamente.');
      return;
    }
    if (code.length !== 6) {
      setMfaError('Digite o código de 6 dígitos.');
      return;
    }

    setMfaLoading(true);
    setMfaError('');
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code,
    });

    if (error) {
      setMfaError('Código inválido ou expirado. Tente novamente.');
      setMfaLoading(false);
      return;
    }

    setMfaFactorId(null);
    setIsAuthenticated(true);
    setAuthScreen('login');
    setMfaLoading(false);
  };

  const handleCancelMfa = async () => {
    await supabase.auth.signOut();
    setMfaFactorId(null);
    setMfaError('');
    setAuthScreen('login');
    setIsAuthenticated(false);
  };

  const handleSignedOut = () => {
    setIsAuthenticated(false);
    setMfaFactorId(null);
    setAuthScreen('login');
    setActivePage('dashboard');
  };

  const handleApplyTheme = (newTheme: ThemeConfig) => {
    setCurrentTheme(newTheme);
  };

  const handleSavePdfSettings = (newSettings: PdfSettingsConfig) => {
    setCurrentPdfSettings(newSettings);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0E2337] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-sm font-semibold">Carregando sua conta...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authScreen === 'register') {
      return (
        <RegisterView
          onRegister={handleRegister}
          onBackToLogin={() => setAuthScreen('login')}
        />
      );
    }

    if (authScreen === 'mfa') {
      return (
        <MfaChallengeView
          error={mfaError}
          loading={mfaLoading}
          onVerify={handleVerifyMfa}
          onCancel={handleCancelMfa}
        />
      );
    }

    return (
      <LoginView
        onLogin={handleLogin}
        onForgotPassword={handleForgotPassword}
        onOpenRegister={() => setAuthScreen('register')}
      />
    );
  }

  const handleSaveNewProposal = (newProposal: SolarProposal) => {
    setProposals((prev) => [newProposal, ...prev]);
    const newOpp: Opportunity = {
      id: `opp-${Date.now()}`,
      title: `Proposta ${newProposal.code} - ${newProposal.clientName}`,
      clientName: newProposal.clientName,
      value: newProposal.totalValue,
      stage: 'proposta_enviada',
      expectedCloseDate: newProposal.validUntil || '',
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

  const handleUpdateProposalStatus = (id: string, newStatus: SolarProposal['status']) => {
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    showToast(`Status da proposta alterado para "${newStatus}"`);
  };

  const handleDeleteProposal = (id: string) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
    showToast('Proposta excluída');
  };

  const handleUpdateOpportunityStage = (id: string, newStage: OpportunityStage) => {
    setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, stage: newStage } : o)));
    showToast('Etapa da oportunidade atualizada!');
  };

  const handleAddOpportunity = (opp: Opportunity) => setOpportunities((prev) => [opp, ...prev]);
  const handleAddClient = (client: Client) => setClients((prev) => [client, ...prev]);

  const handleUpdateTaskStatus = (id: string, newStatus: TaskItem['status']) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
    showToast(`Status da tarefa atualizado para "${newStatus}"`);
  };

  const handleAddTask = (task: TaskItem) => setTasks((prev) => [task, ...prev]);
  const handleAddProduct = (prod: SolarProduct) => setProducts((prev) => [prod, ...prev]);

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
      case 'seguranca':
        return (
          <SecurityView
            theme={currentTheme}
            onShowToast={showToast}
            onSignedOut={handleSignedOut}
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
        return <ClientesView clients={clients} theme={currentTheme} onAddClient={handleAddClient} onShowToast={showToast} />;
      case 'oportunidades':
        return <OportunidadesView opportunities={opportunities} theme={currentTheme} onUpdateStage={handleUpdateOpportunityStage} onAddOpportunity={handleAddOpportunity} onShowToast={showToast} />;
      case 'produtos':
        return <ProdutosView products={products} theme={currentTheme} onAddProduct={handleAddProduct} onShowToast={showToast} />;
      case 'tarefas':
        return <TarefasView tasks={tasks} theme={currentTheme} onUpdateStatus={handleUpdateTaskStatus} onAddTask={handleAddTask} onShowToast={showToast} />;
      case 'contratos':
        return <ContratosView contracts={contracts} theme={currentTheme} onShowToast={showToast} />;
      case 'financeiro':
        return <FinanceiroView records={financial} theme={currentTheme} onShowToast={showToast} />;
      case 'empresas':
        return <EmpresasView theme={currentTheme} onShowToast={showToast} />;
      case 'relatorios':
        return <RelatoriosView theme={currentTheme} onShowToast={showToast} />;
      default:
        return <DashboardView proposals={proposals} theme={currentTheme} onNavigate={(page) => setActivePage(page)} onOpenNewProposal={() => setIsNewProposalModalOpen(true)} onViewProposal={(prop) => setViewingProposal(prop)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#C9D1D9] flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161B22] text-[#C9D1D9] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 border border-[#30363D] animate-in fade-in slide-in-from-bottom-5 font-mono text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium text-white">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-[#8B949E] hover:text-white text-xs ml-2 cursor-pointer">✕</button>
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

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${sidebarCollapsed ? 'md:pl-[64px]' : 'md:pl-64'}`}>
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0D1117]">{renderCurrentView()}</main>
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

      <GitHubModal isOpen={isGitHubModalOpen} onClose={() => setIsGitHubModalOpen(false)} />
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
}
