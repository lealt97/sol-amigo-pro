export type BrazilStateGroup = {
  region: string;
  states: ReadonlyArray<readonly [string, string]>;
};

export const BRAZIL_STATE_GROUPS: ReadonlyArray<BrazilStateGroup> = [
  { region: 'Norte', states: [['AC', 'Acre'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['PA', 'Pará'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['TO', 'Tocantins']] },
  { region: 'Nordeste', states: [['AL', 'Alagoas'], ['BA', 'Bahia'], ['CE', 'Ceará'], ['MA', 'Maranhão'], ['PB', 'Paraíba'], ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RN', 'Rio Grande do Norte'], ['SE', 'Sergipe']] },
  { region: 'Centro-Oeste', states: [['DF', 'Distrito Federal'], ['GO', 'Goiás'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul']] },
  { region: 'Sudeste', states: [['ES', 'Espírito Santo'], ['MG', 'Minas Gerais'], ['RJ', 'Rio de Janeiro'], ['SP', 'São Paulo']] },
  { region: 'Sul', states: [['PR', 'Paraná'], ['RS', 'Rio Grande do Sul'], ['SC', 'Santa Catarina']] },
] as const;

export const ALL_BRAZIL_STATE_CODES = BRAZIL_STATE_GROUPS.flatMap(({ states }) =>
  states.map(([code]) => code)
);

export const BRAZIL_STATE_NAMES = Object.fromEntries(
  BRAZIL_STATE_GROUPS.flatMap(({ states }) => states)
) as Record<string, string>;
