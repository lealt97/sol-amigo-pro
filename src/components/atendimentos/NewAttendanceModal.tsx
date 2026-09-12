import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  DollarSign,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
  X,
  Zap,
} from 'lucide-react';
import { Lead, ThemeConfig } from '../../types';
import { formatPhone } from '../../utils/formatters';
import { createManualLead } from '../../services/leads';

interface NewAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  onCreated: (lead: Lead) => void;
  onShowToast: (message: string) => void;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const NewAttendanceModal: React.FC<NewAttendanceModalProps> = ({
  isOpen,
  onClose,
  theme,
  onCreated,
  onShowToast,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [propertyType, setPropertyType] = useState<Lead['propertyType']>('Residencial');
  const [propertyStatus, setPropertyStatus] = useState<Lead['propertyStatus']>('Próprio');
  const [distributor, setDistributor] = useState('');
  const [averageMonthlyBill, setAverageMonthlyBill] = useState('');
  const [averageConsumptionKWh, setAverageConsumptionKWh] = useState('');
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const phoneDigits = phone.replace(/\D/g, '');

    if (trimmedName.length < 2) {
      setError('Informe o nome do interessado.');
      return;
    }

    if (phoneDigits.length < 10) {
      setError('Informe um telefone/WhatsApp válido com DDD.');
      return;
    }

    if (!city.trim() || !state) {
      setError('Informe a cidade e o estado.');
      return;
    }

    const billNum = averageMonthlyBill ? Number(averageMonthlyBill.replace(',', '.')) : undefined;
    const consNum = averageConsumptionKWh ? Number(averageConsumptionKWh.replace(',', '.')) : undefined;

    if (!billNum && !consNum) {
      setError('Informe a fatura média (R$) ou o consumo médio (kWh).');
      return;
    }

    setLoading(true);

    try {
      const createdLead = await createManualLead({
        name: trimmedName,
        phone: phoneDigits,
        email: email.trim() || undefined,
        city: city.trim(),
        state,
        propertyType,
        propertyStatus,
        distributor: distributor.trim() || undefined,
        averageMonthlyBill: billNum,
        averageConsumptionKWh: consNum,
        responsible: responsible.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onShowToast(`Atendimento de "${trimmedName}" cadastrado com sucesso!`);
      onCreated(createdLead);
      onClose();
    } catch (err) {
      console.error('Erro ao criar atendimento:', err);
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar o atendimento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-6 text-[#C9D1D9] my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#30363D] pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Novo Atendimento Comercial
            </h2>
            <p className="text-xs text-[#8B949E] mt-0.5">
              Cadastre um novo interessado para iniciar o fluxo de qualificação e proposta.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Seção 1: Dados do Interessado */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] text-[#8B949E]">
              1. Identificação do Interessado
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#8B949E] mb-1 font-medium">
                  Nome do Interessado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Silveira"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-white placeholder-[#484F58] focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] mb-1 font-medium">
                  WhatsApp / Telefone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-white placeholder-[#484F58] focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] mb-1 font-medium">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-white placeholder-[#484F58] focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] mb-1 font-medium">
                  Consultor / Responsável
                </label>
                <input
                  type="text"
                  placeholder="Seu nome ou vendedor"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-white placeholder-[#484F58] focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Localização e Imóvel */}
          <div className="space-y-3 pt-2 border-t border-[#30363D]">
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] text-[#8B949E]">
              2. Localização e Perfil do Imóvel
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[#8B949E] mb-1 font-medium">
                  Cidade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Campinas"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-white placeholder-[#484F58] focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] mb-1 font-medium">
                  Estado (UF) *
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                >
                  {BRAZILIAN_STATES.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#8B949E] mb-1 font-medium">
                  Tipo de Imóvel
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as Lead['propertyType'])}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="Residencial">Residencial</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Rural">Rural</option>
                  <option value="Industrial">Industrial</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8B949E] mb-1 font-medium">
                  Condição do Imóvel
                </label>
                <select
                  value={propertyStatus || 'Próprio'}
                  onChange={(e) => setPropertyStatus(e.target.value as Lead['propertyStatus'])}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="Próprio">Próprio</option>
                  <option value="Alugado">Alugado</option>
                  <option value="Em construção">Em construção</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8B949E] mb-1 font-medium">
                  Distribuidora de Energia
                </label>
                <input
                  type="text"
                  placeholder="Ex: CPFL, Enel, Cemig..."
                  value={distributor}
                  onChange={(e) => setDistributor(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-white placeholder-[#484F58] focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Consumo e Energia */}
          <div className="space-y-3 pt-2 border-t border-[#30363D]">
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] text-[#8B949E]">
              3. Consumo Energético Médio
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#8B949E] mb-1 font-medium">
                  Valor Médio da Fatura (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[#8B949E] font-medium">R$</span>
                  <input
                    type="text"
                    placeholder="850,00"
                    value={averageMonthlyBill}
                    onChange={(e) => setAverageMonthlyBill(e.target.value)}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg pl-9 pr-3 py-2 text-white placeholder-[#484F58] focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8B949E] mb-1 font-medium">
                  Consumo Médio Estimado (kWh/mês)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: 950"
                    value={averageConsumptionKWh}
                    onChange={(e) => setAverageConsumptionKWh(e.target.value)}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-white placeholder-[#484F58] focus:border-blue-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-2.5 text-[#8B949E]">kWh</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 4: Observações */}
          <div className="space-y-2 pt-2 border-t border-[#30363D]">
            <label className="block text-[#8B949E] font-medium">
              Observações Iniciais / Detalhes da Solicitação
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Cliente tem interesse em instalar no telhado colonial da casa, pretende financiar em 36x."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-3 text-white placeholder-[#484F58] focus:border-blue-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#30363D]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-[#30363D] text-[#C9D1D9] hover:bg-[#21262D] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Criar Atendimento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
