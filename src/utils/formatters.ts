/**
 * Utilitários de formatação para exibição padronizada no sistema.
 */

/**
 * Remove qualquer caractere não numérico.
 */
export const getOnlyDigits = (value?: string | null): string => {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
};

/**
 * Formata um número de telefone/WhatsApp com DDD entre parênteses e hífen,
 * respeitando a regra nacional de 10 dígitos (fixo) ou 11 dígitos (celular com nono dígito).
 * Funciona tanto para exibição quanto como máscara dinâmica durante digitação.
 *
 * Exemplos:
 *  - "21975113658" -> "(21) 97511-3658"
 *  - "2134567890"  -> "(21) 3456-7890"
 */
export const formatPhone = (value?: string | null): string => {
  if (!value) return '';
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);
  if (!digits) return '';

  if (digits.length <= 2) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

/**
 * Retorna o link direto do WhatsApp (wa.me) no formato internacional correto (55 + DDD + número).
 */
export const formatWhatsAppLink = (value?: string | null, message?: string): string | null => {
  if (!value) return null;
  let digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  if (!digits.startsWith('55')) {
    digits = `55${digits}`;
  }
  // Número completo no Brasil deve ter 55 + 10 ou 11 dígitos = 12 ou 13 dígitos
  if (digits.length < 12) return null;
  const baseUrl = `https://wa.me/${digits}`;
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  return baseUrl;
};

