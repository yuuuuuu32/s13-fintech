import { useState, useEffect } from 'react';
import './NicknameModal.css';
import { updateMyInfo } from '../../../api/user'; // Import the real API function
import { useUserStore } from '../../../stores/useUserStore'; // Import the user store

interface NicknameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function NicknameModal({ isOpen, onClose, onComplete }: NicknameModalProps) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setUserInfo = useUserStore((state) => state.setUserInfo); // Get the action from the store

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setNickname('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (nickname.length < 2 || nickname.length > 10) {
      setError('닉네임은 2자 이상 10자 이하로 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      // Call the real API to update the nickname
      const updatedUserInfo = await updateMyInfo(nickname);
      
      // Update the global user store with the new info
      setUserInfo(updatedUserInfo);

      // Signal completion to close the modal and navigate
      onComplete();

    } catch (err) {
      // Handle potential errors, e.g., nickname already taken from the backend
      setError('이미 사용 중인 닉네임이거나 오류가 발생했습니다.');
      console.error('Failed to update nickname:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">닉네임 설정</h2>
        <p className="modal-description">게임에서 사용할 닉네임을 입력해주세요.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="nickname-input"
            placeholder="닉네임을 입력하세요"
            autoFocus
            disabled={isLoading}
          />
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? '설정 중...' : '확인'}
          </button>
        </form>
      </div>
    </div>
  );
}
