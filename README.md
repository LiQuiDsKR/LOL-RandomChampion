# 랜덤 챔피언 밴픽 도구

**리그 오브 레전드** 사용자 정의 게임을 위한 실시간 멀티플레이어 랜덤 챔피언 선택 및 밴 시스템

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Firebase](https://img.shields.io/badge/Firebase-realtime-orange.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)

## 주요 기능

### 실시간 멀티플레이어

* 최대 10명 동시 참여 (팀당 5명)
* Firebase 실시간 데이터베이스로 즉시 동기화
* 방 생성 및 참가 시스템 (비밀번호 보호 지원)
* 자동 팀 배정 및 드래그 앤 드롭 팀 변경

### 고급 밴 시스템

* 개별 플레이어 밴: 각자 원하는 챔피언 밴 가능
* 시각적 밴 표시: 라이엇 공식 챔피언 아이콘 사용
* 실시간 밴 동기화: 모든 참가자에게 즉시 반영
* 클릭 한 번으로 밴 설정: 직관적인 UI

### 스마트 랜덤 시스템

* 밴 제외 랜덤: 밴된 챔피언은 자동 제외
* 팀별 15개 챔피언 풀 생성
* 중복 방지: 팀 간 챔피언 중복 없음
* 최신 챔피언: Data Dragon API로 항상 최신 정보

### 민주적 리롤 투표

* 과반수 투표 시스템: 팀 구성원 과반수 동의 시 리롤
* 실시간 투표 현황: 진행 상황 실시간 표시
* 관리자 강제 리롤: 호스트 권한으로 즉시 리롤 가능
* 팀별 개별 리롤: 팀1, 팀2 독립적 리롤

### 관리자 전용 기능

* 드래그 앤 드롭 팀 변경: 플레이어를 끌어서 팀 이동
* 드래그 추방: 아래쪽으로 드래그해서 플레이어 제거
* 모든 플레이어 밴 제어: 다른 플레이어 밴도 설정/해제 가능
* 투표 무시 리롤: 투표와 무관하게 강제 리롤 실행

## 시작하기

### 필요 조건

* 모던 웹 브라우저 (Chrome, Firefox, Safari, Edge)
* 인터넷 연결 (Firebase 및 Data Dragon API 사용)

### 설치 및 실행

1. 저장소 복제

   ```bash
   git clone https://github.com/LiQuiDsKR/LOL-RandomChampion.git
   cd LOL-RandomChampion
   ```

2. 브라우저에서 GitHub Pages 또는 로컬 서버를 통해 접속

   ```
   http://localhost:8000
   ```

## 사용 방법

### 1. 방 생성

1. "새 방 만들기" 클릭
2. 방 이름과 호스트 이름 입력
3. 선택적으로 비밀번호 설정
4. 방 코드를 친구들에게 공유

### 2. 방 참가

1. 받은 방 코드 입력하고 "참가하기" 클릭
2. 플레이어 이름 입력
3. 비밀번호가 있다면 입력
4. 자동으로 인원이 적은 팀에 배정

### 3. 밴 설정

1. 자신의 플레이어 슬롯에서 챔피언 슬롯 클릭
2. 챔피언 검색 또는 목록에서 선택
3. 밴된 챔피언은 랜덤 풀에서 제외됨
4. 관리자는 모든 플레이어의 밴 제어 가능

### 4. 리롤 투표

1. "리롤" 버튼으로 투표 참여/취소
2. 팀 과반수 동의 시 자동 리롤 (관리자가 비활성화한 경우 수동)
3. 관리자는 "전체 리롤", "팀1 리롤", "팀2 리롤" 버튼으로 강제 실행

### 5. 관리자 기능 (호스트 전용)

* 팀 변경: 플레이어를 다른 팀 영역으로 드래그
* 플레이어 추방: 플레이어를 화면 아래 추방존으로 드래그
* 밴 제어: 모든 플레이어의 밴 설정/해제 가능

## 프로젝트 구조

```
📦 LOL-RandomChampion/
├── index.html              # 메인 HTML 파일
├── css/
│   ├── main.css            # 기본 스타일 및 테마
│   ├── modal.css           # 모달 스타일
│   ├── game.css            # 게임 화면 스타일
│   └── ten-player.css      # 10명 플레이어 레이아웃
├── js/
│   ├── utils.js            # 유틸리티 함수
│   ├── datadragon.js       # 라이엇 API 연동
│   ├── game-manager.js     # 핵심 게임 로직
│   ├── ten-player-ui.js    # UI 관리자
│   ├── modals.js           # 모달 관리
│   └── main.js             # 메인 이벤트 처리
├── img/
│   └── chzzk_logo.webp     # 로고 이미지
└── README.md               # 프로젝트 문서
```

## 기술 스택

### Frontend

* HTML5: 시맨틱 마크업
* CSS3: Flexbox, Grid, 커스텀 속성
* JavaScript ES6+: 모듈러 아키텍처
* Firebase SDK: 실시간 데이터베이스

### External APIs

* Firebase Realtime Database: 멀티플레이어 동기화
* Riot Games Data Dragon API: 챔피언 데이터 및 이미지

### 주요 라이브러리

* Firebase 9.23.0 (compat 모드)
* Data Dragon v15.19.1 (한국어)

## UI/UX 특징

### 다크 테마

* 눈의 피로를 줄이는 어두운 색상 팔레트
* 청색 계열 액센트로 게이밍 느낌 연출

### 반응형 디자인

* 데스크톱 우선 설계
* 모바일 디바이스 지원
* 유연한 그리드 레이아웃

### 직관적인 인터랙션

* 드래그 앤 드롭 인터페이스
* 호버 효과 및 트랜지션
* 실시간 시각적 피드백

## 고급 기능

### 실시간 동기화

```javascript
// Firebase 실시간 리스너 예시
window.db.ref(`rooms/${roomId}/players`).on('value', (snap) => {
  const players = snap.val() || {};
  this.renderPlayers(players);
});
```

### 드래그 앤 드롭 시스템

* 팀 변경: 플레이어를 다른 팀으로 이동
* 추방 기능: 화면 하단 드롭존으로 제거
* 시각적 피드백: 드래그 중 하이라이트 효과

### 스마트 랜덤 알고리즘

* 밴된 챔피언 자동 제외
* 팀 간 중복 방지
* 충분한 챔피언 풀 보장

## 기여하기

1. Fork 저장소
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

## 라이선스

이 프로젝트는 MIT 라이선스로 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 문의

프로젝트 관련 문의사항이나 버그 리포트는 [GitHub Issues](https://github.com/LiQuiDsKR/LOL-RandomChampion/issues)를 이용해 주세요.