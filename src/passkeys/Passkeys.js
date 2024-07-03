import React from "react";
import { webAuthCreate } from "./webAuthnGet";
import attestationResponse from "./attestationResponse.json";
const Passkeys = () => {
  async function handleClickOnCreate() {
    console.log(attestationResponse);
    const publicKeyCredential = await webAuthCreate(attestationResponse);
    return;
  }

  return <button onClick={handleClickOnCreate}>Create Passkey</button>;
};

export default Passkeys;
