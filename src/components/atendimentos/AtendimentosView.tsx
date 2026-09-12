import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Lead,
  LeadActivity,
  LeadCaptureForm,
  LeadTask,
  OpportunitySizing,
  PdfSettingsConfig,
  SolarProposal,
  ThemeConfig,
} from '../../types';
import {
  ensureLeadCaptureForm,
  fetchLeadActivities,
  fetchLeads,
  fetchLeadTasks,
} from '../../services/leads';
import { fetchOpportunitySizing } from '../../services/solarSizing';
import { supabase } from '../../lib/supabase';
import { AttendanceList } from './AttendanceList';
import { AttendanceDetail } from './AttendanceDetail';
import { NewAttendanceModal } from './NewAttendanceModal';
import { SolarSizingEditor } from '../SolarSizingEditor';
import { ProposalViewerModal } from '../ProposalViewerModal';

interface AtendimentosViewProps {
  theme: ThemeConfig;
  pdfSettings: PdfSettingsConfig;
  onShowToast: (message: string) => void;
}

export const AtendimentosView: React.FC<AtendimentosViewProps> = ({
  theme,
  pdfSettings,
  onShowToast,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [sizing, setSizing] = useState<OpportunitySizing | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSizingModalOpen, setIsSizingModalOpen] = useState(false);
  const [viewingProposal, setViewingProposal] = useState<SolarProposal | null>(null);

  // Capture Form for link sharing
  const [captureForm, setCaptureForm] = useState<LeadCaptureForm | null>(null);

  const loadLeads = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const [data, form] = await Promise.all([
        fetchLeads(),
        ensureLeadCaptureForm().catch(() => null),
      ]);
      setLeads(data);
      if (form) setCaptureForm(form);

      // Se há um lead selecionado, sincroniza com os dados mais recentes
      if (selectedLead) {
        const updated = data.find((l) => l.id === selectedLead.id);
        if (updated) setSelectedLead(updated);
      }
    } catch (err) {
      console.error('Erro ao carregar atendimentos:', err);
      setError('Não foi possível carregar a lista de atendimentos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeads();

    // Supabase Realtime subscription for leads table
    const channel = supabase
      .channel('leads-realtime-atendimentos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          loadLeads(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // When a lead is selected, load its tasks, activities, and sizing
  useEffect(() => {
    if (!selectedLead) {
      setTasks([]);
      setActivities([]);
      setSizing(null);
      return;
    }

    let isMounted = true;
    setLoadingDetails(true);

    const loadLeadSubData = async () => {
      try {
        const [loadedTasks, loadedActivities, loadedSizing] = await Promise.all([
          fetchLeadTasks(selectedLead.id).catch(() => []),
          fetchLeadActivities(selectedLead.id).catch(() => []),
          fetchOpportunitySizing(selectedLead.id).catch(() => null),
        ]);

        if (isMounted) {
          setTasks(loadedTasks);
          setActivities(loadedActivities);
          setSizing(loadedSizing);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do atendimento:', err);
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    };

    loadLeadSubData();

    return () => {
      isMounted = false;
    };
  }, [selectedLead?.id]);

  const handleCopyCaptureLink = () => {
    if (!captureForm) {
      onShowToast('Carregando link do formulário...');
      return;
    }
    const publicUrl = `${window.location.origin}/?formToken=${captureForm.publicToken}`;
    navigator.clipboard
      .writeText(publicUrl)
      .then(() => onShowToast('Link do formulário público de captação copiado!'))
      .catch(() => onShowToast('Não foi possível copiar o link.'));
  };

  const handleLeadCreated = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
    setSelectedLead(newLead);
  };

  const handleLeadUpdated = (updatedLead: Lead) => {
    setSelectedLead(updatedLead);
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
  };

  const handleSizingSaved = (savedSizing: OpportunitySizing) => {
    setSizing(savedSizing);
    setIsSizingModalOpen(false);
    onShowToast('Dimensionamento solar salvo com sucesso!');
    // Re-fetch lead to sync any status or consumer unit update
    loadLeads(true);
  };

  return (
    <div id="atendimentos-page" className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#8B949E] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="text-sm font-medium">Carregando fluxo de atendimentos...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center space-y-3">
          <p className="text-sm text-rose-300 font-medium">{error}</p>
          <button
            onClick={() => loadLeads()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      ) : selectedLead ? (
        <AttendanceDetail
          lead={selectedLead}
          tasks={tasks}
          activities={activities}
          sizing={sizing}
          captureForm={captureForm}
          theme={theme}
          pdfSettings={pdfSettings}
          loadingDetails={loadingDetails}
          onBack={() => setSelectedLead(null)}
          onLeadUpdated={handleLeadUpdated}
          onTasksUpdated={setTasks}
          onActivitiesUpdated={setActivities}
          onOpenSizingEditor={() => setIsSizingModalOpen(true)}
          onOpenProposalViewer={(proposal) => setViewingProposal(proposal)}
          onShowToast={onShowToast}
        />
      ) : (
        <AttendanceList
          leads={leads}
          selectedLeadId={selectedLead?.id ?? null}
          onSelectLead={(lead) => setSelectedLead(lead)}
          onOpenNewAttendance={() => setIsNewModalOpen(true)}
          onCopyCaptureLink={handleCopyCaptureLink}
          onRefresh={() => loadLeads(true)}
          refreshing={refreshing}
          theme={theme}
          captureForm={captureForm}
        />
      )}

      {/* Modal Novo Atendimento */}
      <NewAttendanceModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        theme={theme}
        onCreated={handleLeadCreated}
        onShowToast={onShowToast}
      />

      {/* Modal Dimensionamento Solar */}
      {isSizingModalOpen && selectedLead && (
        <SolarSizingEditor
          lead={selectedLead}
          existingSizing={sizing}
          theme={theme}
          onClose={() => setIsSizingModalOpen(false)}
          onSaved={handleSizingSaved}
          onShowToast={onShowToast}
        />
      )}

      {/* Modal Visualizador da Proposta */}
      <ProposalViewerModal
        proposal={viewingProposal}
        pdfSettings={pdfSettings}
        theme={theme}
        onClose={() => setViewingProposal(null)}
        onShowToast={onShowToast}
      />
    </div>
  );
};
