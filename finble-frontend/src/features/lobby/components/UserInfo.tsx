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
            {userInfo.nickname || '닉네임 없음'}
          </span>
          <span className="online-indicator" aria-label="Online"></span>
        </div>
      </div>
    </aside>
  );
}