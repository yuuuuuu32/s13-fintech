import React from 'react';
import './UserInfo.css';
// import defaultAvatarUrl from '../../../assets/default_avatar.png'; // Remove this import
import { useUserStore } from '../../../stores/useUserStore'; // Import the user store

// New default image URL from public folder
const DEFAULT_PLAYER_IMAGE = '/player.jpeg'; // Corrected path

export function UserInfo() {
  // Get user info from the global store
  const userInfo = useUserStore((state) => state.userInfo);

  // Provide a loading or default state while user info is being fetched
  if (!userInfo) {
    return (
      <aside className="user-info-panel">
        <h2 className="panel-title">USER INFO</h2>
        <div className="loading-user-info">Loading...</div>
      </aside>
    );
  }

  // Mock data for stats, as they are not in the UserInfo yet
  const stats = {
    level: 1, // Placeholder
    rank: 0,  // Placeholder
    currentXp: 0,
    xpToNextLevel: 1000,
  };

  const xpPercentage = (stats.currentXp / stats.xpToNextLevel) * 100;

  // Determine which image to use
  const avatarSrc = userInfo.icon || DEFAULT_PLAYER_IMAGE; // Use userInfo.icon if available, else default

  return (
    <aside className="user-info-panel">
      <h2 className="panel-title">USER INFO</h2>
      <div className="profile-summary">
        <div className="avatar-container">
          <img src={avatarSrc} alt="User Avatar" className="avatar-image" />
        </div>
        <div className="user-name-container">
          <span className="user-name">
            {userInfo.nickname}
          </span>
          <span className="online-indicator" aria-label="Online"></span>
        </div>
      </div>
      <div className="stats-container">
        <div className="stat-item">
          <span className="stat-value">{stats.level}</span>
          <span className="stat-label">LVL</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.rank}</span>
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