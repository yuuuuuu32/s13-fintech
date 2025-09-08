// React에서 `useState` (상태 관리), `useEffect` (사이드 이펙트 처리) 훅을 가져옵니다.
import { useState, useEffect } from 'react';
// 모달의 스타일을 위한 CSS 파일을 가져옵니다.
import './NicknameModal.css';

// 이 컴포넌트가 부모로부터 받을 props(속성)의 타입을 정의합니다. (TypeScript 문법)
interface NicknameModalProps {
  isOpen: boolean;       // 모달이 열려있는지 여부
  onClose: () => void;     // 모달을 닫을 때 호출될 함수
  onComplete: () => void;  // 닉네임 설정이 완료됐을 때 호출될 함수
}

// 프론트엔드 테스트를 위해 이미 사용 중인 닉네임 목록을 모의(mock) 데이터로 만듭니다.
// 실제 애플리케이션에서는 이 목록을 서버 데이터베이스에서 가져옵니다.
const MOCK_TAKEN_NICKNAMES = ['admin', 'guest', 'user', 'root', 'test'];

// 닉네임이 사용 가능한지 비동기적으로 확인하는 함수를 시뮬레이션합니다.
// async 키워드는 이 함수가 비동기 작업을 포함하고 있음을 나타냅니다.
const checkNicknameAvailability = async (nickname: string): Promise<boolean> => {
  // Promise를 반환하여 비동기 작업(예: 서버 API 호출)을 흉내 냅니다.
  return new Promise(resolve => {
    // setTimeout으로 0.5초의 네트워크 지연을 시뮬레이션합니다.
    setTimeout(() => {
      // 입력된 닉네임을 소문자로 바꿔서 모의 데이터 목록에 포함되어 있는지 확인합니다.
      const isTaken = MOCK_TAKEN_NICKNAMES.includes(nickname.toLowerCase());
      // 닉네임이 목록에 없으면(사용 가능하면) true, 있으면(중복이면) false를 반환합니다.
      resolve(!isTaken);
    }, 500);
  });
};

// NicknameModal 컴포넌트를 정의합니다. 부모로부터 isOpen, onClose, onComplete를 props로 받습니다.
export default function NicknameModal({ isOpen, onClose, onComplete }: NicknameModalProps) {
  // 컴포넌트 내부에서 사용할 상태들을 선언합니다.
  const [nickname, setNickname] = useState('');     // 사용자가 입력한 닉네임을 저장하는 상태
  const [error, setError] = useState('');           // 유효성 검사 에러 메시지를 저장하는 상태
  const [isLoading, setIsLoading] = useState(false); // 닉네임 확인 중(로딩 중)인지 여부를 저장하는 상태

  // useEffect: 특정 props나 state가 변경될 때마다 특정 작업을 수행하도록 설정합니다.
  // 여기서는 'isOpen' prop이 변경될 때마다 실행됩니다.
  useEffect(() => {
    // 만약 모달이 닫히는 상태가 되면(isOpen이 false가 되면)
    if (!isOpen) {
      // 내부 상태들을 모두 초기값으로 리셋합니다.
      // 이렇게 해야 다음에 모달이 열릴 때 이전에 입력했던 값이나 에러 메시지가 보이지 않습니다.
      setNickname('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]); // [isOpen] 배열은 이 useEffect가 isOpen 값이 바뀔 때만 실행되도록 만듭니다.

  // 폼(form)이 제출될 때(확인 버튼 클릭 시) 실행될 함수입니다.
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    // 폼 제출 시 기본 동작인 페이지 새로고침을 방지합니다.
    event.preventDefault();
    // 이전 에러 메시지가 있었다면 초기화합니다.
    setError('');

    // 1. 닉네임 유효성 검사 (길이)
    if (nickname.length < 2 || nickname.length > 10) {
      setError('닉네임은 2자 이상 10자 이하로 입력해주세요.');
      return; // 함수 실행을 여기서 중단합니다.
    }

    // 2. 중복 확인 시작 -> 로딩 상태를 true로 변경합니다.
    setIsLoading(true);
    
    // 3. 닉네임 중복 여부를 비동기적으로 확인하고 결과를 기다립니다. (await)
    const isAvailable = await checkNicknameAvailability(nickname);
    
    // 4. 중복 확인 결과 처리
    if (!isAvailable) {
      setError('이미 사용 중인 닉네임입니다.');
      setIsLoading(false); // 로딩 상태를 false로 되돌립니다.
      return; // 함수 실행을 중단합니다.
    }

    // 5. 모든 검사를 통과했을 경우, 최종 제출을 시뮬레이션합니다.
    // (실제로는 여기서 서버에 닉네임을 저장하는 API를 호출합니다)
    setTimeout(() => {
      setIsLoading(false); // 로딩 상태를 종료합니다.
      onComplete();      // 부모 컴포넌트(LoginPage)에게 완료되었음을 알립니다. (이 함수 호출로 로비 이동이 시작됩니다)
    }, 1000); // 1초 지연
  };

  // 만약 isOpen prop이 false이면, 아무것도 렌더링하지 않습니다(모달을 숨김).
  if (!isOpen) {
    return null;
  }

  // isOpen prop이 true이면, 아래의 JSX 코드를 화면에 렌더링합니다.
  return (
    // 모달의 배경(반투명 검은색) 부분입니다.
    // 이 부분을 클릭하면 onClose 함수가 호출되어 모달이 닫힙니다.
    <div className="modal-overlay" onClick={onClose}>
      {/* 실제 모달 컨텐츠 부분입니다. */}
      {/* e.stopPropagation()은 이벤트 전파를 막습니다. */}
      {/* 즉, 모달 내부를 클릭했을 때 배경(overlay)의 onClick 이벤트가 실행되지 않도록 방지합니다. */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">닉네임 설정</h2>
        <p className="modal-description">게임에서 사용할 닉네임을 입력해주세요.</p>
        
        {/* 닉네임 입력 폼. 제출 시 handleSubmit 함수가 실행됩니다. */}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={nickname} // input의 값을 nickname 상태와 동기화합니다.
            // 입력값이 변경될 때마다 nickname 상태를 업데이트합니다.
            onChange={(e) => setNickname(e.target.value)}
            className="nickname-input"
            placeholder="닉네임을 입력하세요"
            autoFocus // 모달이 열리면 자동으로 이 input에 포커스가 갑니다.
            disabled={isLoading} // 로딩 중일 때는 입력창을 비활성화합니다.
          />

          {/* error 상태에 메시지가 있을 경우에만 p 태그를 렌더링하여 보여줍니다. */}
          {error && <p className="error-message">{error}</p>}
          
          <button type="submit" className="submit-button" disabled={isLoading}>
            {/* isLoading 상태에 따라 버튼의 텍스트를 '설정 중...' 또는 '확인'으로 변경합니다. */}
            {isLoading ? '설정 중...' : '확인'}
          </button>
        </form>
      </div>
    </div>
  );
}