# Finble Frontend

> 실시간 멀티플레이어 부루마블 게임 플랫폼의 프론트엔드

## 🎯 프로젝트 개요

Finble은 핀테크 교육을 게임화한 실시간 멀티플레이어 부루마블 게임입니다. 사용자들이 재미있게 금융 개념을 학습할 수 있도록 설계된 웹 기반 게임 플랫폼입니다.

### 해결하고자 하는 문제
- 복잡한 금융 개념을 직관적이고 재미있게 학습할 수 있는 환경 제공
- 실시간 멀티플레이어 게임을 통한 사용자 참여도 향상
- 모바일과 데스크톱 모두에서 원활한 게임 경험 제공

## 🛠 기술 스택

### Core Technologies
- **React 19** - 최신 React 기능 활용한 컴포넌트 기반 아키텍처
- **TypeScript 5.8** - 타입 안전성과 개발 생산성 향상
- **Vite 7** - 빠른 개발 서버와 최적화된 빌드

### State Management & Real-time Communication
- **Zustand** - 경량화된 상태 관리 라이브러리
- **WebSocket (STOMP)** - 실시간 게임 상태 동기화
- **Axios** - HTTP 클라이언트 API 통신

### 3D Graphics & Animation
- **Three.js** - 3D 게임 보드 렌더링
- **React Three Fiber** - React와 Three.js 통합
- **React Three Drei** - 3D 컴포넌트 유틸리티
- **Rapier3D** - 물리 엔진 시뮬레이션
- **Framer Motion** - 부드러운 애니메이션

### UI/UX
- **Material-UI** - 일관된 디자인 시스템
- **CSS Modules** - 스타일 캡슐화
- **Emotion** - CSS-in-JS 스타일링

## 🏗 아키텍처

### Feature-Based Directory Structure
```
src/
├── features/           # 기능별 모듈화
│   ├── auth/          # 인증 (OAuth, 닉네임 설정)
│   ├── lobby/         # 로비 (방 목록, 방 생성)
│   ├── room/          # 대기실 (플레이어 관리)
│   ├── game/          # 게임 (보드, 플레이어, 게임 로직)
│   └── landing/       # 랜딩 페이지
├── stores/            # 전역 상태 관리
├── api/              # API 클라이언트
├── router/           # 라우팅 설정
└── utils/            # 유틸리티 함수
```

### 주요 설계 원칙
- **관심사 분리**: 각 기능별로 독립적인 모듈 구성
- **타입 안전성**: 모든 API 응답과 상태에 대한 TypeScript 타입 정의
- **재사용성**: 공통 컴포넌트와 훅의 모듈화
- **성능 최적화**: 코드 스플리팅과 지연 로딩 적용

## 🚀 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 린트 검사
npm run lint

# 프리뷰 (빌드 결과 확인)
npm run preview
```

### 환경 변수 설정
```bash
# .env.local 파일 생성
VITE_API_URL=http://localhost:8081
VITE_WS_URL=ws://localhost:8081
```

## 🔧 개발 도구 및 품질 관리

### ESLint 설정
- TypeScript ESLint 규칙 적용
- React Hooks 규칙 강화
- React Refresh 플러그인 활용
- 코드 품질과 일관성 보장

### TypeScript 설정
- 엄격한 타입 검사 활성화
- 프로젝트와 노드 환경 분리 (tsconfig.app.json, tsconfig.node.json)
- 절대 경로 import 지원

### Vite 최적화
- React 의존성 중복 해결
- 개발 서버 프록시 설정
- CORS 헤더 최적화
- 빌드 성능 향상을 위한 환경 변수 설정

## 🎮 주요 기능

### 인증 시스템
- Google OAuth 2.0 연동
- Kakao 소셜 로그인
- 닉네임 설정 및 프로필 관리

### 실시간 멀티플레이어
- WebSocket 기반 실시간 통신
- 방 생성 및 참가 시스템
- 플레이어 상태 동기화

### 3D 게임 보드
- Three.js 기반 3D 렌더링
- 물리 엔진을 활용한 주사위 시뮬레이션
- 부드러운 플레이어 이동 애니메이션

### 게임 로직
- 부루마블 게임 규칙 구현
- 건물 구매 및 관리 시스템
- 특수 타일 이벤트 처리

## 📱 반응형 디자인

- 모바일 우선 설계
- 태블릿 및 데스크톱 최적화
- 터치 및 마우스 인터랙션 지원

## 🔍 코드 품질

- **타입 안전성**: 모든 컴포넌트와 함수에 TypeScript 타입 적용
- **모듈화**: 기능별 독립적인 모듈 구성으로 유지보수성 향상
- **성능 최적화**: React.memo, useMemo, useCallback 적절한 활용
- **에러 처리**: 전역 에러 바운더리와 로컬 에러 처리

## 🤝 기여 가이드

1. 기능 브랜치 생성
2. TypeScript 타입 정의 필수
3. ESLint 규칙 준수
4. 컴포넌트 단위 테스트 작성 권장
5. Pull Request 전 빌드 확인

---

**개발자**: S13 Fintech Team  
**라이선스**: Private
