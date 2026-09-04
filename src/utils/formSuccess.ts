export interface FormSuccessDetails {
  title: string;
  message: string;
  nextStepTitle: string;
  nextStepDescription: string;
  showNextStep: boolean;
  actionButtonLabel: string;
  actionButtonUrl: string;
}

export const DEFAULT_SUCCESS_TITLE = 'Recebemos sua solicitação!';
export const DEFAULT_SUCCESS_MESSAGE =
  'Recebemos seus dados. Nossa equipe entrará em contato com a sua análise solar.';
export const DEFAULT_NEXT_STEP_TITLE = 'Próximo passo';
export const DEFAULT_NEXT_STEP_DESC =
  'Vamos confirmar seus dados e preparar uma análise inicial do seu consumo.';

export function parseSuccessDetails(
  rawSuccessMessage?: string | null,
  successConfigFromTheme?: unknown
): FormSuccessDetails {
  // 1. Check if successConfigFromTheme is an object with data
  if (successConfigFromTheme && typeof successConfigFromTheme === 'object') {
    const obj = successConfigFromTheme as Record<string, unknown>;
    return {
      title:
        typeof obj.title === 'string' && obj.title.trim()
          ? obj.title.trim()
          : DEFAULT_SUCCESS_TITLE,
      message:
        typeof obj.message === 'string' && obj.message.trim()
          ? obj.message.trim()
          : typeof rawSuccessMessage === 'string' && rawSuccessMessage.trim()
            ? rawSuccessMessage.trim()
            : DEFAULT_SUCCESS_MESSAGE,
      nextStepTitle:
        typeof obj.stepTitle === 'string' && obj.stepTitle.trim()
          ? obj.stepTitle.trim()
          : DEFAULT_NEXT_STEP_TITLE,
      nextStepDescription:
        typeof obj.stepDesc === 'string' && obj.stepDesc.trim()
          ? obj.stepDesc.trim()
          : DEFAULT_NEXT_STEP_DESC,
      showNextStep: obj.showStep !== false,
      actionButtonLabel: typeof obj.btnLabel === 'string' ? obj.btnLabel.trim() : '',
      actionButtonUrl: typeof obj.btnUrl === 'string' ? obj.btnUrl.trim() : '',
    };
  }

  // 2. Check if rawSuccessMessage is JSON
  const trimmed = (rawSuccessMessage || '').trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return {
          title:
            typeof parsed.t === 'string' && parsed.t.trim()
              ? parsed.t.trim()
              : typeof parsed.title === 'string' && parsed.title.trim()
                ? parsed.title.trim()
                : DEFAULT_SUCCESS_TITLE,
          message:
            typeof parsed.m === 'string' && parsed.m.trim()
              ? parsed.m.trim()
              : typeof parsed.message === 'string' && parsed.message.trim()
                ? parsed.message.trim()
                : DEFAULT_SUCCESS_MESSAGE,
          nextStepTitle:
            typeof parsed.nt === 'string' && parsed.nt.trim()
              ? parsed.nt.trim()
              : typeof parsed.stepTitle === 'string' && parsed.stepTitle.trim()
                ? parsed.stepTitle.trim()
                : DEFAULT_NEXT_STEP_TITLE,
          nextStepDescription:
            typeof parsed.nd === 'string' && parsed.nd.trim()
              ? parsed.nd.trim()
              : typeof parsed.stepDesc === 'string' && parsed.stepDesc.trim()
                ? parsed.stepDesc.trim()
                : DEFAULT_NEXT_STEP_DESC,
          showNextStep: parsed.s !== false && parsed.showStep !== false,
          actionButtonLabel:
            typeof parsed.b === 'string'
              ? parsed.b.trim()
              : typeof parsed.btnLabel === 'string'
                ? parsed.btnLabel.trim()
                : '',
          actionButtonUrl:
            typeof parsed.u === 'string'
              ? parsed.u.trim()
              : typeof parsed.btnUrl === 'string'
                ? parsed.btnUrl.trim()
                : '',
        };
      }
    } catch {
      // Fall through to plain text
    }
  }

  // 3. Fallback for plain text
  return {
    title: DEFAULT_SUCCESS_TITLE,
    message: trimmed || DEFAULT_SUCCESS_MESSAGE,
    nextStepTitle: DEFAULT_NEXT_STEP_TITLE,
    nextStepDescription: DEFAULT_NEXT_STEP_DESC,
    showNextStep: true,
    actionButtonLabel: '',
    actionButtonUrl: '',
  };
}

export function encodeSuccessPayload(details: {
  title?: string;
  message?: string;
  nextStepTitle?: string;
  nextStepDescription?: string;
  showNextStep?: boolean;
  actionButtonLabel?: string;
  actionButtonUrl?: string;
}) {
  const title = details.title?.trim() || DEFAULT_SUCCESS_TITLE;
  const message = details.message?.trim() || DEFAULT_SUCCESS_MESSAGE;
  const stepTitle = details.nextStepTitle?.trim() || DEFAULT_NEXT_STEP_TITLE;
  const stepDesc = details.nextStepDescription?.trim() || DEFAULT_NEXT_STEP_DESC;
  const showStep = details.showNextStep !== false;
  const btnLabel = details.actionButtonLabel?.trim() || '';
  const btnUrl = details.actionButtonUrl?.trim() || '';

  const isCustomized =
    title !== DEFAULT_SUCCESS_TITLE ||
    stepTitle !== DEFAULT_NEXT_STEP_TITLE ||
    stepDesc !== DEFAULT_NEXT_STEP_DESC ||
    !showStep ||
    Boolean(btnLabel && btnUrl);

  const fullPayload = {
    title,
    message,
    stepTitle,
    stepDesc,
    showStep,
    btnLabel,
    btnUrl,
  };

  const compactObj: Record<string, unknown> = {
    m: message,
  };
  if (title !== DEFAULT_SUCCESS_TITLE) compactObj.t = title;
  if (stepTitle !== DEFAULT_NEXT_STEP_TITLE) compactObj.nt = stepTitle;
  if (stepDesc !== DEFAULT_NEXT_STEP_DESC) compactObj.nd = stepDesc;
  if (!showStep) compactObj.s = false;
  if (btnLabel && btnUrl) {
    compactObj.b = btnLabel;
    compactObj.u = btnUrl;
  }

  const compactJson = JSON.stringify(compactObj);

  // Postgres lead_capture_forms check constraint requires char_length(success_message) between 5 and 240
  const successMessage =
    isCustomized && compactJson.length <= 240
      ? compactJson
      : message.slice(0, 240);

  return {
    successMessage,
    fullPayload,
  };
}
