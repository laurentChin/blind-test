import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { Home } from "./pages/Home/Home";
import { CreateSession } from "./pages/CreateSession/CreateSession";
import { Master } from "./pages/Master/Master";
import { EverybodyPlaysHost } from "./pages/EverybodyPlays/EverybodyPlaysHost";

import "./App.css";
import { Session } from "./pages/Session/Session";
import { Board } from "./pages/Board/Board";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <a className="App-brand" href="/">
          Blind test
        </a>
      </header>
      <main>
        <Router>
          <Routes>
            <Route path="/" exact element={<Home />} />
            <Route path="/create-session" exact element={<CreateSession />} />
            <Route path="/create-session/classic" exact element={<Master />} />
            <Route
              path="/create-session/everybody-plays"
              exact
              element={<EverybodyPlaysHost />}
            />
            <Route path="/session/:uuid" exact element={<Session />} />
            <Route path="/board/:uuid" exact element={<Board />} />
          </Routes>
        </Router>
      </main>
    </div>
  );
}

export default App;
