import {
  Lead,
  OpportunitySizing,
  SizingStatus,
  SolarSizingInputs,
} from '../types';
import { supabase } from '../lib/supabase';
import { calculateSolarSizing, SOLAR_SIZING_VERSION } from '../utils/solarSizing';

type SolarSizingRow = {
  id: string;
  user_id: string;
  lead_id: string;
  consumer_unit_id: string | null;
  calculation_version: 'sa-sizing-v1';
  status: SizingStatus;
  connection_type: SolarSizingInputs['connectionType'];
  monthly_consumption_kwh: Array<number | string>;
  monthly_sun_hours: Array<number | string>;
  target_coverage_percent: number | string;
  future_consumption_kwh: number | string;
  inclination_factor: number | string;
  temperature_loss_percent: number | string;
  other_losses_percent: number | string;
  transformer_loss_percent: number | string;
  module_power_w: number | string;
  module_area_m2: number | string;
  inverter_power_kw: number | string;
  inverter_count: number | string;
  average_consumption_kwh: number | string;
  availability_cost_kwh: number | string;
  compensable_consumption_kwh: number | string;
  design_consumption_kwh: number | string;
  average_corrected_sun_hours: number | string;
  total_loss_percent: number | string;
  performance_ratio: number | string;
  theoretical_power_kwp: number | string;
  required_power_kwp: number | string;
  modules_count: number | string;
  installed_power_kwp: number | string;
  estimated_monthly_generation_kwh: number | string;
  estimated_annual_generation_kwh: number | string;
  estimated_coverage_percent: number | string;
  estimated_area_m2: number | string;
  dc_ac_ratio: number | string;
  monthly_generation_kwh: Array<number | string>;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const numberArray = (values: Array<number | string>) => values.map(Number);

const sizingFromRow = (row: SolarSizingRow): OpportunitySizing => {
  const dcAcRatio = Number(row.dc_ac_ratio);

  return {
    id: row.id,
    leadId: row.lead_id,
    consumerUnitId: row.consumer_unit_id ?? undefined,
    calculationVersion: row.calculation_version,
    status: row.status,
    connectionType: row.connection_type,
    monthlyConsumptionKWh: numberArray(row.monthly_consumption_kwh),
    monthlySunHours: numberArray(row.monthly_sun_hours),
    targetCoveragePercent: Number(row.target_coverage_percent),
    futureConsumptionKWh: Number(row.future_consumption_kwh),
    inclinationFactor: Number(row.inclination_factor),
    temperatureLossPercent: Number(row.temperature_loss_percent),
    otherLossesPercent: Number(row.other_losses_percent),
    transformerLossPercent: Number(row.transformer_loss_percent),
    modulePowerW: Number(row.module_power_w),
    moduleAreaM2: Number(row.module_area_m2),
    inverterPowerKW: Number(row.inverter_power_kw),
    inverterCount: Number(row.inverter_count),
    notes: row.notes ?? '',
    averageConsumptionKWh: Number(row.average_consumption_kwh),
    availabilityCostKWh: Number(row.availability_cost_kwh),
    compensableConsumptionKWh: Number(row.compensable_consumption_kwh),
    designConsumptionKWh: Number(row.design_consumption_kwh),
    averageCorrectedSunHours: Number(row.average_corrected_sun_hours),
    totalLossPercent: Number(row.total_loss_percent),
    performanceRatio: Number(row.performance_ratio),
    theoreticalPowerKWp: Number(row.theoretical_power_kwp),
    requiredPowerKWp: Number(row.required_power_kwp),
    modulesCount: Number(row.modules_count),
    installedPowerKWp: Number(row.installed_power_kwp),
    estimatedMonthlyGenerationKWh: Number(row.estimated_monthly_generation_kwh),
    estimatedAnnualGenerationKWh: Number(row.estimated_annual_generation_kwh),
    estimatedCoveragePercent: Number(row.estimated_coverage_percent),
    estimatedAreaM2: Number(row.estimated_area_m2),
    dcAcRatio,
    dcAcStatus: dcAcRatio >= 0.75 && dcAcRatio <= 1.3 ? 'ok' : 'atencao',
    monthlyGenerationKWh: numberArray(row.monthly_generation_kwh),
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const getCurrentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error ?? new Error('Sessão inválida.');
  return data.user.id;
};

export const fetchOpportunitySizing = async (
  leadId: string
): Promise<OpportunitySizing | null> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('solar_sizings')
    .select('*')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .maybeSingle();

  if (error) throw error;
  return data ? sizingFromRow(data as SolarSizingRow) : null;
};

export const saveOpportunitySizing = async (
  lead: Lead,
  inputs: SolarSizingInputs,
  status: SizingStatus,
  previousStatus?: SizingStatus
): Promise<OpportunitySizing> => {
  if (!lead.clientId || !lead.consumerUnitId) {
    throw new Error('Qualifique a oportunidade antes de realizar o dimensionamento.');
  }

  const userId = await getCurrentUserId();
  const results = calculateSolarSizing(inputs);
  const completedAt = status === 'concluido' ? new Date().toISOString() : null;
  const payload = {
    user_id: userId,
    lead_id: lead.id,
    consumer_unit_id: lead.consumerUnitId,
    calculation_version: SOLAR_SIZING_VERSION,
    status,
    connection_type: inputs.connectionType,
    monthly_consumption_kwh: inputs.monthlyConsumptionKWh,
    monthly_sun_hours: inputs.monthlySunHours,
    target_coverage_percent: inputs.targetCoveragePercent,
    future_consumption_kwh: inputs.futureConsumptionKWh,
    inclination_factor: inputs.inclinationFactor,
    temperature_loss_percent: inputs.temperatureLossPercent,
    other_losses_percent: inputs.otherLossesPercent,
    transformer_loss_percent: inputs.transformerLossPercent,
    module_power_w: inputs.modulePowerW,
    module_area_m2: inputs.moduleAreaM2,
    inverter_power_kw: inputs.inverterPowerKW,
    inverter_count: inputs.inverterCount,
    average_consumption_kwh: results.averageConsumptionKWh,
    availability_cost_kwh: results.availabilityCostKWh,
    compensable_consumption_kwh: results.compensableConsumptionKWh,
    design_consumption_kwh: results.designConsumptionKWh,
    average_corrected_sun_hours: results.averageCorrectedSunHours,
    total_loss_percent: results.totalLossPercent,
    performance_ratio: results.performanceRatio,
    theoretical_power_kwp: results.theoreticalPowerKWp,
    required_power_kwp: results.requiredPowerKWp,
    modules_count: results.modulesCount,
    installed_power_kwp: results.installedPowerKWp,
    estimated_monthly_generation_kwh: results.estimatedMonthlyGenerationKWh,
    estimated_annual_generation_kwh: results.estimatedAnnualGenerationKWh,
    estimated_coverage_percent: results.estimatedCoveragePercent,
    estimated_area_m2: results.estimatedAreaM2,
    dc_ac_ratio: results.dcAcRatio,
    monthly_generation_kwh: results.monthlyGenerationKWh,
    notes: inputs.notes.trim() || null,
    completed_at: completedAt,
  };

  const { data, error } = await supabase
    .from('solar_sizings')
    .upsert(payload, { onConflict: 'lead_id' })
    .select('*')
    .single();

  if (error) throw error;

  if (lead.status === 'qualificado') {
    const { error: stageError } = await supabase.rpc('set_lead_stage', {
      p_lead_id: lead.id,
      p_status: 'em_estudo',
    });
    if (stageError) throw stageError;
  }

  if (status === 'concluido' && previousStatus !== 'concluido') {
    const { error: activityError } = await supabase.from('lead_activities').insert({
      user_id: userId,
      lead_id: lead.id,
      activity_type: 'dimensionamento',
      title: 'Dimensionamento solar concluído',
      description: `${results.modulesCount} módulos · ${results.installedPowerKWp.toLocaleString('pt-BR')} kWp · geração estimada de ${results.estimatedMonthlyGenerationKWh.toLocaleString('pt-BR')} kWh/mês.`,
      metadata: {
        sizing_id: (data as SolarSizingRow).id,
        calculation_version: SOLAR_SIZING_VERSION,
        modules_count: results.modulesCount,
        installed_power_kwp: results.installedPowerKWp,
        estimated_monthly_generation_kwh: results.estimatedMonthlyGenerationKWh,
        estimated_coverage_percent: results.estimatedCoveragePercent,
      },
    });
    if (activityError) throw activityError;
  }

  const { error: unitError } = await supabase
    .from('consumer_units')
    .update({ average_consumption_kwh: results.averageConsumptionKWh })
    .eq('id', lead.consumerUnitId)
    .eq('user_id', userId);
  if (unitError) throw unitError;

  return sizingFromRow(data as SolarSizingRow);
};
