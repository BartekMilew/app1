import React from "react";
import { webAuthCreate, webAuthGet } from "./webAuthnGet";
import attestationResponse from "./attestationResponse.json";
import { useState } from "react";
import assertionResponse from "./assertionResnponse.json";
const Passkeys = () => {
  const [pubKey, setPubKey] = useState("");
  const [pubKey2, setPubKey2] = useState("");

  async function handleClickOnCreate() {
    console.log(attestationResponse);
    const publicKeyCredential = await webAuthCreate(attestationResponse);
    setPubKey(JSON.stringify(publicKeyCredential));
  }
  async function handleClickOnGet() {
    console.log(attestationResponse);
    const publicKeyCredential2 = await webAuthGet(assertionResponse);
    setPubKey2(JSON.stringify(publicKeyCredential2));
  }
  return (
    <div>
      <button onClick={handleClickOnCreate}>Create Passkey</button>;
      <div>{pubKey}</div>
      <button onClick={handleClickOnGet}>Get Passkey</button>;
      <div>{pubKey2}</div>
    </div>
  );
};

export default Passkeys;
