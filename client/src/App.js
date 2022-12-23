import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

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
          <Switch>
            <Route path="/" exact component={Home} />
            <Route path="/create-session" exact component={Master} />
            <Route path="/session/:uuid" exact component={Session} />
            <Route path="/board/:uuid" exact component={Board} />
          </Switch>
        </Router>
      </div>
    </div>
  );
}

export default App;
