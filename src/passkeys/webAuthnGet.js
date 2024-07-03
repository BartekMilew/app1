import { create, get } from "@github/webauthn-json";

export function webAuthCreate(attestationOptionsResponse, inputValue, string) {
  console.log(string);
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
        id: string,
        name: inputValue,
        displayName: inputValue,
      },
    },
  });
}

export function webAuthGet(objectAssertion) {
  return get(objectAssertion);
}
