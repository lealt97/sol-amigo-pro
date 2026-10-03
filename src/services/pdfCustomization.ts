import { supabase } from '../lib/supabase';

const COVER_IMAGE_MAX_FILE_SIZE = 10 * 1024 * 1024;
const COVER_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const uploadPdfCoverPhoto = async (file: File): Promise<string> => {
  if (!COVER_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Formato não suportado. Use PNG, JPG ou WEBP.');
  }
  if (file.size > COVER_IMAGE_MAX_FILE_SIZE) {
    throw new Error('A imagem da capa deve ter no máximo 10 MB.');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Sua sessão expirou. Entre novamente.');

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const objectPath = `${userData.user.id}/proposal-cover-images/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('account-assets')
    .upload(objectPath, file, {
      upsert: false,
      cacheControl: '3600',
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage
    .from('account-assets')
    .getPublicUrl(objectPath);

  return `${publicData.publicUrl}?v=${Date.now()}`;
};
