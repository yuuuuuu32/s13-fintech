import React from 'react';
import './UserInfo.css';
import defaultAvatarUrl from '../../../assets/default_avatar.png';

export function UserInfo() {
  const user = {
    name: 'CyberCamper',
    suffix: '_2077',
    level: 15,
    rank: 5,
    currentXp: 1250,
    xpToNextLevel: 2000,
  };

  const xpPercentage = (user.currentXp / user.xpToNextLevel) * 100;

  return (
    <aside className="user-info-panel">
      <h2 className="panel-title">USER INFO</h2>
      <div className="profile-summary">
        <div className="avatar-container">
          <img src={defaultAvatarUrl} alt="User Avatar" className="avatar-image" />
        </div>
        <div className="user-name-container">
          <span className="user-name">
            {user.name}<span className="user-name-suffix">{user.suffix}</span>
          </span>
          <span className="online-indicator" aria-label="Online"></span>
        </div>
      </div>
      <div className="stats-container">
        <div className="stat-item">
          <span className="stat-value">{user.level}</span>
          <span className="stat-label">LVL</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{user.rank}</span>
          <span className="stat-label">RANK</span>
        </div>
      </div>
      <div className="xp-bar-container">
        <div className="xp-bar">
          <div className="xp-bar-progress" style={{ width: `${xpPercentage}%` }}></div>
        </div>
      </div>
    </aside>
  );
}