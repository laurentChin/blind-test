import React, { useEffect, useRef, useState } from "react";

import io from "socket.io-client";
import { useParams } from "react-router-dom";
import QRCodeGenerator from "qrcode";
import { getGif } from "../../helpers/Giphy";
import { Gif } from "@giphy/react-components";
import { ChallengerList } from "../../components/ChallengerList/ChallengerList";

import "./Board.css";

let socket = io(process.env.REACT_APP_SOCKET_URI);

let challengersUpdateHandler = () => {};
let challengerReleaseHandler = () => {};
let lockChallengeHandler = () => {};
let challengeResultHandler = () => {};
let startNewChallengeHandler = () => {};

socket.on("challengersUpdate", (msg) => challengersUpdateHandler(msg));

socket.on("challengerRelease", (msg) => challengerReleaseHandler(msg));

socket.on("lockChallenge", (msg) => lockChallengeHandler(msg));

socket.on("challengeResult", (msg) => challengeResultHandler(msg));

socket.on("startNewChallenge", (msg) => startNewChallengeHandler(msg));

const Board = () => {
  const { uuid } = useParams();
  const [challengers, setChallengers] = useState([]);
  const [challengerUuid, setChallengerUuid] = useState("");
  const [track, setTrack] = useState();
  const [score, setScore] = useState();
  const [gif, setGif] = useState();

  const qrCode = useRef();

  useEffect(() => {
    socket.emit("join", {
      sessionUuid: uuid,
    });

    if (qrCode.current) {
      QRCodeGenerator.toCanvas(
        qrCode.current,
        `${process.env.REACT_APP_URL}/session/${uuid}`
      );
    }
  }, [uuid]);

  useEffect(() => {
    if (score !== undefined) {
      getGif(score > 0).then((gifData) => {
        setGif(gifData);
      });
    }
  }, [score, track]);

  challengersUpdateHandler = setChallengers;

  lockChallengeHandler = setChallengerUuid;

  challengerReleaseHandler = (msg) => {
    setChallengerUuid("");
    setChallengers(msg);
  };

  challengeResultHandler = (msg) => {
    if (msg.score > 0) {
      setTrack(msg.track);
    } else {
      setTrack(undefined);
    }

    setScore(msg.score);
  };

  startNewChallengeHandler = () => {
    setTrack(undefined);
    setGif(undefined);
    setScore(undefined);
  };

  return (
    <div className="Board">
      {gif !== undefined && score !== undefined && (
        <Gif className="gif" gif={gif} width={300 * gif.ratio} height={300} />
      )}
      {track !== undefined && (
        <p className="track">
          <span className="current-song">{track.name}</span>
          <span className="current-song">{track.artists}</span>
        </p>
      )}
      <ChallengerList
        challengers={challengers}
        challengerUuid={challengerUuid}
      />
      <canvas className="qrcode" ref={qrCode} />
    </div>
  );
};

export { Board };
