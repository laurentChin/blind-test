import React, { useEffect, useRef, useState } from "react";

import io from "socket.io-client";
import { useParams } from "react-router-dom";
import QRCodeGenerator from "qrcode";
import { getGif } from "../../helpers/Giphy";
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
  const bigQrCode = useRef();
  const qrDialog = useRef();
  const resultDialog = useRef();
  const joinUrl = `${process.env.REACT_APP_URL}/session/${uuid}`;

  useEffect(() => {
    socket.emit(
      "joinAfterRefresh",
      {
        sessionUuid: uuid,
      },
      (response) => {
        setChallengers(response.challengers);
      }
    );

    if (qrCode.current) {
      QRCodeGenerator.toCanvas(qrCode.current, joinUrl);
    }

    if (bigQrCode.current) {
      QRCodeGenerator.toCanvas(bigQrCode.current, joinUrl);
    }
  }, [uuid, joinUrl]);

  useEffect(() => {
    if (score !== undefined) {
      getGif(score > 0).then((gifData) => {
        setGif(gifData);
      });
    }
  }, [score, track]);

  // One dialog covers both moments of a challenge: it opens to announce
  // who buzzed in (name + color), then — once the master validates the
  // answer — its content swaps to the result gif instead of closing and
  // reopening a separate dialog.
  useEffect(() => {
    // Stays open across the whole challenge, from the buzz-in through to
    // the gif being ready, rather than closing and reopening in whatever
    // gap there might be between the challenger being released and the gif
    // finishing its (async) load.
    if (challengerUuid || score !== undefined) {
      resultDialog.current?.showModal();
    } else {
      resultDialog.current?.close();
    }
  }, [challengerUuid, score]);

  const currentChallenger = challengers.find(
    (challenger) => challenger.uuid === challengerUuid
  );

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
      <h1 className="visually-hidden">Board</h1>
      <div className="Board-layout">
        <ChallengerList
          challengers={challengers}
          challengerUuid={challengerUuid}
          showActiveChallenger={false}
        />
        <div className="join-info">
          <button
            type="button"
            className="qrcode-button"
            aria-label="Enlarge the QR code and see the full join URL"
            onClick={() => qrDialog.current.showModal()}
          >
            <canvas className="qrcode" ref={qrCode} />
          </button>
        </div>
      </div>
      <dialog
        ref={qrDialog}
        className="qrcode-dialog"
        onClick={(event) => {
          if (event.target === qrDialog.current) {
            qrDialog.current.close();
          }
        }}
      >
        <div className="panel">
          <canvas className="qrcode-big" ref={bigQrCode} />
          <span className="join-url-full">{joinUrl}</span>
        </div>
      </dialog>
      <dialog
        ref={resultDialog}
        className="result-dialog"
        onClick={(event) => {
          if (event.target === resultDialog.current) {
            resultDialog.current.close();
          }
        }}
      >
        {gif !== undefined && score !== undefined ? (
          <div className="result-content">
            <img
              className="gif-big"
              src={gif.images.original.url}
              alt=""
              width={600 * gif.ratio}
              height={600}
            />
            {track !== undefined && (
              <article className="track">
                <span className="current-song">{track.name}</span>
                <span className="current-song">{track.artists}</span>
              </article>
            )}
          </div>
        ) : (
          currentChallenger && (
            <p
              className="active-challenger-big"
              style={{
                "--player-color": `rgba(${currentChallenger.color})`,
              }}
            >
              {currentChallenger.name}
            </p>
          )
        )}
      </dialog>
    </div>
  );
};

export { Board };
