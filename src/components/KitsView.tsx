import React, { useMemo, useState } from 'react';
import { Battery, Package, Plus, RotateCcw, Search, Trash2, Zap } from 'lucide-react';
import { SolarKit, SolarSystemType, ThemeConfig } from '../types';
import { addCustomKit, getStoredKits, restoreDefaultKits, saveStoredKits } from '../data/initialKits';

interface KitsViewProps {
  theme: ThemeConfig;
  onShowToast?: (message: string) => void;
}

const money = (value?: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const KitsView: React.FC<KitsViewProps> = ({ theme, onShowToast }) => {
  const [kits, setKits] = useState<SolarKit[]>(() => getStoredKits());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'Todos' | SolarSystemType>('Todos');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [systemType, setSystemType] = useState<SolarSystemType>('On-Grid');
  const [powerKWp, setPowerKWp] = useState(5.5);
  const [modulePowerW, setModulePowerW] = useState(550);
  const [moduleModel, setModuleModel] = useState('Módulo Solar 550W');
  const [inverterModel, setInverterModel] = useState('Inversor Solar 5kW');
  const [equipmentCost, setEquipmentCost] = useState(0);
  const [suggestedPrice, setSuggestedPrice] = useState(0);

  const visibleKits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return kits.filter((kit) => {
      const matchesType = filter === 'Todos' || kit.systemType === filter;
      const matchesQuery = !q || [kit.name, kit.sku, kit.moduleModel, kit.inverterModel]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      return matchesType && matchesQuery;
    });
  }, [kits, query, filter]);

  const persist = (next: SolarKit[]) => {
    setKits(next);
    saveStoredKits(next);
  };

  const handleCreate = () => {
    if (!name.trim() || powerKWp <= 0) {
      onShowToast?.('Informe o nome e a potência do kit.');
      return;
    }
    const created = addCustomKit({
      name,
      systemType,
      powerKWp,
      minPowerKWp: powerKWp * 0.9,
      maxPowerKWp: powerKWp * 1.1,
      modulePowerW,
      moduleCount: Math.ceil((powerKWp * 1000) / modulePowerW),
      moduleModel,
      inverterModel,
      equipmentCost,
      suggestedPrice,
    });
    setKits(getStoredKits());
    setShowForm(false);
    setName('');
    onShowToast?.(`Kit ${created.name} cadastrado.`);
  };

  const toggleActive = (id: string) => {
    persist(kits.map((kit) => kit.id === id ? { ...kit, active: !kit.active } : kit));
    onShowToast?.('Status do kit atualizado.');
  };

  const removeKit = (id: string) => {
    if (!window.confirm('Excluir este kit do catálogo?')) return;
    persist(kits.filter((kit) => kit.id !== id));
    onShowToast?.('Kit removido do catálogo.');
  };

  const restore = () => {
    if (!window.confirm('Restaurar o catálogo padrão de kits?')) return;
    const defaults = restoreDefaultKits();
    setKits([...defaults]);
    onShowToast?.('Catálogo padrão restaurado.');
  };

  const inputStyle = { backgroundColor: theme.background, borderColor: theme.border, color: theme.text };

  return (
    <section className="space-y-6" id="kits-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-60">Catálogo técnico e comercial</p>
          <h1 className="mt-1 text-2xl font-bold">Kits fotovoltaicos</h1>
          <p className="mt-1 text-sm opacity-70">Os kits desta tela são os mesmos utilizados na etapa de dimensionamento do Wizard.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={restore} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: theme.border }}>
            <RotateCcw className="h-4 w-4" /> Restaurar padrão
          </button>
          <button onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold" style={{ backgroundColor: theme.secondary, color: '#fff' }}>
            <Plus className="h-4 w-4" /> Novo kit
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[['Total', kits.length], ['On-Grid', kits.filter((k) => k.systemType === 'On-Grid').length], ['Híbridos', kits.filter((k) => k.systemType === 'Híbrido').length]].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-60">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
          <h2 className="mb-4 text-lg font-bold">Cadastrar novo kit</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do kit" className="rounded-xl border px-3 py-2.5" style={inputStyle} />
            <select value={systemType} onChange={(e) => setSystemType(e.target.value as SolarSystemType)} className="rounded-xl border px-3 py-2.5" style={inputStyle}><option>On-Grid</option><option>Híbrido</option></select>
            <input type="number" step="0.01" value={powerKWp} onChange={(e) => setPowerKWp(Number(e.target.value))} placeholder="Potência kWp" className="rounded-xl border px-3 py-2.5" style={inputStyle} />
            <input type="number" value={modulePowerW} onChange={(e) => setModulePowerW(Number(e.target.value))} placeholder="Módulo W" className="rounded-xl border px-3 py-2.5" style={inputStyle} />
            <input value={moduleModel} onChange={(e) => setModuleModel(e.target.value)} placeholder="Modelo do módulo" className="rounded-xl border px-3 py-2.5" style={inputStyle} />
            <input value={inverterModel} onChange={(e) => setInverterModel(e.target.value)} placeholder="Modelo do inversor" className="rounded-xl border px-3 py-2.5" style={inputStyle} />
            <input type="number" value={equipmentCost} onChange={(e) => setEquipmentCost(Number(e.target.value))} placeholder="Custo equipamentos" className="rounded-xl border px-3 py-2.5" style={inputStyle} />
            <input type="number" value={suggestedPrice} onChange={(e) => setSuggestedPrice(Number(e.target.value))} placeholder="Preço sugerido" className="rounded-xl border px-3 py-2.5" style={inputStyle} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold" style={{ borderColor: theme.border }}>Cancelar</button>
            <button onClick={handleCreate} className="rounded-xl px-4 py-2 text-sm font-bold" style={{ backgroundColor: theme.accent, color: '#0E2337' }}>Salvar kit</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, SKU, módulo ou inversor..." className="w-full rounded-xl border py-2.5 pl-10 pr-3" style={inputStyle} />
        </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value as 'Todos' | SolarSystemType)} className="rounded-xl border px-3 py-2.5" style={inputStyle}><option>Todos</option><option>On-Grid</option><option>Híbrido</option></select>
      </div>

      {visibleKits.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center" style={{ borderColor: theme.border }}><Package className="mx-auto mb-3 h-8 w-8 opacity-40" /><p className="font-semibold">Nenhum kit encontrado.</p></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleKits.map((kit) => (
            <article key={kit.id} className="rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: theme.secondary, color: '#fff' }}>{kit.systemType}</span>
                    <span className="text-xs opacity-50">{kit.sku || 'Sem SKU'}</span>
                  </div>
                  <h3 className="mt-2 text-base font-bold">{kit.name}</h3>
                </div>
                <button onClick={() => removeKit(kit.id)} title="Excluir kit" className="rounded-lg p-2 opacity-60 hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div><div className="text-xs opacity-50">Potência</div><div className="font-bold">{kit.powerKWp?.toFixed(2) || kit.maxPowerKWp.toFixed(2)} kWp</div></div>
                <div><div className="text-xs opacity-50">Módulos</div><div className="font-bold">{kit.moduleCount || '—'} × {kit.modulePowerW || '—'} W</div></div>
                <div><div className="text-xs opacity-50">Custo equip.</div><div className="font-bold">{money(kit.equipmentCost)}</div></div>
                <div><div className="text-xs opacity-50">Preço sugerido</div><div className="font-bold">{money(kit.suggestedPrice)}</div></div>
              </div>

              <div className="mt-4 space-y-2 border-t pt-4 text-sm" style={{ borderColor: theme.border }}>
                <div className="flex gap-2"><Zap className="mt-0.5 h-4 w-4 shrink-0 opacity-60" /><span>{kit.inverterModel || 'Inversor não informado'}</span></div>
                <div className="flex gap-2"><Package className="mt-0.5 h-4 w-4 shrink-0 opacity-60" /><span>{kit.moduleModel || 'Módulo não informado'}</span></div>
                {kit.systemType === 'Híbrido' && <div className="flex gap-2"><Battery className="mt-0.5 h-4 w-4 shrink-0 opacity-60" /><span>{kit.batteryModel || 'Bateria não informada'} {kit.batteryCapacityKWh ? `• ${kit.batteryCapacityKWh} kWh` : ''}</span></div>}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs opacity-60">Faixa: {kit.minPowerKWp.toFixed(1)}–{kit.maxPowerKWp.toFixed(1)} kWp</span>
                <button onClick={() => toggleActive(kit.id)} className="rounded-full border px-3 py-1.5 text-xs font-bold" style={{ borderColor: kit.active ? theme.accent : theme.border, color: kit.active ? theme.accent : theme.text }}>{kit.active ? 'Ativo' : 'Inativo'}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
