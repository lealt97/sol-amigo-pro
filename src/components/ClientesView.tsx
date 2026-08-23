import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Zap,
  Building,
  Home,
  Tractor,
  Factory,
} from 'lucide-react';
import { Client, ThemeConfig } from '../types';

interface ClientesViewProps {
  clients: Client[];
  theme: ThemeConfig;
  onAddClient: (client: Client) => void;
  onShowToast: (msg: string) => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  clients,
  theme,
  onAddClient,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // New client form state
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [type, setType] = useState<Client['type']>('Residencial');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Campinas');
  const [state, setState] = useState('SP');
  const [concessionaria, setConcessionaria] = useState('CPFL Paulista');
  const [avgConsumptionKWh, setAvgConsumptionKWh] = useState(800);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.document.includes(search)
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const newCli: Client = {
      id: `cli-${Date.now()}`,
      name,
      document: document || '000.000.000-00',
      type,
      email: email || 'cliente@email.com',
      phone: phone || '(11) 99999-9999',
      city,
      state,
      concessionaria,
      avgConsumptionKWh: Number(avgConsumptionKWh) || 600,
      proposalsCount: 0,
      activeStatus: 'Ativo',
    };
    onAddClient(newCli);
    setModalOpen(false);
    setName('');
    setDocument('');
    setEmail('');
    setPhone('');
    onShowToast(`Cliente ${name} cadastrado com sucesso!`);
  };

  return (
    <div id="clientes-page" className="space-y-4 max-w-7xl mx-auto text-[#C9D1D9]">
      {/* Banner */}
      <section className="bg-[#161B22] p-4 md:p-5 rounded-lg border border-[#30363D] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#21262D] text-blue-400 border border-[#30363D] text-[10px] font-mono uppercase tracking-wider mb-2">
            <Users className="w-3 h-3" />
            CRM / ACCOUNTS_REGISTRY
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Gestão de Clientes & Unidades Consumidoras
          </h2>
          <p className="text-[#8B949E] text-xs mt-1 max-w-2xl leading-relaxed">
            Gerencie contatos, histórico de faturas elétricas, perfil de consumo e projetos solares associados.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#238636] hover:bg-[#2EA043] text-white text-xs font-semibold transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Cliente
        </button>
      </section>

      {/* Search Bar */}
      <div className="bg-[#161B22] p-3 rounded-lg border border-[#30363D] flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-3 top-2.5" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome, documento ou cidade..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-[#0D1117] border border-[#30363D] rounded-md outline-none focus:border-blue-500 text-[#C9D1D9] font-mono placeholder:text-[#8B949E]"
          />
        </div>
        <span className="text-[10px] font-mono text-[#8B949E] hidden sm:block">
          {filtered.length} clientes encontrados
        </span>
      </div>

      {/* Clients Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((cli) => (
          <div
            key={cli.id}
            className="bg-[#161B22] p-4 rounded-lg border border-[#30363D] hover:border-[#8B949E]/50 transition-all flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-start justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#21262D] text-blue-400 border border-[#30363D] flex items-center gap-1">
                  {cli.type === 'Rural' && <Tractor className="w-3 h-3" />}
                  {cli.type === 'Comercial' && <Building className="w-3 h-3" />}
                  {cli.type === 'Residencial' && <Home className="w-3 h-3" />}
                  {cli.type === 'Industrial' && <Factory className="w-3 h-3" />}
                  {cli.type}
                </span>
                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                  {cli.activeStatus}
                </span>
              </div>

              <h3 className="font-bold text-white text-sm mt-2 truncate">
                {cli.name}
              </h3>
              <span className="text-[10px] font-mono text-[#8B949E] block mt-0.5">
                {cli.document}
              </span>

              <div className="space-y-1 mt-2.5 text-[11px] text-[#8B949E]">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3 h-3 text-[#8B949E] shrink-0" />
                  <span className="truncate">{cli.email}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <Phone className="w-3 h-3 text-[#8B949E] shrink-0" />
                  <span>{cli.phone}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="w-3 h-3 text-[#8B949E] shrink-0" />
                  <span className="truncate">
                    {cli.city}/{cli.state} · {cli.concessionaria}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#30363D] flex items-center justify-between text-xs">
              <div>
                <span className="text-[9px] text-[#8B949E] uppercase font-bold block">Consumo Médio</span>
                <span className="font-mono font-bold text-white text-xs">
                  {cli.avgConsumptionKWh} kWh/mês
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-[#8B949E] uppercase font-bold block">Propostas</span>
                <span className="font-mono font-bold text-blue-400 text-xs">
                  {cli.proposalsCount} emitidas
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add Client */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-lg max-w-lg w-full p-5 shadow-2xl space-y-4 text-[#C9D1D9]">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Cadastrar Novo Cliente
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#8B949E] hover:text-white text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-white mb-1 text-xs">
                  Nome Completo ou Razão Social
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Fazenda Bela Vista / João da Silva"
                  className="w-full h-8 px-2.5 bg-[#0D1117] border border-[#30363D] rounded-md outline-none focus:border-blue-500 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-white mb-1 text-xs">
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full h-8 px-2.5 bg-[#0D1117] border border-[#30363D] rounded-md outline-none focus:border-blue-500 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-white mb-1 text-xs">
                    Tipo de Imóvel
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Client['type'])}
                    className="w-full h-8 px-2.5 bg-[#0D1117] border border-[#30363D] rounded-md outline-none focus:border-blue-500 text-white font-mono"
                  >
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Rural">Rural</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-white mb-1 text-xs">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@cliente.com"
                    className="w-full h-8 px-2.5 bg-[#0D1117] border border-[#30363D] rounded-md outline-none focus:border-blue-500 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-white mb-1 text-xs">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full h-8 px-2.5 bg-[#0D1117] border border-[#30363D] rounded-md outline-none focus:border-blue-500 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-white mb-1 text-xs">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-8 px-2.5 bg-[#0D1117] border border-[#30363D] rounded-md outline-none focus:border-blue-500 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-white mb-1 text-xs">
                    UF
                  </label>
                  <input
                    type="text"
                    value={state}
                    maxLength={2}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full h-8 px-2.5 bg-[#0D1117] border border-[#30363D] rounded-md outline-none focus:border-blue-500 text-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-white mb-1 text-xs">
                    Consumo (kWh)
                  </label>
                  <input
                    type="number"
                    value={avgConsumptionKWh}
                    onChange={(e) => setAvgConsumptionKWh(Number(e.target.value))}
                    className="w-full h-8 px-2.5 bg-[#0D1117] border border-[#30363D] rounded-md outline-none focus:border-blue-500 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#30363D] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-[#30363D] bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] font-mono text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-[#238636] hover:bg-[#2EA043] text-white font-mono text-xs font-semibold transition-colors cursor-pointer"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
