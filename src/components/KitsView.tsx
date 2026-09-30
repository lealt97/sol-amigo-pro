import React, { useMemo, useState } from 'react';
import {
  Battery,
  FileCheck,
  Package,
  Pencil,
  Plus,
  Search,
  Sun,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { SolarKit, SolarSystemType, ThemeConfig } from '../types';
import {
  addCustomKit,
  deleteCustomKit,
  getStoredKits,
  saveStoredKits,
  updateCustomKit,
} from '../data/initialKits';

interface KitsViewProps {
  theme: ThemeConfig;
  onShowToast?: (message: string) => void;
  onNavigate?: (page: any) => void;
}

const money = (value?: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0
  );

const numeric = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const loadSafeKits = (): SolarKit[] => {
  try {
    const loaded = getStoredKits();
    return Array.isArray(loaded)
      ? loaded.filter((kit): kit is SolarKit => Boolean(kit && typeof kit === 'object'))
      : [];
  } catch (error) {
    console.error('Falha ao inicializar catálogo de kits:', error);
    return [];
  }
};

export const KitsView: React.FC<KitsViewProps> = ({ theme, onShowToast }) => {
  const [kits, setKits] = useState<SolarKit[]>(loadSafeKits);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'Todos' | SolarSystemType>('Todos');

  // Modal de Cadastro / Edição
  const [showModal, setShowModal] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);

  // Campos do formulário (exatamente como na imagem)
  const [formName, setFormName] = useState('');
  const [formSystemType, setFormSystemType] = useState<SolarSystemType>('On-Grid');
  const [formPowerKWp, setFormPowerKWp] = useState<number | ''>(3.85);
  const [formModuleCount, setFormModuleCount] = useState<number | ''>(7);
  const [formModulePowerW, setFormModulePowerW] = useState<number | ''>(550);
  const [formModuleModel, setFormModuleModel] = useState('Canadian Solar 550W TOPCon Bifacial');
  const [formInverterModel, setFormInverterModel] = useState('Deye SUN-5K-G04 Monofásico/Bifásico 220');
  const [formBatteryModel, setFormBatteryModel] = useState('Bateria Lítio LiFePO4 5.12kWh 48V');
  const [formBatteryCap, setFormBatteryCap] = useState<number | ''>(5.12);
  const [formEquipCost, setFormEquipCost] = useState<number | ''>(8470);
  const [formSuggestedPrice, setFormSuggestedPrice] = useState<number | ''>(11935);
  const [formStructure, setFormStructure] = useState('Telhado Cerâmico / Fibrocimento');

  const visibleKits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return kits.filter((kit) => {
      const matchesType = filter === 'Todos' || kit.systemType === filter;
      const matchesQuery =
        !q ||
        [kit.name, kit.sku, kit.moduleModel, kit.inverterModel]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      return matchesType && matchesQuery;
    });
  }, [kits, query, filter]);

  const persist = (next: SolarKit[]) => {
    setKits(next);
    saveStoredKits(next);
  };

  const handleOpenCreateModal = () => {
    setEditingKitId(null);
    setFormName('');
    setFormSystemType('On-Grid');
    setFormPowerKWp(3.85);
    setFormModuleCount(7);
    setFormModulePowerW(550);
    setFormModuleModel('Canadian Solar 550W TOPCon Bifacial');
    setFormInverterModel('Deye SUN-5K-G04 Monofásico/Bifásico 220');
    setFormBatteryModel('Bateria Lítio LiFePO4 5.12kWh 48V');
    setFormBatteryCap(5.12);
    setFormEquipCost(8470);
    setFormSuggestedPrice(11935);
    setFormStructure('Telhado Cerâmico / Fibrocimento');
    setShowModal(true);
  };

  const handleOpenEditModal = (kit: SolarKit) => {
    setEditingKitId(kit.id);
    setFormName(kit.name || '');
    setFormSystemType(kit.systemType || 'On-Grid');
    const kwp = numeric(kit.powerKWp, numeric(kit.maxPowerKWp, 5.0));
    setFormPowerKWp(Number(kwp.toFixed(2)));
    setFormModuleCount(numeric(kit.moduleCount, 10));
    setFormModulePowerW(numeric(kit.modulePowerW, 550));
    setFormModuleModel(kit.moduleModel || '');
    setFormInverterModel(kit.inverterModel || '');
    setFormBatteryModel(kit.batteryModel || 'Bateria Lítio LiFePO4 5.12kWh 48V');
    setFormBatteryCap(numeric(kit.batteryCapacityKWh, 5.12));
    setFormEquipCost(numeric(kit.equipmentCost, 0));
    setFormSuggestedPrice(numeric(kit.suggestedPrice, 0));
    setFormStructure(kit.structureType || 'Telhado Cerâmico / Fibrocimento');
    setShowModal(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      onShowToast?.('Por favor, informe o nome comercial do kit.');
      return;
    }

    const power = typeof formPowerKWp === 'number' && formPowerKWp > 0 ? formPowerKWp : 5.0;
    const modCount = typeof formModuleCount === 'number' && formModuleCount > 0 ? formModuleCount : 10;
    const modPower = typeof formModulePowerW === 'number' && formModulePowerW > 0 ? formModulePowerW : 550;
    const equipCost = typeof formEquipCost === 'number' ? formEquipCost : 0;
    const suggPrice = typeof formSuggestedPrice === 'number' ? formSuggestedPrice : 0;
    const isHybrid = formSystemType === 'Híbrido';

    if (editingKitId) {
      const existing = kits.find((k) => k.id === editingKitId);
      const updated: SolarKit = {
        ...(existing || kits[0]),
        id: editingKitId,
        name: formName.trim(),
        systemType: formSystemType,
        powerKWp: power,
        minPowerKWp: Number((power * 0.9).toFixed(2)),
        maxPowerKWp: Number((power * 1.1).toFixed(2)),
        moduleCount: modCount,
        modulePowerW: modPower,
        moduleModel: formModuleModel.trim(),
        inverterModel: formInverterModel.trim(),
        inverterPowerKW: Math.max(3, Math.ceil(power)),
        batteryModel: isHybrid ? formBatteryModel.trim() : undefined,
        batteryCapacityKWh: isHybrid ? (typeof formBatteryCap === 'number' ? formBatteryCap : 5.12) : undefined,
        equipmentCost: equipCost,
        suggestedPrice: suggPrice,
        structureType: formStructure.trim(),
      };
      updateCustomKit(updated);
      setKits(loadSafeKits());
      onShowToast?.(`Kit "${updated.name}" atualizado com sucesso!`);
    } else {
      const created = addCustomKit({
        name: formName.trim(),
        systemType: formSystemType,
        powerKWp: power,
        minPowerKWp: Number((power * 0.9).toFixed(2)),
        maxPowerKWp: Number((power * 1.1).toFixed(2)),
        moduleCount: modCount,
        modulePowerW: modPower,
        moduleModel: formModuleModel.trim(),
        inverterModel: formInverterModel.trim(),
        inverterPowerKW: Math.max(3, Math.ceil(power)),
        batteryModel: isHybrid ? formBatteryModel.trim() : undefined,
        batteryCapacityKWh: isHybrid ? (typeof formBatteryCap === 'number' ? formBatteryCap : 5.12) : undefined,
        equipmentCost: equipCost,
        suggestedPrice: suggPrice,
        structureType: formStructure.trim(),
      });
      setKits(loadSafeKits());
      onShowToast?.(`Kit "${created.name}" cadastrado com sucesso!`);
    }

    setShowModal(false);
  };

  const toggleActive = (id: string) => {
    persist(kits.map((kit) => (kit.id === id ? { ...kit, active: !kit.active } : kit)));
    onShowToast?.('Status do kit atualizado.');
  };

  const removeKit = (id: string) => {
    if (!window.confirm('Excluir este kit do catálogo?')) return;
    deleteCustomKit(id);
    persist(kits.filter((kit) => kit.id !== id));
    onShowToast?.('Kit removido do catálogo.');
  };

  const inputStyle = {
    backgroundColor: theme.background,
    borderColor: theme.border,
    color: theme.text,
  };

  return (
    <section className="space-y-6" id="kits-page">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dim)]">
            Catálogo técnico e comercial
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text)]">Kits Fotovoltaicos</h1>
          <p className="mt-1 text-sm font-normal text-[var(--muted)]">
            Os kits desta tela são os mesmos utilizados na etapa de dimensionamento do Wizard.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all shadow-sm hover:brightness-110 active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
          >
            <Plus className="h-4 w-4" /> Novo Kit
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ['Total', kits.length],
          ['On-Grid', kits.filter((k) => k.systemType === 'On-Grid').length],
          ['Híbridos', kits.filter((k) => k.systemType === 'Híbrido').length],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-2xl border p-4 transition-all"
            style={{ borderColor: theme.border, backgroundColor: theme.primary }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider opacity-60">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* BUSCA E FILTROS */}
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, SKU, módulo ou inversor..."
            className="w-full rounded-xl border py-2.5 pl-10 pr-3 outline-none"
            style={inputStyle}
          />
        </label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'Todos' | SolarSystemType)}
          className="rounded-xl border pl-3.5 pr-10 py-2.5 outline-none cursor-pointer"
          style={inputStyle}
        >
          <option>Todos</option>
          <option>On-Grid</option>
          <option>Híbrido</option>
        </select>
      </div>

      {/* LISTAGEM DE CARDS */}
      {visibleKits.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center flex flex-col items-center justify-center gap-2" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
          <Package className="mx-auto h-8 w-8 text-[var(--auxiliary)]" />
          <h3 className="mt-3 text-base font-semibold text-[var(--text)]">Nenhum kit cadastrado no momento</h3>
          <p className="mt-1 text-sm font-normal text-[var(--muted)] max-w-md mx-auto">
            Cadastre seus kits fotovoltaicos personalizados para utilizá-los no dimensionamento de propostas.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all shadow-sm hover:brightness-110 active:scale-[0.98] cursor-pointer mt-4"
            style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
          >
            <Plus className="h-4 w-4" /> Novo Kit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {visibleKits.map((kit, index) => {
            const power = numeric(kit.powerKWp, numeric(kit.maxPowerKWp));
            const minPower = numeric(kit.minPowerKWp, power * 0.9);
            const maxPower = numeric(kit.maxPowerKWp, power * 1.1);
            const safeId = kit.id || `kit-legado-${index}`;

            return (
              <article
                key={safeId}
                className="p-4 sm:p-5 rounded-2xl border transition-all duration-200 hover:shadow-lg flex flex-col justify-between group"
                style={{ borderColor: theme.border, backgroundColor: theme.primary }}
              >
                <div>
                  {/* Topo do card: Badges e Faixa de Potência */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={{ backgroundColor: theme.secondary, color: '#fff' }}
                      >
                        {kit.systemType || 'On-Grid'}
                      </span>
                      {kit.sku && (
                        <span className="text-xs opacity-50 font-mono">
                          {kit.sku}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] opacity-60 font-semibold">
                      {minPower.toFixed(1)}–{maxPower.toFixed(1)} kWp
                    </span>
                  </div>

                  {/* Nome do Kit */}
                  <h3 className="text-base font-bold leading-snug line-clamp-1" style={{ color: theme.text }}>
                    {kit.name || 'Kit sem nome'}
                  </h3>

                  {/* Grid de Métricas Principais (padrão PropostasView) */}
                  <div
                    className="grid grid-cols-2 gap-2 p-3 rounded-xl border text-xs mt-3.5"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    }}
                  >
                    <div>
                      <span className="text-[10px] uppercase font-semibold opacity-60 block">
                        Potência Nominal
                      </span>
                      <span className="font-bold text-sm flex items-center gap-1" style={{ color: theme.text }}>
                        <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        {power.toFixed(2)} kWp
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold opacity-60 block">
                        Preço Sugerido
                      </span>
                      <span className="font-bold text-sm text-emerald-500 dark:text-emerald-400">
                        {money(kit.suggestedPrice)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold opacity-60 block">
                        Módulos
                      </span>
                      <span className="font-semibold text-xs truncate" style={{ color: theme.text }}>
                        {kit.moduleCount ? `${kit.moduleCount}x ${kit.modulePowerW || 550}W` : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold opacity-60 block">
                        Custo Equip.
                      </span>
                      <span className="font-semibold text-xs" style={{ color: theme.text }}>
                        {money(kit.equipmentCost)}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Equipamentos */}
                  <div className="space-y-1.5 pt-3 text-xs opacity-80" style={{ color: theme.text }}>
                    <div className="flex items-center gap-1.5 truncate">
                      <Zap className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{kit.inverterModel || 'Inversor não informado'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Package className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">{kit.moduleModel || 'Módulo não informado'}</span>
                    </div>
                    {kit.systemType === 'Híbrido' && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Battery className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">
                          {kit.batteryModel || 'Bateria não informada'}{' '}
                          {kit.batteryCapacityKWh ? `• ${kit.batteryCapacityKWh} kWh` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé de Ações do Card (estilo idêntico ao padrão da plataforma) */}
                <div
                  className="mt-4 pt-3 border-t flex items-center justify-between gap-2"
                  style={{ borderColor: theme.border }}
                >
                  {/* Status Ativo/Inativo */}
                  <button
                    type="button"
                    onClick={() => toggleActive(safeId)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5"
                    style={{
                      borderColor: kit.active !== false ? theme.accent : theme.border,
                      color: kit.active !== false ? theme.accent : theme.text,
                      backgroundColor:
                        kit.active !== false
                          ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                          : 'transparent',
                    }}
                    title="Alternar disponibilidade do kit"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        kit.active !== false ? 'bg-emerald-400' : 'bg-zinc-400'
                      }`}
                    />
                    <span>{kit.active !== false ? 'Ativo' : 'Inativo'}</span>
                  </button>

                  {/* Ações: Editar e Excluir */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(kit)}
                      className="p-1.5 rounded-lg border text-[var(--dim)] hover:text-[var(--secondary)] hover:border-[var(--secondary)]/40 transition-colors cursor-pointer flex items-center justify-center"
                      style={{
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      }}
                      title="Editar kit"
                      aria-label="Editar kit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      data-delete-btn="true"
                      onClick={() => removeKit(safeId)}
                      className="btn-delete p-1.5 rounded-lg border text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] transition-colors cursor-pointer flex items-center justify-center"
                      style={{ borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)' }}
                      title="Excluir kit"
                      aria-label="Excluir kit"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL CADASTRAR / EDITAR KIT SOLAR (EXATAMENTE COMO NA IMAGEM)       */}
      {/* =================================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div
            className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
            style={{ backgroundColor: theme.primary, borderColor: theme.border }}
          >
            {/* Header Modal com Ícone, Título e Fechar */}
            <div
              className="p-4 sm:p-5 border-b flex items-center justify-between shrink-0"
              style={{ borderColor: theme.border }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl flex items-center justify-center border"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                    color: theme.secondary,
                  }}
                >
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold" style={{ color: theme.text }}>
                    {editingKitId ? 'Editar Kit Solar' : 'Cadastrar Novo Kit Solar'}
                  </h4>
                  <p className="text-[11px] opacity-60" style={{ color: theme.text }}>
                    Este kit será salvo no catálogo persistente de kits.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
                style={{ color: theme.text }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário com todos os campos idênticos à imagem */}
            <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
              {/* Linha 1: Nome Comercial do Kit (2 colunas) e Tipo do Sistema (1 coluna) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold block mb-1" style={{ color: theme.text }}>
                    Nome Comercial do Kit *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Kit On-Grid 3.9 kWp"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border font-semibold outline-none"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: theme.text }}>
                    Tipo do Sistema *
                  </label>
                  <select
                    value={formSystemType}
                    onChange={(e) => setFormSystemType(e.target.value as SolarSystemType)}
                    className="w-full pl-3.5 pr-10 py-2 rounded-lg border font-semibold outline-none cursor-pointer"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  >
                    <option value="On-Grid">On-Grid</option>
                    <option value="Híbrido">Híbrido</option>
                  </select>
                </div>
              </div>

              {/* Linha 2: Potência Nominal (kWp), Qtd. Módulos e Potência Módulo (W) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: theme.text }}>
                    Potência Nominal (kWp) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    required
                    value={formPowerKWp}
                    onChange={(e) => setFormPowerKWp(parseFloat(e.target.value) || '')}
                    className="w-full px-3 py-2 rounded-lg border font-semibold outline-none"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: theme.text }}>
                    Qtd. Módulos *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formModuleCount}
                    onChange={(e) => {
                      const cnt = parseInt(e.target.value) || '';
                      setFormModuleCount(cnt);
                      if (typeof cnt === 'number' && typeof formModulePowerW === 'number') {
                        setFormPowerKWp(Number(((cnt * formModulePowerW) / 1000).toFixed(2)));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border font-semibold outline-none"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: theme.text }}>
                    Potência Módulo (W)
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="100"
                    value={formModulePowerW}
                    onChange={(e) => {
                      const w = parseInt(e.target.value) || '';
                      setFormModulePowerW(w);
                      if (typeof w === 'number' && typeof formModuleCount === 'number') {
                        setFormPowerKWp(Number(((formModuleCount * w) / 1000).toFixed(2)));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border font-semibold outline-none"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>
              </div>

              {/* Linha 3: Modelo dos Módulos e Modelo do Inversor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: theme.text }}>
                    Modelo dos Módulos
                  </label>
                  <input
                    type="text"
                    placeholder="Canadian Solar 550W TOPCon Bifacial"
                    value={formModuleModel}
                    onChange={(e) => setFormModuleModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border outline-none"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: theme.text }}>
                    Modelo do Inversor
                  </label>
                  <input
                    type="text"
                    placeholder="Deye SUN-5K-G04 Monofásico/Bifásico 220"
                    value={formInverterModel}
                    onChange={(e) => setFormInverterModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border outline-none"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>
              </div>

              {/* Seção Banco de Baterias (se Híbrido) */}
              {formSystemType === 'Híbrido' && (
                <div
                  className="p-3 rounded-xl border space-y-2.5"
                  style={{ backgroundColor: theme.background, borderColor: theme.border }}
                >
                  <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1.5">
                    <Battery className="w-3.5 h-3.5" />
                    <span>Configuração do Banco de Baterias</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] opacity-70 font-semibold block mb-0.5" style={{ color: theme.text }}>
                        Modelo da Bateria
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Bateria Lítio LiFePO4 5.12kWh 48V"
                        value={formBatteryModel}
                        onChange={(e) => setFormBatteryModel(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border outline-none"
                        style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] opacity-70 font-semibold block mb-0.5" style={{ color: theme.text }}>
                        Capacidade (kWh)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formBatteryCap}
                        onChange={(e) => setFormBatteryCap(parseFloat(e.target.value) || '')}
                        className="w-full px-2.5 py-1.5 rounded-lg border outline-none"
                        style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Linha 4: Custo de Equipamentos (R$) e Preço de Venda Sugerido (R$) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: theme.text }}>
                    Custo de Equipamentos (R$)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formEquipCost}
                    onChange={(e) => setFormEquipCost(parseFloat(e.target.value) || '')}
                    className="w-full px-3 py-2 rounded-lg border font-semibold outline-none"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: theme.text }}>
                    Preço de Venda Sugerido (R$)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formSuggestedPrice}
                    onChange={(e) => setFormSuggestedPrice(parseFloat(e.target.value) || '')}
                    className="w-full px-3 py-2 rounded-lg border font-bold outline-none"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.secondary,
                    }}
                  />
                </div>
              </div>

              {/* Linha 5: Estrutura de Fixação */}
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: theme.text }}>
                  Estrutura de Fixação
                </label>
                <input
                  type="text"
                  placeholder="Telhado Cerâmico / Fibrocimento"
                  value={formStructure}
                  onChange={(e) => setFormStructure(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border outline-none"
                  style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                />
              </div>

              {/* Rodapé com Cancelar e Salvar Kit */}
              <div
                className="flex items-center justify-end gap-2 pt-3 border-t"
                style={{ borderColor: theme.border }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-all hover:border-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--secondary-fg)] cursor-pointer"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all shadow-sm hover:brightness-110 active:scale-[0.98] cursor-pointer"
                  style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Salvar Kit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default KitsView;
