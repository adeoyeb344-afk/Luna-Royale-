/**
 * Media & Cloudinary Architecture Service
 * Never invents Cloudinary credentials or places API secrets in frontend code.
 * Never generates fake stock image URLs or placeholder images.
 * Supports:
 * 1. Unsigned Upload Preset browser uploads (`cloud_name` + `upload_preset`)
 * 2. Server-side signed uploads (`/api/media/signature` and `/api/media/upload`)
 */

const LOCAL_CLOUDINARY_CONFIG_KEY = 'lr_cloudinary_public_config_v1';

export interface MediaProviderStatus {
  provider: 'cloudinary';
  configured: boolean;
  mode: 'signed' | 'unsigned' | 'unconfigured';
  cloudName: string | null;
  uploadPreset: string | null;
}

function getLocalPublicCloudinaryConfig(): {
  cloudName: string;
  uploadPreset: string;
} {
  const envCloudName =
    (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME?.trim?.() || '';
  const envUploadPreset =
    (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET?.trim?.() || '';

  if (typeof window === 'undefined') {
    return { cloudName: envCloudName, uploadPreset: envUploadPreset };
  }

  try {
    const raw = localStorage.getItem(LOCAL_CLOUDINARY_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        cloudName?: string;
        uploadPreset?: string;
      };
      return {
        cloudName: parsed.cloudName?.trim() || envCloudName,
        uploadPreset: parsed.uploadPreset?.trim() || envUploadPreset,
      };
    }
  } catch {
    // Ignore localStorage read errors
  }

  return { cloudName: envCloudName, uploadPreset: envUploadPreset };
}

export async function saveCloudinaryPublicConfig(
  cloudName: string,
  uploadPreset: string
): Promise<MediaProviderStatus> {
  const cleanCloudName = cloudName.trim();
  const cleanPreset = uploadPreset.trim();

  if (!cleanCloudName || !cleanPreset) {
    throw new Error(
      'Both Cloudinary Cloud Name and Unsigned Upload Preset are required.'
    );
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        LOCAL_CLOUDINARY_CONFIG_KEY,
        JSON.stringify({
          cloudName: cleanCloudName,
          uploadPreset: cleanPreset,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }

  try {
    const res = await fetch('/api/media/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cloudName: cleanCloudName,
        uploadPreset: cleanPreset,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        provider: 'cloudinary',
        configured: Boolean(data.configured),
        mode: data.mode || 'unsigned',
        cloudName: data.cloudName || cleanCloudName,
        uploadPreset: data.uploadPreset || cleanPreset,
      };
    }
  } catch {
    // Fallback to client-side unsigned preset status if server route is unreachable
  }

  return {
    provider: 'cloudinary',
    configured: true,
    mode: 'unsigned',
    cloudName: cleanCloudName,
    uploadPreset: cleanPreset,
  };
}

export async function getCloudinaryStatus(): Promise<MediaProviderStatus> {
  const localCfg = getLocalPublicCloudinaryConfig();

  try {
    const res = await fetch('/api/media/status');
    if (res.ok) {
      const data = await res.json();
      const cloudName = data.cloudName || localCfg.cloudName || null;
      const uploadPreset = data.uploadPreset || localCfg.uploadPreset || null;
      const configured =
        Boolean(data.configured) || Boolean(cloudName && uploadPreset);
      const mode: 'signed' | 'unsigned' | 'unconfigured' =
        data.mode === 'signed'
          ? 'signed'
          : configured
            ? 'unsigned'
            : 'unconfigured';

      // Sync local config to server if server didn't have it yet
      if (!data.configured && localCfg.cloudName && localCfg.uploadPreset) {
        fetch('/api/media/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localCfg),
        }).catch(() => {});
      }

      return {
        provider: 'cloudinary',
        configured,
        mode,
        cloudName,
        uploadPreset,
      };
    }
  } catch {
    // Fall through to local/env config
  }

  const hasLocal = Boolean(localCfg.cloudName && localCfg.uploadPreset);
  return {
    provider: 'cloudinary',
    configured: hasLocal,
    mode: hasLocal ? 'unsigned' : 'unconfigured',
    cloudName: localCfg.cloudName || null,
    uploadPreset: localCfg.uploadPreset || null,
  };
}

export async function uploadImageToCloudinary(file: File): Promise<string> {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file from your device.');
  }

  const status = await getCloudinaryStatus();

  // 1. Browser Upload via Unsigned Upload Preset (Preferred when preset is configured)
  if (status.cloudName && status.uploadPreset && status.mode === 'unsigned') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', status.uploadPreset);
    formData.append('folder', 'luna-royale/products');

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        status.cloudName
      )}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const uploadData = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok || !uploadData.secure_url) {
      throw new Error(
        uploadData?.error?.message ||
          'Cloudinary rejected the unsigned upload. Verify your Cloud Name and Unsigned Upload Preset.'
      );
    }

    return String(uploadData.secure_url);
  }

  // 2. Server-Signed Upload Flow (when CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET are on server)
  const sigRes = await fetch('/api/media/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: 'luna-royale/products' }),
  });

  if (!sigRes.ok) {
    const errData = await sigRes.json().catch(() => ({}));
    throw new Error(
      errData?.error ||
        'Cloudinary is not configured yet. Provide your Cloudinary Cloud Name and Unsigned Upload Preset (or configure server environment variables).'
    );
  }

  const { cloudName, apiKey, timestamp, folder, signature } =
    await sigRes.json();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('folder', folder);
  formData.append('signature', signature);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      cloudName
    )}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || !uploadData.secure_url) {
    throw new Error(
      uploadData?.error?.message || 'Failed to upload image to Cloudinary.'
    );
  }

  return String(uploadData.secure_url);
}

export function isValidMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
