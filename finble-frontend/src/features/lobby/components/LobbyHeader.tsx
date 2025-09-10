import React from 'react';
import './LobbyHeader.css';
import pinbleLogo from '../../../assets/pinble-logo.png';

export function LobbyHeader() {
  return (
    <header className="lobby-header">
      <div className="header-content">
        <img src={pinbleLogo} alt="PINBLE Logo" className="logo" />
      </div>
    </header>
  );
}