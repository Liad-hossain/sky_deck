export function dictToB64(obj) {
  if (obj === null || obj === undefined)
    throw new Error('Cannot encode null/undefined');
  const json = JSON.stringify(obj);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf8').toString('base64');
  }
  if (typeof btoa !== 'undefined') {
    return btoa(json);
  }
  throw new Error('No base64 encoder available');
}

export function b64ToDict(b64) {
  if (!b64 || typeof b64 !== 'string') return {};
  let json = null;
  if (typeof Buffer !== 'undefined') {
    json = Buffer.from(b64, 'base64').toString('utf8');
  } else if (typeof atob !== 'undefined') {
    json = atob(b64);
  } else {
    throw new Error('No base64 decoder available');
  }
  try {
    return JSON.parse(json);
  } catch (e) {
    throw new Error('Decoded string is not valid JSON');
  }
}

const data = {
  FIREBASE_DATABASE_URL:
    'https://skydeck-43150-default-rtdb.asia-southeast1.firebasedatabase.app',
  FIREBASE_PROJECT_ID: 'skydeck-43150',
  FIREBASE_CLIENT_EMAIL:
    'firebase-adminsdk-fbsvc@skydeck-43150.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY:
    '-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCzcQAAJkumxEFw\nES8uAA/+za7Ag9pOEr8zE+tqtEpDvv4dFHxKMtvCLXxxHKQHMZCCr2PKKbn0VR2U\nzKCi5Hhbmt/reT57JovZRGxNFxL4wWCn1NXkQJBoEy75vwXtd6m7uiZOuXSCxfEN\nYmBo9PBMKgZ6a18LDQ4ejza/WtOpl/4aTgf/Hkh3AZEKJuxM73t1GefQgzHOnTAX\nlnrNWEgiVuqm4XfXv9XFSm08XtqebvM/8w+ifUrv94ETfy2oI2ImhFfEbKoYg6rj\nVHr6RecbWCg+WPMAsmHbG6T8zuathTpkbcypsWHg8lcweqPebty5Chu8qtUxKTzW\nqD5nh+1fAgMBAAECggEAOIrz8BghIISZBiI0Fq+oWqcfWMRzhsR7gTHWrcHv4NcP\nJcStwYezHcXNf6sBuM6SdcukizCIywgDET9Fou6RSnRL+Nw0pwOnb6gS5FvP+5ib\nx2bWm10I4/Kfi8z4pjJdxqzKo2Xm48pRweDs9kWwbp+TeQHaahYMC+8e1j9dkQOv\nLAa/SRwKGiSVB4UdKFk6g600DWrcBPXpBUrTE6RrPQUtx+r97FoG52UrOCtQCiAH\npNs4v5HLX5HjSTuK5AmI53xzSmlddaH4Oe78UJZWn5w2eIHJnfFXVaT1hBwOLGH4\njbx/KPUZBpS4TN4+4uXTrahc/7XUdtj+1rmBeIZ0gQKBgQDs0NnbZaFz3vx2UB/E\nS58AzAYgs3z3z9qjqwn8PECfu4PEu/t2ktA6ZPx15s771Giy2AZdT/Sr5tIBHZX9\nYyns811Ef3v4Qkujsw6iFqPw2jFzG/cd4/Zv6x7z872Zhv/M2rW6JpDTp0WKiDt+\nGbLsvc/BEY5bWNSyj70QvzFanwKBgQDB+k2eBFELHIFT2TQPdE/WEskhJDP21Utn\n83Y2nJpEzYMeap9Sdkl6dVDSdn4tieWAvsOCBzsLcEUJzuBfhIanlDNNDRLPuYpa\n3bjSVjSSmYcgYT3YColgVz8JHJXBIGubVZD8ybWpKrcwbebpjpPQsvGHbmU0Ovaj\n/aavb6M1QQKBgQDkjjEkqTKolRaNzYjLN7zO1Ro452H9/fJjMckiUriAMUbcUh1A\n9DLZmOt7kvZDYF5n9Uw3NNrMKaqW/wnqkpE9Kifi2zM3iCxeYosF7tnss3k0QlI+\n2+vVWlP2WFCt4vfwq0jmzx/J1k+sgw0ACCeCizL+gEYnbVVivI1Zo10ruwKBgQCM\n+GcoC2MKfDDQyu02vgS3QvfAihrpq6EdbqXeknjav7Amjr4yo5xKzq9qBIs2dRzB\nL+HNwYt7iJ/jvOD7CckCSIXv3SxqoiCWYMRMuDGEyOaW9ZSISUAFL+KzsH502Cbb\nwJeZ3s2Sn2R6YaSK3/80kJdPIT+TcbaE/3X/0VX/AQKBgQDcgXDk0mxYjafMcYen\nsSSMlIrBFcYpWojWVEVPS+I3EE5+IslH7gCnhWQQDyucIxyRwSdXHnymPZ7BMCQz\nGBvWLbX1pqzhCD8Pp0qV12XFEVNJLQLOhpWanDVi3nD/AuXfidj03jh0YKJl4NEt\nnOlUL2/qP9nDksAujz6Gfm71/A==\n-----END PRIVATE KEY-----\n',
};

console.log(dictToB64(data));
