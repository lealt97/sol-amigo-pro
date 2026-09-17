/**
 * Utilitários de formatação para exibição padronizada no sistema.
 */

/**
 * Formata um número de telefone com DDD entre parênteses e hífen.
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
  if (!digits) return String(value);

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  if (digits.length > 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length > 2) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits}`;
};
