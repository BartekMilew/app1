import { create, get } from "@github/webauthn-json";

export function webAuthCreate(attestationOptionsResponse, inputValue) {
  return create({
    publicKey: {
      attestation: attestationOptionsResponse.attestation,
      authenticatorSelection: attestationOptionsResponse.authenticatorSelection,
      challenge: attestationOptionsResponse.challenge,
      ...(attestationOptionsResponse.excludeCredentials && {
        excludeCredentials: attestationOptionsResponse.excludeCredentials,
      }),
      extensions: attestationOptionsResponse.extensions,
      pubKeyCredParams: attestationOptionsResponse.pubKeyCredParams,
      rp: attestationOptionsResponse.rp,
      timeout: attestationOptionsResponse.timeout,
      user: {
        id: attestationOptionsResponse.user.id,
        name: inputValue,
        displayName: inputValue,
      },
    },
  });
}

export function webAuthGet(objectAssertion) {
  return get(objectAssertion);
}
