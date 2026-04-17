import { supabase } from './supabase';

export const SUPABASE_MEDIA_BUCKET = import.meta.env.VITE_SUPABASE_MEDIA_BUCKET || 'app-media';
const CAMPAIGN_IMAGE_VERSION_PREFIX = 'campaignImageVersion:';
const PROFILE_IMAGE_VERSION_PREFIX = 'profileImageVersion:';

function normalizePathPart(value: string) {
  return value.trim().toLowerCase();
}

function appendVersionToUrl(url: string, version?: string | number | null) {
  if (!version) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(String(version))}`;
}

function getStoredCampaignImageVersion(campaignAddress: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(`${CAMPAIGN_IMAGE_VERSION_PREFIX}${normalizePathPart(campaignAddress)}`);
}

function getStoredProfileImageVersion(walletAddress: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(`${PROFILE_IMAGE_VERSION_PREFIX}${normalizePathPart(walletAddress)}`);
}

export function rememberCampaignImageVersion(campaignAddress: string, version: string | number) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(`${CAMPAIGN_IMAGE_VERSION_PREFIX}${normalizePathPart(campaignAddress)}`, String(version));
}

export function rememberProfileImageVersion(walletAddress: string, version: string | number) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(`${PROFILE_IMAGE_VERSION_PREFIX}${normalizePathPart(walletAddress)}`, String(version));
}

export function clearProfileImageVersion(walletAddress: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(`${PROFILE_IMAGE_VERSION_PREFIX}${normalizePathPart(walletAddress)}`);
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

export function getCampaignImageUrl(campaignAddress: string, version?: string | number | null) {
  const publicUrl = getPublicMediaUrl(getCampaignImagePath(campaignAddress));
  return appendVersionToUrl(publicUrl, version ?? getStoredCampaignImageVersion(campaignAddress));
}

export function getProfileImageUrl(walletAddress: string, version?: string | number | null) {
  const publicUrl = getPublicMediaUrl(getProfileImagePath(walletAddress));
  return appendVersionToUrl(publicUrl, version ?? getStoredProfileImageVersion(walletAddress));
}

export async function uploadMediaFile(file: File, path: string) {
  const { error } = await supabase.storage.from(SUPABASE_MEDIA_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
    cacheControl: '0',
  });

  if (error) {
    throw error;
  }

  return getPublicMediaUrl(path);
}

export async function removeMediaFile(path: string) {
  const { error } = await supabase.storage.from(SUPABASE_MEDIA_BUCKET).remove([path]);

  if (error) {
    throw error;
  }
}
