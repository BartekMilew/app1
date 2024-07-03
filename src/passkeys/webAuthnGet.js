import { create, get } from "@github/webauthn-json";

export function webAuthCreate(attestationOptionsResponse) {
  console.log(attestationOptionsResponse, "to");
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
        name: "click",
        displayName: "click",
      },
    },
  });
}

export function webAuthGet(assertionOptionsResponse) {
  return get({
    publicKey: {
      allowCredentials: assertionOptionsResponse.allowCredentials,
      challenge: assertionOptionsResponse.challenge,
      extensions: assertionOptionsResponse.extensions,
      rpId: assertionOptionsResponse.rpId,
      timeout: assertionOptionsResponse.timeout,
      userVerification: assertionOptionsResponse.userVerification,
    },
    mediation: "silent",
  });
}
