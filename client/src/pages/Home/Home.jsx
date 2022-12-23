import React from "react";

import "./Home.css";

const Home = () => (
  <div className="Home">
    <div className="option-list">
      <div className="option-block">
        <p>Create a new session. A valid Spotify account is required.</p>
        <a href="/create-session">Create &gt;&gt;</a>
      </div>
    </div>
  </div>
);

export { Home };
