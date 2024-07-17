import React from "react";
import { UAParser } from "ua-parser-js";

const Device = () => {
  const uaParser1 = new UAParser();
  const uaParser1Results = uaParser1.getResult();
  console.log(uaParser1Results);
  const uaParser2Results = uaParser1.getDevice().withFeatureCheck();
  console.log(uaParser2Results, "2results");
  const check =
    "standalone" in window.navigator && window.navigator["standalone"];
  let isIPad =
    typeof window !== "undefined" &&
    /Macintosh/i.test(navigator.userAgent) &&
    typeof check !== "undefined" &&
    navigator.maxTouchPoints &&
    navigator.maxTouchPoints > 2;

  console.log(isIPad);
  return (
    <>
      <div>uaParser1</div>
      <div>{JSON.stringify(uaParser1Results)}</div>
      <div>uaParser2</div>
      <div>{JSON.stringify(uaParser2Results)}</div>
      <div>uaParser3-2</div>
      <div>is Ipad{isIPad ? "true" : "false"}</div>
    </>
  );
};

export default Device;
