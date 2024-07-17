import logo from "./logo.svg";
import "./App.css";
import Passkeys from "./passkeys/Passkeys";
import Device from "./passkeys/Device";

function App() {
  return (
    <div className="App">
      <p>App1</p>
      <Passkeys />
      <Device />
    </div>
  );
}

export default App;
