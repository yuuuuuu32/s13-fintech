import './UserInfo.css';
import defaultAvatar from '../../../assets/default_avatar.png'; // ✅ 수정된 경로

const CyberAvatar = () => (
  <div className="relative">
    <img src={defaultAvatar} alt="Default Avatar" className="avatar-img" />
    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-purple-400/20 animate-pulse"></div>
  </div>
);

export const UserInfo = () => {
  return (
    <div className="glass-panel user-info-panel">
      <div className="panel-header">
        <h2>USER INFO</h2>
        <div className="header-glow"></div>
      </div>
      <div className="user-info-content">
        <div className="avatar-container">
          <CyberAvatar />
          <div className="avatar-status online"></div>
        </div>
        <div className="user-details">
          <h3 className="username">CyberCamper_<span className="user-id">2077</span></h3>
          <div className="user-stats">
            <div className="stat-item">
              <span className="stat-value">15</span>
              <span className="stat-label">WINS</span>
            </div>
            <div className="stat-divider">|</div>
            <div className="stat-item">
              <span className="stat-value">5</span>
              <span className="stat-label">LOSSES</span>
            </div>
          </div>
          <div className="level-bar">
            <div className="level-fill" style={{width: '75%'}}></div>
            <span className="level-text">LVL 24</span>
          </div>
        </div>
      </div>
    </div>
  );
};