import { readFile } from 'node:fs/promises';

const checks = [];

const requiredChecks = [
  ['src/components/PublicLeadFormView.tsx', ['type="file"', 'MAX_ENERGY_BILL_BYTES', 'energyBillFile']],
  ['public/widget.js', ['new FormData()', 'multipartBody.append("energyBill"']],
  ['supabase/functions/capture-lead/index.ts', ['validateEnergyBill', 'bytes[0] === 0x25', 'ENERGY_BILL_BUCKET']],
  ['supabase/migrations/20260913123056_add_private_energy_bill_upload.sql', ["'lead-energy-bills'", 'public,', 'false,', 'lead_energy_bills_select_own']],
];

for (const [file, forbidden] of checks) {
  const source = await readFile(file, 'utf8');
  for (const fragment of forbidden) {
    if (source.includes(fragment)) throw new Error(`${file} contém padrão proibido: ${fragment}`);
  }
}

for (const [file, required] of requiredChecks) {
  const source = await readFile(file, 'utf8');
  for (const fragment of required) {
    if (!source.includes(fragment)) throw new Error(`${file} não contém proteção obrigatória: ${fragment}`);
  }
}

console.log('CRM integrity checks passed.');
