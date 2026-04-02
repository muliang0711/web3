import { supabase } from './supabase';

export const SUPABASE_MEDIA_BUCKET = import.meta.env.VITE_SUPABASE_MEDIA_BUCKET || 'app-media';

function normalizePathPart(value: string) {
  return value.trim().toLowerCase();
}

export function getCampaignImagePath(campaignAddress: string) {
  return `campaigns/${normalizePathPart(campaignAddress)}`;
}

export function getProfileImagePath(walletAddress: string) {
  return `profiles/${normalizePathPart(walletAddress)}`;
}

export function getPublicMediaUrl(path: string) {
  const { data } = supabase.storage.from(SUPABASE_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function getCampaignImageUrl(campaignAddress: string) {
  return getPublicMediaUrl(getCampaignImagePath(campaignAddress));
}

export function getProfileImageUrl(walletAddress: string) {
  return getPublicMediaUrl(getProfileImagePath(walletAddress));
}

export async function uploadMediaFile(file: File, path: string) {
  const { error } = await supabase.storage.from(SUPABASE_MEDIA_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
  });

  if (error) {
    throw error;
  }

  return getPublicMediaUrl(path);
}
