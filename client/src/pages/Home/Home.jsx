import React from "react";

import "./Home.css";

const Home = () => (
  <section className="Home">
    <h1>Blind test</h1>
    <div className="panel">
      <p>
        Create a new session. A valid Spotify or Apple Music account is
        required.
      </p>
      <a className="btn btn-accent" href="/create-session">
        Create a session
      </a>
    </div>
  </section>
);

export { Home };
