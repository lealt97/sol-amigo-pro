import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWizardProposal, type WizardProposalInput } from '../src/features/proposals/buildProposal';
import { assertPublishableProposal, clientProposalToSolarProposal } from '../src/features/proposals/document';
const input: WizardProposalInput = {
  selectedTarget: { id:'real-client', name:'Cliente real',type:'client',email:'cliente@example.com',city:'Recife',state:'PE' },
  clientsList: [], connectionType:'Monofásica',targetCoveragePercent:100,modulePowerW:550,energyTariff:0.9,backupAutonomyHours:4,
  selectedKit:null,moduleModel:'Módulo informado',inverterModel:'Inversor informado',batteryModel:'Bateria informada',batteryCount:2,batteryCapacityKWh:5,
  concessionaria:'Distribuidora informada',hsp:5,performanceRatio:80,commercialPricing:{finalSalePrice:24000} as WizardProposalInput['commercialPricing'],
  maintenancePlan:{enabled:false,type:'none',name:'Sem plano',frequencyMonths:0,visitsPerYear:0,internalCostPerVisit:0,annualPrice:0,includedServices:[],notes:''},
  paymentMethods:'Pix',cashPaymentTerms:'50% na contratação',installmentPaymentTerms:'',deliveryTimeframe:'30 dias',warrantyTerms:'Garantias acordadas',commercialNotes:'',
  systemType:'On-Grid',effectiveAverageKWh:600,installedPowerKWp:5.5,modulesCount:10,estimatedMonthlyGenKWh:650,
};
test('documento preserva contato, pagamento, equipamentos e identidade única', () => {
  const a=buildWizardProposal(input),b=buildWizardProposal(input);
  assert.notEqual(a.id,b.id);assert.notEqual(a.code,b.code);assert.equal(a.clientId,'real-client');assert.equal(a.clientCity,'Recife');
  assert.equal(a.commercialConditions?.cashPaymentTerms,input.cashPaymentTerms);assert.equal(a.equipmentOutput?.[0].quantity,10);assert.equal(a.totalValue,24000);
  assert.equal(a.paybackYears,Number((24000/(600*0.9*12)).toFixed(2)));
});
test('documento não inventa dimensionamento, equipamento ou preço', () => {
  assert.throws(()=>buildWizardProposal({...input,effectiveAverageKWh:0}));assert.throws(()=>buildWizardProposal({...input,moduleModel:''}));assert.throws(()=>buildWizardProposal({...input,commercialPricing:null}));
  const proposal=buildWizardProposal({...input,selectedTarget:{id:'real',name:'Nome real',type:'lead'}});
  assert.equal(proposal.clientCity,'');assert.equal(proposal.clientState,'');
});
test('conversão não transforma off-grid em on-grid nem preenche dados ausentes com exemplos', () => {
  const converted=clientProposalToSolarProposal({id:'p',code:'PROP-REAL',clientId:'c',clientName:'Cliente',title:'',systemPowerKWp:0,systemType:'Off-Grid',totalValue:0,status:'Rascunho',createdAt:'2026-10-14'});
  assert.equal(converted.systemType,'Off-Grid');assert.equal(converted.moduleModel,'');assert.equal(converted.clientCity,'');assert.equal(converted.estimatedMonthlySavings,0);assert.equal(converted.monthlyConsumptionKWh,0);
});

test('publicação bloqueia rascunhos incompletos sem inventar dados', () => { const p=buildWizardProposal(input);assert.doesNotThrow(()=>assertPublishableProposal(p));assert.throws(()=>assertPublishableProposal({...p,totalValue:0}));assert.throws(()=>assertPublishableProposal({...p,moduleModel:''}));assert.throws(()=>buildWizardProposal({...input,modulesCount:9})); });
