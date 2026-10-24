/**
 * Device/app attestation seam.
 *
 * The backend calls a paid AI API, so it must be able to tell genuine PureBite installs
 * from scripts replaying requests. The planned provider is Firebase App Check with
 * Play Integrity on Android (App Attest on iOS): install `@react-native-firebase/app`
 * and `@react-native-firebase/app-check`, add google-services.json, and register a
 * provider at startup, e.g.
 *
 *   setAttestationProvider({
 *     async getHeaders() {
 *       const { token } = await appCheck().getToken();
 *       return { 'X-Firebase-AppCheck': token };
 *     },
 *   });
 *
 * The backend then verifies the JWT (jose + Google's JWKS) before calling Gemini.
 * Until a provider is registered no attestation header is sent, and the backend must
 * rely on rate limits alone.
 */
export type AttestationProvider = {
  getHeaders(): Promise<Record<string, string>>;
};

let provider: AttestationProvider | null = null;

export function setAttestationProvider(next: AttestationProvider | null): void {
  provider = next;
}

/** Never throws: an attestation failure is reported by the server, not by the client. */
export async function getAttestationHeaders(): Promise<Record<string, string>> {
  if (!provider) return {};
  try {
    return await provider.getHeaders();
  } catch {
    return {};
  }
}
