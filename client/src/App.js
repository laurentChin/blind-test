import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { Home } from "./pages/Home/Home";
import { Master } from "./pages/Master/Master";

import "./App.css";
import { Session } from "./pages/Session/Session";
import { Board } from "./pages/Board/Board";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Blind test App</h1>
      </header>
      <div className="main">
        <Router>
          <Routes>
            <Route path="/" exact element={<Home />} />
            <Route path="/create-session" exact element={<Master />} />
            <Route path="/session/:uuid" exact element={<Session />} />
            <Route path="/board/:uuid" exact element={<Board />} />
          </Routes>
        </Router>
      </div>
    </div>
  );
}

export default App;
