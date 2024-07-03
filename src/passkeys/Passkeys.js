import React from "react";
import { webAuthCreate, webAuthGet } from "./webAuthnGet";
import attestationResponse from "./attestationResponse.json";
import { useState } from "react";
import assertionResponse from "./assertionResnponse.json";
const Passkeys = () => {
  const [pubKey, setPubKey] = useState("");
  const [pubKey2, setPubKey2] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [credentialsId, setCredentialsId] = useState([]);
  const [textCredential, setTextCredential] = useState("");
  const handleChange = (event) => {
    setInputValue(event.target.value);
  };
  const handleTextCredential = (event) => {
    setTextCredential(event.target.value);
  };
  async function handleClickOnCreate() {
    console.log(attestationResponse);
    const publicKeyCredential = await webAuthCreate(
      attestationResponse,
      inputValue
    );
    setPubKey(JSON.stringify(publicKeyCredential));
  }
  async function handleClickOnGet() {
    console.log(attestationResponse);
    const publicKeyCredential2 = await webAuthGet(
      assertionResponse,
      credentialsId
    );
    setPubKey2(JSON.stringify(publicKeyCredential2));
  }
  const add = () => {
    setCredentialsId([...credentialsId, textCredential]);
  };
  return (
    <div>
      <div>
        name for passkey{" "}
        <span>
          <input value={inputValue} onChange={handleChange} type="text" />
        </span>
      </div>
      <button onClick={handleClickOnCreate}>Create Passkey</button>
      <div>{pubKey}</div>
      <div>
        add credentialId to payload{" "}
        <input
          value={textCredential}
          onChange={handleTextCredential}
          type="text"
        />
        <button onClick={add}>Add</button>
      </div>
      <div>
        {credentialsId.map((value) => (
          <div>{value}</div>
        ))}
      </div>
      <button onClick={handleClickOnGet}>Get Passkey</button>
      <div>{pubKey2}</div>
    </div>
  );
};

export default Passkeys;
