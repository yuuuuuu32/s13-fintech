import { useState, useEffect } from 'react';
import './NicknameModal.css';

interface NicknameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

// Mock database of taken nicknames for frontend testing
const MOCK_TAKEN_NICKNAMES = ['admin', 'guest', 'user', 'root', 'test'];

// Simulate checking if a nickname is already taken against our mock database
const checkNicknameAvailability = async (nickname: string): Promise<boolean> => {
  return new Promise(resolve => {
    setTimeout(() => {
      // Check if the lowercase version of the nickname exists in our mock list
      const isTaken = MOCK_TAKEN_NICKNAMES.includes(nickname.toLowerCase());
      resolve(!isTaken); // Resolve with 'true' if available, 'false' if taken
    }, 500); // Simulate network delay
  });
};


export default function NicknameModal({ isOpen, onClose, onComplete }: NicknameModalProps) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

    // Validation
    if (nickname.length < 2 || nickname.length > 10) {
      setError('닉네임은 2자 이상 10자 이하로 입력해주세요.');
      return;
    }

    setIsLoading(true);
    
    const isAvailable = await checkNicknameAvailability(nickname);
    
    if (!isAvailable) {
      setError('이미 사용 중인 닉네임입니다.');
      setIsLoading(false);
      return;
    }

    // Simulate final submission
    setTimeout(() => {
      setIsLoading(false);
      onComplete();
    }, 1000);
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