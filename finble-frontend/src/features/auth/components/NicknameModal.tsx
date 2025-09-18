import { useState, useEffect } from 'react';
import './NicknameModal.css';
import { updateMyInfo, getMyInfo } from '../../../api/user';
import { useUserStore } from '../../../stores/useUserStore';

interface NicknameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function NicknameModal({
  isOpen,
  onClose,
  onComplete,
}: NicknameModalProps) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setUserInfo = useUserStore((state) => state.setUserInfo);

  // 모달이 닫힐 때 상태를 초기화하는 로직은 그대로 유지합니다.
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
      // updateMyInfo API를 호출하여 닉네임을 업데이트합니다.
      await updateMyInfo(nickname);
      console.log('Nickname update successful');

      // 업데이트 후 최신 사용자 정보를 다시 가져옵니다.
      const updatedUserInfo = await getMyInfo();
      console.log('Updated user info:', updatedUserInfo);

      // 최신 정보로 전역 상태를 업데이트합니다.
      setUserInfo(updatedUserInfo);

      // 성공적으로 완료되었음을 알립니다.
      onComplete();
    } catch (err) {
      setError('이미 사용 중인 닉네임이거나 오류가 발생했습니다.');
      console.error('Failed to update nickname:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  // JSX 부분은 기존의 상세한 UI 로직을 그대로 사용합니다.
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">닉네임 설정</h2>
        <p className="modal-description">
          게임에서 사용할 닉네임을 입력해주세요.
        </p>
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