import React from 'react'
import QRCode from "qrcode.react"

function SurveyQR({ value }) {
  return (
    <div className="qr-container">
      <h3>Scan this QR to fill survey:</h3>
      <QRCode value={value} size={256} />
    </div>
  );
}

export default SurveyQR