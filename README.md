🎲 핀블 (Fin-ble) - 금융 학습형 보드게임
주사위 속에 담긴 현실 경제! 친구와 함께 즐기는 신개념 금융 학습 보드게임, 핀블입니다.

'핀블(Fin-ble)'은 '부루마블'이라는 친숙한 보드게임 형식에 '핀테크' 요소를 결합하여, 사용자들이 딱딱한 금융 지식을 재미있게 접하고 자연스럽게 학습할 수 있도록 설계된 실시간 멀티플레이어 웹 게임입니다.

<br/>

✨ 주요 기능 (Key Features)
실시간 멀티플레이어 대전: WebSocket 기술을 기반으로, 친구들과 함께 실시간으로 보드게임을 즐길 수 있습니다.

동적 금융 이벤트: '금리 인상/인하', '경기 침체/호황' 등 현실 경제 상황을 반영한 이벤트 카드(찬스 카드)를 통해 게임의 변동성과 금융 학습 효과를 높였습니다.

간편한 소셜 로그인: 카카오 소셜 로그인을 도입하여, 별도의 회원가입 없이 간편하게 게임을 시작할 수 있습니다.

관전 모드: 게임에서 파산하더라도, 다른 플레이어들의 게임을 끝까지 지켜볼 수 있는 관전 모드를 제공합니다.

<br/>

🛠️ 기술 스택 (Tech Stack)
구분	기술
Frontend	
Backend	
Real-time	
Database	
Deployment	
CI/CD	

Sheets로 내보내기
<br/>

⚙️ 아키텍처 (Architecture)
(이곳에 프로젝트 아키텍처 다이어그램 이미지를 추가하세요.)

<br/>

📖 설치 및 실행 (Getting Started)
Prerequisites
Node.js v18.x

Python 3.10+

PostgreSQL

Installation
Repository 클론

Bash

git clone https://[your_github_repository_url]/fin-ble.git
cd fin-ble
Backend 설정

Bash

cd backend
pip install -r requirements.txt
# .env 파일 생성 및 환경 변수 설정
uvicorn main:app --reload
Frontend 설정

Bash

cd frontend
npm install
# .env 파일 생성 및 환경 변수 설정
npm num dev
<br/>