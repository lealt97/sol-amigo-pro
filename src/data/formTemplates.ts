export type FormTemplate = {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  headline: string;
  subheadline: string;
  submitLabel: string;
  successMessage: string;
  customCss: string;
  preview: {
    canvas: string;
    card: string;
    header: string;
    headerText: string;
    mutedText: string;
    input: string;
    inputBorder: string;
    button: string;
    buttonText: string;
    radius: number;
  };
};

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'solar-profissional',
    name: 'Solar Profissional',
    description: 'Visual institucional em azul-marinho e amarelo solar.',
    primaryColor: '#0E2337',
    secondaryColor: '#FACB5C',
    headline: 'Descubra quanto você pode economizar com energia solar',
    subheadline: 'Preencha seus dados e receba uma análise personalizada para o seu imóvel.',
    submitLabel: 'Calcular economia',
    successMessage: 'Recebemos seus dados. Nossa equipe entrará em contato com a sua análise solar.',
    customCss: `.sol-form__card {
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
  background-color: #F7FAFC;
  border: 1px solid #DCE6EF;
  border-radius: 24px;
  box-shadow: 0 18px 45px rgba(14, 35, 55, 0.16);
}

.sol-form__header {
  background-color: #0E2337;
  color: #FFFFFF;
  padding: 28px;
}

.sol-form__title {
  font-size: 30px;
  line-height: 1.15;
}

.sol-form__subtitle {
  color: #DCE6EF;
}

.sol-form__input,
.sol-form__select {
  background-color: #FFFFFF;
  border: 1px solid #B8D8F5;
  border-radius: 12px;
}

.sol-form__button {
  background-color: #FACB5C;
  color: #0E2337;
  border-radius: 12px;
  font-weight: 800;
}`,
    preview: {
      canvas: '#EAF0F5', card: '#F7FAFC', header: '#0E2337', headerText: '#FFFFFF',
      mutedText: '#DCE6EF', input: '#FFFFFF', inputBorder: '#B8D8F5', button: '#FACB5C',
      buttonText: '#0E2337', radius: 18,
    },
  },
  {
    id: 'conversao-azul',
    name: 'Conversão Azul',
    description: 'Chamadas diretas, botão destacado e campos compactos.',
    primaryColor: '#0076DD',
    secondaryColor: '#13B981',
    headline: 'Sua conta de luz pode ficar muito menor',
    subheadline: 'Faça uma simulação gratuita e descubra o potencial de economia do seu imóvel.',
    submitLabel: 'Quero minha simulação',
    successMessage: 'Simulação solicitada com sucesso. Em breve um especialista falará com você.',
    customCss: `.sol-form__card {
  max-width: 680px;
  margin-left: auto;
  margin-right: auto;
  background-color: #F8FBFF;
  border: 1px solid #CFE8FF;
  border-radius: 18px;
  box-shadow: 0 16px 38px rgba(0, 118, 221, 0.18);
}

.sol-form__header {
  background-color: #0076DD;
  color: #FFFFFF;
  padding: 26px;
  text-align: center;
}

.sol-form__title {
  font-size: 29px;
  line-height: 1.15;
}

.sol-form__input,
.sol-form__select {
  background-color: #FFFFFF;
  border: 1px solid #64B0F3;
  border-radius: 10px;
}

.sol-form__button {
  background-color: #13B981;
  color: #FFFFFF;
  border-radius: 999px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}`,
    preview: {
      canvas: '#EAF6FF', card: '#F8FBFF', header: '#0076DD', headerText: '#FFFFFF',
      mutedText: '#D9EEFF', input: '#FFFFFF', inputBorder: '#64B0F3', button: '#13B981',
      buttonText: '#FFFFFF', radius: 14,
    },
  },
  {
    id: 'eco-essencial',
    name: 'Eco Essencial',
    description: 'Paleta verde suave para comunicar sustentabilidade.',
    primaryColor: '#276749',
    secondaryColor: '#F4C95D',
    headline: 'Economize hoje e produza energia limpa por muitos anos',
    subheadline: 'Conte um pouco sobre o seu imóvel para prepararmos uma solução sustentável.',
    submitLabel: 'Simular energia limpa',
    successMessage: 'Tudo certo! Vamos analisar seu perfil e retornar com uma solução sustentável.',
    customCss: `.sol-form__card {
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  background-color: #F6FAF3;
  border: 1px solid #CFDDC4;
  border-radius: 22px;
  box-shadow: 0 16px 38px rgba(39, 103, 73, 0.14);
}

.sol-form__header {
  background-color: #276749;
  color: #FFFFFF;
  padding: 28px;
}

.sol-form__subtitle {
  color: #E3F1E8;
}

.sol-form__input,
.sol-form__select {
  background-color: #FFFFFF;
  border: 1px solid #B4BF8A;
  border-radius: 14px;
}

.sol-form__button {
  background-color: #F4C95D;
  color: #173D2C;
  border-radius: 14px;
  font-weight: 800;
}

.sol-form__consent {
  color: #365C48;
}`,
    preview: {
      canvas: '#EAF2E5', card: '#F6FAF3', header: '#276749', headerText: '#FFFFFF',
      mutedText: '#E3F1E8', input: '#FFFFFF', inputBorder: '#B4BF8A', button: '#F4C95D',
      buttonText: '#173D2C', radius: 16,
    },
  },
  {
    id: 'premium-noturno',
    name: 'Premium Noturno',
    description: 'Fundo escuro e detalhes dourados para alto padrão.',
    primaryColor: '#091A29',
    secondaryColor: '#DEC488',
    headline: 'Energia solar projetada para valorizar o seu patrimônio',
    subheadline: 'Receba um atendimento consultivo e uma solução dimensionada para o seu perfil.',
    submitLabel: 'Solicitar análise premium',
    successMessage: 'Solicitação recebida. Um consultor entrará em contato para conduzir sua análise.',
    customCss: `.sol-form__card {
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
  background-color: #091A29;
  border: 1px solid #365A75;
  border-radius: 20px;
  box-shadow: 0 22px 52px rgba(3, 12, 20, 0.38);
  color: #F8FAFC;
}

.sol-form__header {
  background-color: #0E2337;
  color: #FFFFFF;
  padding: 30px;
}

.sol-form__subtitle {
  color: #CBD5E1;
}

.sol-form__input,
.sol-form__select {
  background-color: #10283C;
  border: 1px solid #365A75;
  border-radius: 10px;
  color: #F8FAFC;
}

.sol-form__label,
.sol-form__consent {
  color: #D5DEE7;
}

.sol-form__button {
  background-color: #DEC488;
  color: #091A29;
  border-radius: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.sol-form__powered-by {
  color: #8FA6B9;
}`,
    preview: {
      canvas: '#07131F', card: '#091A29', header: '#0E2337', headerText: '#FFFFFF',
      mutedText: '#CBD5E1', input: '#10283C', inputBorder: '#365A75', button: '#DEC488',
      buttonText: '#091A29', radius: 15,
    },
  },
  {
    id: 'minimalista-claro',
    name: 'Minimalista Claro',
    description: 'Leve, discreto e fácil de combinar com qualquer site.',
    primaryColor: '#183956',
    secondaryColor: '#0076DD',
    headline: 'Faça sua simulação de energia solar',
    subheadline: 'Informe seus dados para receber uma avaliação simples, rápida e sem compromisso.',
    submitLabel: 'Continuar',
    successMessage: 'Dados enviados. Entraremos em contato assim que sua avaliação estiver pronta.',
    customCss: `.sol-form__card {
  max-width: 660px;
  margin-left: auto;
  margin-right: auto;
  background-color: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(24, 57, 86, 0.10);
  color: #183956;
}

.sol-form__header {
  background-color: #FFFFFF;
  color: #183956;
  padding: 24px;
}

.sol-form__title {
  font-size: 27px;
  line-height: 1.2;
}

.sol-form__subtitle {
  color: #64748B;
}

.sol-form__input,
.sol-form__select {
  background-color: #FFFFFF;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
}

.sol-form__button {
  background-color: #0076DD;
  color: #FFFFFF;
  border-radius: 6px;
  font-weight: 700;
}`,
    preview: {
      canvas: '#F1F5F9', card: '#FFFFFF', header: '#FFFFFF', headerText: '#183956',
      mutedText: '#64748B', input: '#FFFFFF', inputBorder: '#CBD5E1', button: '#0076DD',
      buttonText: '#FFFFFF', radius: 7,
    },
  },
  {
    id: 'energia-vibrante',
    name: 'Energia Vibrante',
    description: 'Laranja energético, tipografia forte e chamada marcante.',
    primaryColor: '#F97316',
    secondaryColor: '#0E2337',
    headline: 'Transforme sol em economia todos os meses',
    subheadline: 'Descubra em poucos passos quanto seu imóvel pode economizar gerando a própria energia.',
    submitLabel: 'Começar agora',
    successMessage: 'Ótimo! Sua solicitação chegou e nossa equipe já pode preparar a simulação.',
    customCss: `.sol-form__card {
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  background-color: #FFF8E7;
  border: 1px solid #FED7AA;
  border-radius: 26px;
  box-shadow: 0 20px 46px rgba(249, 115, 22, 0.22);
  color: #0E2337;
}

.sol-form__header {
  background-color: #F97316;
  color: #FFFFFF;
  padding: 28px;
}

.sol-form__title {
  font-size: 31px;
  line-height: 1.1;
}

.sol-form__subtitle {
  color: #FFF1E6;
}

.sol-form__input,
.sol-form__select {
  background-color: #FFFFFF;
  border: 1px solid #FDBA74;
  border-radius: 16px;
}

.sol-form__button {
  background-color: #0E2337;
  color: #FFFFFF;
  border-radius: 16px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}`,
    preview: {
      canvas: '#FFF1DF', card: '#FFF8E7', header: '#F97316', headerText: '#FFFFFF',
      mutedText: '#FFF1E6', input: '#FFFFFF', inputBorder: '#FDBA74', button: '#0E2337',
      buttonText: '#FFFFFF', radius: 19,
    },
  },
];
