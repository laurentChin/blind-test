import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import QRCodeGenerator from "qrcode";

import "./JoinCode.css";

const JoinCode = ({ joinUrl, variant = "thumbnail" }) => {
  const qrCode = useRef();
  const bigQrCode = useRef();
  const dialog = useRef();

  useEffect(() => {
    if (qrCode.current) {
      QRCodeGenerator.toCanvas(qrCode.current, joinUrl);
    }

    if (bigQrCode.current) {
      QRCodeGenerator.toCanvas(bigQrCode.current, joinUrl);
    }
  }, [joinUrl]);

  return (
    <div className="JoinCode">
      {variant === "button" ? (
        <button
          type="button"
          className="btn btn-accent qrcode-trigger-button"
          onClick={() => dialog.current.showModal()}
        >
          Show join code
        </button>
      ) : (
        <button
          type="button"
          className="qrcode-button"
          aria-label="Enlarge the QR code and see the full join URL"
          onClick={() => dialog.current.showModal()}
        >
          <canvas className="qrcode" ref={qrCode} />
        </button>
      )}
      <dialog
        ref={dialog}
        className="qrcode-dialog"
        onClick={(event) => {
          if (event.target === dialog.current) {
            dialog.current.close();
          }
        }}
      >
        <div className="panel">
          <canvas className="qrcode-big" ref={bigQrCode} />
          <span className="join-url-full">{joinUrl}</span>
        </div>
      </dialog>
    </div>
  );
};

JoinCode.propTypes = {
  joinUrl: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(["thumbnail", "button"]),
};

export { JoinCode };
