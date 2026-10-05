import { supabase } from "../lib/supabase";
import { issuerFromProfile } from "../utils/proposalPresentation";
export async function fetchProposalIssuer() {
  try {
    const { data, error } = await supabase.auth.getUser();
    return !error && data.user ? issuerFromProfile(data.user) : undefined;
  } catch {
    return undefined;
  }
}
