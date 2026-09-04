import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  UserCheck,
  UsersRound,
  Zap,
} from 'lucide-react';
import { Client, ThemeConfig } from '../types';
import { fetchClients } from '../services/clients';
import { getContrastFg } from '../utils/themeEngine';
import { formatPhone } from '../utils/formatters';

interface ClientesViewProps {
  theme: ThemeConfig;
}

const formatCurrency = (value?: number) =>
  value == null
    ? 'Não informado'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const ClientesView: React.FC<ClientesViewProps> = ({ theme }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const backgroundIsDark = getContrastFg(theme.background) === '#FFFFFF';
  const panelBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 88%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 94%, #000000)`;
  const panelAltBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 82%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 90%, #000000)`;
  const mutedText = `color-mix(in srgb, ${theme.text} 62%, transparent)`;

  const loadClients = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setClients(await fetchClients());
    } catch (loadError) {
      console.error('load clients error', loadError);
      setError('Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  const visibleClients = useMemo(
    () =>
      clients.filter((client) =>
        !normalizedSearch
          ? true
          : [client.name, client.phone, formatPhone(client.phone), client.email, client.city, client.state]
              .join(' ')
              .toLocaleLowerCase('pt-BR')
              .includes(normalizedSearch)
      ),
    [clients, normalizedSearch]
  );

  const activeClients = clients.filter((client) => client.activeStatus !== 'Inativo').length;
  const qualifiedClients = clients.filter((client) => client.crmStatus === 'Qualificado').length;
  const panelStyle = { backgroundColor: panelBg, borderColor: theme.border, color: theme.text };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" style={{ color: theme.text }}>
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin" style={{ color: theme.secondary }} />
          <p className="mt-3 text-sm font-bold">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="clientes-page" className="mx-auto max-w-[1500px] space-y-5" style={{ color: theme.text }}>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div
            className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: mutedText }}
          >
            <UsersRound className="h-4 w-4" /> Base comercial
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm" style={{ color: mutedText }}>
            Leads qualificados aparecem aqui com a unidade consumidora pronta para o estudo solar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadClients(true)}
          disabled={refreshing}
          className="btn-outline inline-flex h-10 items-center gap-2 self-start rounded-lg border px-3 text-xs font-bold"
          style={{ borderColor: theme.border, color: theme.text }}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Total de clientes', value: clients.length, icon: UsersRound },
          { label: 'Em atendimento', value: activeClients, icon: UserCheck },
          { label: 'Qualificados', value: qualifiedClients, icon: Zap },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-xl border p-4" style={panelStyle}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold" style={{ color: mutedText }}>{metric.label}</p>
                  <p className="mt-2 text-2xl font-extrabold">{metric.value}</p>
                </div>
                <Icon className="h-5 w-5" style={{ color: theme.secondary }} />
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border p-3" style={panelStyle}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: mutedText }}
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, telefone, e-mail ou cidade..."
            className="crm-input !pl-10"
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </section>

      {visibleClients.length === 0 ? (
        <section className="rounded-xl border border-dashed p-10 text-center" style={panelStyle}>
          <UsersRound className="mx-auto h-8 w-8" style={{ color: mutedText }} />
          <p className="mt-3 text-sm font-extrabold">Nenhum cliente encontrado</p>
          <p className="mt-1 text-xs" style={{ color: mutedText }}>
            Qualifique um lead no funil para criar o cliente automaticamente.
          </p>
        </section>
      ) : (
        <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {visibleClients.map((client) => (
            <article key={client.id} className="rounded-xl border p-4" style={panelStyle}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-extrabold">{client.name}</h2>
                  <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: mutedText }}>
                    <MapPin className="h-3.5 w-3.5" /> {client.city || 'Cidade não informada'}
                    {client.state ? `/${client.state}` : ''}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold"
                  style={{ borderColor: theme.border, color: theme.secondary }}
                >
                  {client.crmStatus || client.activeStatus}
                </span>
              </div>

              <div
                className="mt-4 grid gap-2 rounded-lg border p-3 text-xs"
                style={{ backgroundColor: panelAltBg, borderColor: theme.border }}
              >
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {formatPhone(client.phone) || 'Não informado'}</p>
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {client.email || 'Não informado'}</p>
                <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> {client.type} · {client.concessionaria || 'Distribuidora não informada'}</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p style={{ color: mutedText }}>Consumo médio</p>
                  <p className="mt-1 font-extrabold">{client.avgConsumptionKWh || 0} kWh/mês</p>
                </div>
                <div>
                  <p style={{ color: mutedText }}>Conta média</p>
                  <p className="mt-1 font-extrabold">{formatCurrency(client.avgMonthlyBill)}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};
