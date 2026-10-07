import React from 'react';
import { PdfSettingsConfig, ProposalEquipmentOutput, SolarProposal, ThemeConfig } from '../types';
import { formatMaintenanceFrequency, getMaintenanceAnnualSalePrice } from '../utils/maintenance';
import './solarProposalDocument.css';

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const number = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
const date = (value?: string) => value ? (Number.isNaN(Date.parse(value)) ? value : new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' })) : 'Não informado';

export function SolarProposalDocument({ proposal: p, pdfSettings: settings, theme }: {
  proposal: SolarProposal; pdfSettings: PdfSettingsConfig; theme: ThemeConfig;
}) {
  const primary = settings.useAccountColors ? theme.primary : settings.primary;
  const accent = settings.useAccountColors ? theme.secondary : settings.secondary;
  const yearlySavings = Math.max(0, p.estimatedMonthlySavings * 12);
  const investment = Math.max(0, p.totalValue);
  const payback = yearlySavings > 0 ? investment / yearlySavings : null;
  const years = Array.from({ length: 26 }, (_, year) => ({ year, balance: yearlySavings * year - investment }));
  const min = -Math.max(investment, 1);
  const max = Math.max(years[25].balance, yearlySavings, 1);
  const y = (value: number) => 260 - ((value - min) / (max - min)) * 220;
  const zero = y(0);
  const conditions = p.commercialConditions;
  const equipment: ProposalEquipmentOutput[] = p.equipmentOutput?.length ? p.equipmentOutput : p.pricing?.equipmentItems?.length ? p.pricing.equipmentItems : [
    { id: 'modules', description: p.moduleModel || 'Módulos fotovoltaicos', quantity: p.modulesCount, category: 'Módulos', unitCost: 0 },
    { id: 'inverter', description: p.inverterModel || 'Inversor solar', quantity: p.technicalOutput?.inverterCount || p.sizing?.inverterCount || 1, category: 'Inversor', unitCost: 0 },
    ...(p.batteryCount ? [{ id: 'battery', description: p.batteryModel || 'Bateria', quantity: p.batteryCount, category: 'Baterias', unitCost: 0 }] : []),
  ];
  const company = p.companyInfo;
  const pages: { title: string; subtitle: string; content: React.ReactNode }[] = [
    {
      title: 'Sobre a empresa', subtitle: company?.name || 'Conheça a integradora responsável pela proposta.',
      content: <>
        <div className="proposal-info-box"><h3>{company?.name || 'Integradora'}</h3><p className="proposal-multiline">{company?.description || 'Apresentação da empresa não informada no perfil da conta.'}</p></div>
        <h3>Dados da empresa e do responsável</h3>
        <table><tbody>
          <tr><td>Empresa</td><td>{company?.name || 'Não informada'}</td></tr>
          <tr><td>CNPJ</td><td>{company?.document || 'Não informado'}</td></tr>
          <tr><td>Responsável</td><td>{company?.representative || 'Não informado'}</td></tr>
          <tr><td>Telefone</td><td>{company?.phone || 'Não informado'}</td></tr>
          <tr><td>E-mail</td><td>{company?.email || 'Não informado'}</td></tr>
        </tbody></table>
      </>,
    },
    {
      title: 'Detalhes da proposta', subtitle: 'Sistema fotovoltaico | ' + (p.systemType || 'On-Grid'),
      content: <>
        <div className="proposal-info-box"><h3>Dados do cliente</h3><strong>{p.clientName}</strong><p>{[p.clientCity, p.clientState].filter(Boolean).join(' / ') || 'Localidade não informada'}</p>{p.clientEmail && <p>{p.clientEmail}</p>}{p.clientPhone && <p>{p.clientPhone}</p>}</div>
        <h3>Dimensionamento</h3>
        <table><tbody>{[
          ['Concessionária', p.concessionaria || 'Não informada'],
          ['Consumo médio mensal', number(p.monthlyConsumptionKWh) + ' kWh/mês'],
          ['Potência instalada', number(p.systemPowerKWp) + ' kWp'],
          ['Geração média estimada', number(p.estimatedMonthlyGenKWh) + ' kWh/mês'],
          ['Módulos fotovoltaicos', number(p.modulesCount) + ' unidades'],
          ...(p.technicalOutput?.connectionType ? [['Tipo de ligação', p.technicalOutput.connectionType]] : []),
          ...(p.technicalOutput?.targetCoveragePercent !== undefined ? [['Cobertura desejada', number(p.technicalOutput.targetCoveragePercent) + '%']] : []),
          ...(p.performanceRatio !== undefined ? [['Performance Ratio', number(p.performanceRatio) + '%']] : []),
          ...((p.technicalOutput?.estimatedAreaM2 || p.sizing?.estimatedAreaM2) ? [['Área estimada', number(p.technicalOutput?.estimatedAreaM2 || p.sizing?.estimatedAreaM2 || 0) + ' m²']] : []),
          ...(p.technicalOutput?.backupAutonomyHours ? [['Autonomia de backup desejada', number(p.technicalOutput.backupAutonomyHours) + ' horas']] : []),
          ...(p.batteryCapacityKWh ? [['Capacidade total das baterias', number(p.batteryCapacityKWh) + ' kWh']] : []),
          ...(p.hsp ? [['Irradiação solar diária média', number(p.hsp) + ' kWh/m²/dia']] : []),
        ].map(([label, value]) => <tr key={label}><td>{label}</td><td><strong>{value}</strong></td></tr>)}</tbody></table>
        <div className="proposal-info-box"><h3>Proposta {p.code}</h3><p>Emissão: {date(p.createdAt)}</p><p>Validade: {date(p.validUntil)}</p></div>
      </>,
    },
  ];
  if (settings.showEquipment) {
    for (let start = 0; start < equipment.length; start += 6) {
      pages.push({ title: 'Os equipamentos', subtitle: 'Lista de materiais orçados nesta proposta comercial.',
        content: <><table><thead><tr><th>Produto / material</th><th>Categoria</th><th>Quantidade</th></tr></thead><tbody>{equipment.slice(start, start + 6).map(item => <tr key={item.id}><td><strong>{item.description}</strong>{(item.brand || item.model) && <p>{[item.brand, item.model].filter(Boolean).join(' · ')}</p>}{item.powerW !== undefined && <p>Potência: {number(item.powerW)} W</p>}{item.capacityKWh !== undefined && <p>Capacidade: {number(item.capacityKWh)} kWh</p>}{item.warrantyYears !== undefined && item.warrantyYears > 0 && <p>Garantia de catálogo: {item.warrantyYears} ano(s)</p>}</td><td>{item.category}</td><td>{number(item.quantity)}</td></tr>)}</tbody></table>
          <div className="proposal-total"><span>Valor total da proposta</span><strong>{money(investment)}</strong>{p.systemPowerKWp > 0 && <small>{money(investment / (p.systemPowerKWp * 1000))} por Wp</small>}</div>
          <p className="proposal-note">Valores apresentados para o conjunto contratado. O detalhamento dos materiais não representa preços individuais de venda.</p></>,
      });
    }
  }
  pages.push({
    title: 'Pagamento e entrega', subtitle: 'Condições comerciais desta proposta.',
    content: <>
      {conditions?.cashPaymentTerms && <div className="proposal-info-box"><h3>Pagamento à vista</h3><p className="proposal-multiline">{conditions.cashPaymentTerms}</p></div>}
      {conditions?.installmentPaymentTerms && <div className="proposal-info-box"><h3>Pagamento a prazo</h3><p className="proposal-multiline">{conditions.installmentPaymentTerms}</p></div>}
      <div className="proposal-info-box"><h3>{conditions?.cashPaymentTerms || conditions?.installmentPaymentTerms ? 'Financiamento / outras formas de pagamento' : 'Formas de pagamento'}</h3><p className="proposal-multiline">{conditions?.paymentMethods || 'Condições de pagamento a definir com a integradora.'}</p></div>
      <div className="proposal-info-box"><h3>Prazo de entrega e instalação</h3><p className="proposal-multiline">{conditions?.deliveryTimeframe || 'Prazo a confirmar após vistoria e aprovação da proposta.'}</p></div>
      <div className="proposal-total"><span>Investimento total</span><strong>{money(investment)}</strong></div>
      {conditions?.notes && <div className="proposal-info-box"><h3>Observações comerciais</h3><p className="proposal-multiline">{conditions.notes}</p></div>}
    </>,
  });
  pages.push({
    title: 'Retorno do investimento', subtitle: 'Payback simples e saldo acumulado ao longo dos anos.',
    content: <>
      <div className="proposal-metrics"><div><small>Economia mensal estimada</small><strong>{money(p.estimatedMonthlySavings)}</strong></div><div><small>Retorno estimado</small><strong>{payback === null ? 'Sem retorno estimado' : number(payback) + ' anos'}</strong></div></div>
      <svg viewBox="0 0 720 315" role="img" aria-label="Gráfico de barras verticais do saldo acumulado: investimento inicial negativo e economia anual até o ano 25" className="proposal-payback-chart">
        {[min, 0, max / 2, max].map((value, index) => <g key={index}><line x1="90" x2="710" y1={y(value)} y2={y(value)} stroke="#e2e8f0" /><text x="82" y={y(value) + 4} textAnchor="end" fontSize="10" fill="#64748b">{number(value / 1000)} mil</text></g>)}
        {years.map(({ year, balance }) => <g key={year}><rect x={94 + year * 23.4} y={Math.min(zero, y(balance))} width="16" height={Math.max(1, Math.abs(y(balance) - zero))} rx="2" fill={balance < 0 ? '#94a3b8' : accent}><title>{'Ano ' + year + ': ' + money(balance)}</title></rect><text x={102 + year * 23.4} y="283" textAnchor="middle" fontSize="9" fill="#475569">{year}</text></g>)}
        <line x1="90" x2="710" y1={zero} y2={zero} stroke="#475569" />
        <text x="400" y="306" textAnchor="middle" fontSize="11" fill="#475569">Ano após a instalação</text>
        <text x="8" y="22" fontSize="10" fill="#475569">Saldo (R$)</text>
      </svg>
      <p className="proposal-note">Cinza: investimento ainda não recuperado. Cor da proposta: saldo positivo. Ano 0: investimento inicial.</p>
      <table><tbody><tr><td>Investimento inicial</td><td>{money(investment)}</td></tr><tr><td>Economia anual estimada</td><td>{money(yearlySavings)}</td></tr><tr><td>Saldo estimado em 25 anos</td><td>{money(years[25].balance)}</td></tr></tbody></table>
      <p className="proposal-note">Projeção simples: saldo = economia mensal × 12 × ano − investimento. Mantém a economia constante, sem reajuste tarifário, degradação, financiamento ou despesas futuras de manutenção. Os resultados são estimativas, sujeitos às condições reais de uso e geração.</p>
    </>,
  });
  pages.push({
    title: 'Termos e condições', subtitle: 'Fornecimento, garantias e acompanhamento do sistema.',
    content: <>
      <div className="proposal-info-box"><h3>Garantias</h3><p className="proposal-multiline">{conditions?.warrantyTerms || 'Garantias dos equipamentos e da instalação conforme os termos a confirmar com a integradora.'}</p></div>
      {p.maintenancePlan?.enabled && <div className="proposal-info-box"><h3>Plano de manutenção — {p.maintenancePlan.name}</h3><p>{p.maintenancePlan.visitsPerYear} visita(s) por ano, {formatMaintenanceFrequency(p.maintenancePlan)}.</p><p>Valor anual estimado: {money(getMaintenanceAnnualSalePrice(p.maintenancePlan))}</p><ul>{p.maintenancePlan.includedServices.map(service => <li key={service}>{service}</li>)}</ul>{p.maintenancePlan.notes && <p className="proposal-multiline">{p.maintenancePlan.notes}</p>}</div>}
      <p className="proposal-note">Geração de energia, economia e retorno são estimados a partir do dimensionamento. A instalação e a homologação dependem de vistoria técnica e aprovação da concessionária.</p>
    </>,
  });
  pages.push({
    title: 'Aceite da proposta', subtitle: 'Confirmação dos produtos, valores e condições apresentados.',
    content: <>
      <p>Ao aceitar esta proposta, o cliente declara estar de acordo com os materiais, o investimento e as condições comerciais descritos neste documento.</p>
      <div className="proposal-info-box"><h3>Dados do cliente</h3><p>Nome: {p.clientName}</p><p>CPF / CNPJ: {p.clientDocument || 'Não informado no cadastro'}</p><p>Endereço: {p.clientAddress || 'Não informado no cadastro'}</p><p>Cidade / UF: {[p.clientCity, p.clientState].filter(Boolean).join(' / ')}</p>{p.clientEmail && <p>E-mail: {p.clientEmail}</p>}{p.clientPhone && <p>Telefone: {p.clientPhone}</p>}</div>
      <p>Local e data: _______________________________________</p>
      <div className="proposal-signatures"><div><span />{company?.name || company?.representative || 'Integradora / responsável'}{company?.document && <p>{company.document}</p>}</div><div><span />{p.clientName}</div></div>
    </>,
  });
  return <div className="solar-proposal-pages" style={{ '--proposal-primary': primary, '--proposal-accent': accent } as React.CSSProperties}>
    {pages.map((page, index) => <section key={index} className="solar-proposal-page">
      <header><span>{p.code}</span>{settings.showLogo && settings.customLogoUrl && <img src={settings.customLogoUrl} alt="Logo da integradora" />}</header>
      <h2>{page.title}</h2><p className="proposal-subtitle">{page.subtitle}</p>
      <div className="proposal-page-content">{page.content}</div>
      <footer><span>{p.clientName} · {p.code}</span><span>{index + 2} / {pages.length + 1}</span></footer>
    </section>)}
  </div>;
}
