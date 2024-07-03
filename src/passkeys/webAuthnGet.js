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
        name: { inputValue },
        displayName: { inputValue },
      },
    },
  });
}

export function webAuthGet(assertionOptionsResponse, credentialsId) {
  return get({
    publicKey: {
      allowCredentials: credentialsId.map((value) => {
        return {
          id: value,
          transports: ["internal"],
          type: "public-key",
        };
      }),
      challenge: assertionOptionsResponse.challenge,
      extensions: assertionOptionsResponse.extensions,
      rpId: assertionOptionsResponse.rpId,
      timeout: assertionOptionsResponse.timeout,
      userVerification: assertionOptionsResponse.userVerification,
    },
    mediation: "silent",
  });
}
