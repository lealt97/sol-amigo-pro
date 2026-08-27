import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PageKey, PdfSettingsConfig, ThemeConfig } from './types';
import { applyThemeToDOM, loadSavedPdfSettings, loadSavedTheme } from './utils/themeEngine';
import { supabase } from './lib/supabase';

import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { MfaChallengeView } from './components/MfaChallengeView';
import { SecurityView } from './components/SecurityView';
import { ProfileView } from './components/ProfileView';
import { RiskAreaView } from './components/RiskAreaView';
import { PersonalizacaoView } from './components/PersonalizacaoView';
import { PdfCustomizacoesView } from './components/PdfCustomizacoesView';
import { ClientesView } from './components/ClientesView';
import { HelpModal } from './components/HelpModal';

type AuthScreen = 'login' | 'register' | 'mfa';

const getBlankPageId = (page: PageKey) => {
  if (page === 'dashboard') return 'dashboard-view';
  return `${page}-page`;
};

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

      const factor =
        factorData?.totp?.find((item) => item.status === 'verified') ??
        factorData?.all?.find(
          (item: any) => item.factor_type === 'totp' && item.status === 'verified'
        );

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

  const renderCurrentView = () => {
    switch (activePage) {
      case 'clientes':
        return <ClientesView />;
      case 'perfil':
        return <ProfileView theme={currentTheme} onShowToast={showToast} />;
      case 'personalizacao':
        return (
          <PersonalizacaoView
            currentTheme={currentTheme}
            onApplyTheme={setCurrentTheme}
            onShowToast={showToast}
          />
        );
      case 'pdf-customizacoes':
        return (
          <PdfCustomizacoesView
            currentPdfSettings={currentPdfSettings}
            currentTheme={currentTheme}
            onSavePdfSettings={setCurrentPdfSettings}
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
      case 'area-risco':
        return <RiskAreaView theme={currentTheme} />;
      default:
        return <div id={getBlankPageId(activePage)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#C9D1D9] flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161B22] text-[#C9D1D9] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 border border-[#30363D] animate-in fade-in slide-in-from-bottom-5 font-mono text-xs">
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
          onOpenHelp={() => setIsHelpModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0D1117]">
          {renderCurrentView()}
        </main>
      </div>

      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
}
