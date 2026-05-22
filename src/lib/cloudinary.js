// Utility to upload a file to Cloudinary and return the secure URL
export async function uploadToCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Upload failed');
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  console.log('[Cloudinary] cloud:', cloudName, 'preset:', uploadPreset);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error();
    const data = await response.json();
    return data.secure_url;
  } catch {
    throw new Error('Upload failed');
  }
}
