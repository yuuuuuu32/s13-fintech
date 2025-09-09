import './LobbyHeader.css';

export const LobbyHeader = ({ onCreateRoom }) => {
  return (
    <header className="lobby-header">
      <div className="header-title">
        <h1>CYBER LOBBY</h1>
        <div className="title-underglow"></div>
      </div>
      <div className="header-actions">
        {/* QUICK JACK-IN 버튼: 더 큰 사이즈, 강조 */}
        <button className="cyber-button secondary large-button">
          <span>QUICK JACK-IN</span>
          <div className="button-circuits"></div>
        </button>
        {/* CREATE ROOM 버튼: 더 큰 사이즈, 강조 */}
        <button 
          className="cyber-button primary large-button"
          onClick={onCreateRoom}
        >
          <span>CREATE ROOM</span>
          <div className="button-circuits"></div>
        </button>
      </div>
    </header>
  );
};