import React from "react";
import { webAuthCreate, webAuthGet } from "./webAuthnGet";
import attestationResponse from "./attestationResponse.json";
import { useState } from "react";
import assertionResponse from "./assertionResnponse.json";
import { useEffect } from "react";

function random(length) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOUPRSTUWXZ";
  const characterLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characterLength));
  }
  return result;
}

const Passkeys = () => {
  const [pubKey, setPubKey] = useState("");
  const [pubKey2, setPubKey2] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [credentialsId, setCredentialsId] = useState([]);
  const [mediationValue, setMediationValue] = useState(undefined);
  const [textCredential, setTextCredential] = useState("");
  const [objectAssertion, setObjectAssertion] = useState({});

  useEffect(() => {
    setObjectAssertion({
      publicKey: {
        allowCredentials: credentialsId.map((value) => {
          return {
            id: value,
            transports: ["internal"],
            type: "public-key",
          };
        }),
        challenge: assertionResponse.challenge,
        extensions: assertionResponse.extensions,
        rpId: assertionResponse.rpId,
        timeout: assertionResponse.timeout,
        userVerification: assertionResponse.userVerification,
      },
      ...(mediationValue && { mediation: mediationValue }),
    });
  }, [mediationValue, credentialsId]);

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
      inputValue,
      random(10)
    );
    setPubKey(JSON.stringify(publicKeyCredential));
  }
  async function handleClickOnGet() {
    const publicKeyCredential2 = await webAuthGet(objectAssertion);
    setPubKey2(JSON.stringify(publicKeyCredential2));
  }
  const add = () => {
    setCredentialsId([...credentialsId, textCredential]);
  };
  const handleSelectChange = (event) => {
    setMediationValue(event.target.value);
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
        <select value={mediationValue} onChange={handleSelectChange}>
          <option value="">Select transport</option>
          <option value="conditional">conditional</option>
          <option value="optional">optional</option>
          <option value="required">required</option>
          <option value="silent">silent</option>
        </select>
      </div>
      <div>
        add credentialId to payload{" "}
        <input
          value={textCredential}
          onChange={handleTextCredential}
          type="text"
        />
        <button onClick={add}>Add</button>
      </div>

      <div>{JSON.stringify(objectAssertion)}</div>
      <button onClick={handleClickOnGet}>Get Passkey</button>
      <div>{pubKey2}</div>
    </div>
  );
};

export default Passkeys;
