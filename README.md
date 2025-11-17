# 다빈치 코드 보드게임 🎮

[![Kotlin](https://img.shields.io/badge/Kotlin-1.9.22-purple.svg)](https://kotlinlang.org/)
[![Ktor](https://img.shields.io/badge/Ktor-2.3.7-blue.svg)](https://ktor.io/)
[![License](https://img.shields.io/badge/License-Private-red.svg)]()

Kotlin/Ktor 기반의 실시간 멀티플레이어 다빈치 코드 보드게임 웹 애플리케이션

## 📋 목차

- [소개](#-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [게임 규칙](#-게임-규칙)
- [설치 및 실행](#-설치-및-실행)
- [프로젝트 구조](#-프로젝트-구조)
- [API 문서](#-api-문서)
- [개발 히스토리](#-개발-히스토리)

## 🎯 소개

다빈치 코드는 숫자 추리 보드게임을 웹으로 구현한 프로젝트입니다.
2-4명의 플레이어가 실시간으로 상대방의 숫자 타일을 추리하며 경쟁하는 게임입니다.

### 프로젝트 특징

- ⚡ **실시간 통신**: WebSocket 기반 실시간 게임 플레이
- 🎨 **프리미엄 디자인**: 그라디언트와 3D 효과를 활용한 현대적 UI
- 🔧 **강력한 백엔드**: Kotlin + Ktor로 구현된 안정적인 서버
- 📱 **반응형 디자인**: 모바일부터 데스크톱까지 완벽 지원
- 🎲 **완전한 게임 로직**: 모든 게임 규칙 구현 완료

## ✨ 주요 기능

### 게임 기능
- ✅ 2-4인 멀티플레이어 지원
- ✅ 실시간 턴제 게임플레이
- ✅ 타일 뽑기 및 숫자 추리
- ✅ 자동 승패 판정
- ✅ 플레이어 탈락 시스템

### 소셜 기능
- ✅ 방 생성 및 입장 시스템
- ✅ 실시간 채팅
- ✅ 방 목록 조회
- ✅ 플레이어 상태 표시

### UI/UX
- ✅ 3D 타일 효과 및 애니메이션
- ✅ 커스텀 스크롤바
- ✅ 호버 효과 및 트랜지션
- ✅ 터치 친화적 인터페이스

## 🛠️ 기술 스택

### 백엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| Kotlin | 1.9.22 | 주 프로그래밍 언어 |
| Ktor | 2.3.7 | 웹 프레임워크 |
| Kotlinx Serialization | 1.6.2 | JSON 직렬화 |
| Logback | 1.4.14 | 로깅 |
| Gradle | 8.5 | 빌드 도구 |

### 프론트엔드
| 기술 | 용도 |
|------|------|
| Vanilla JavaScript (ES5) | 클라이언트 로직 |
| WebSocket API | 실시간 통신 |
| CSS3 | 스타일링 및 애니메이션 |
| HTML5 | 마크업 |

### 개발 도구
- IntelliJ IDEA (권장)
- Git
- JDK 17+

## 🎲 게임 규칙

### 기본 규칙

1. **타일 구성**
   - 숫자: 0-11 (각 2장씩, 총 24장)
   - 색상: 검은색, 흰색 각 12장

2. **게임 시작**
   - 각 플레이어에게 4장씩 배분
   - 타일은 자동으로 오름차순 정렬

3. **턴 진행**
   ```
   1. 타일 뽑기 (일반 덱 또는 공개된 덱)
   2. 상대방 타일 선택
   3. 숫자 추리
      ├─ 정답: 타일 공개, 계속 추리 가능
      └─ 오답: 자신의 타일 공개, 턴 종료
   ```

4. **승리 조건**
   - 다른 모든 플레이어가 탈락하면 승리
   - 탈락: 모든 타일이 공개된 상태

### 전략 팁
- 상대방의 타일 색상을 힌트로 활용
- 공개된 타일을 기억하여 범위 좁히기
- 자신의 가장 작은 숫자부터 보호

## 🚀 설치 및 실행

### 사전 요구사항

```bash
# JDK 17 이상 필요
java -version

# 확인
./gradlew --version
```

### 빠른 시작

```bash
# 1. 저장소 클론
git clone https://github.com/Uginim/Davinci_code.git
cd Davinci_code

# 2. 의존성 설치 및 빌드
./gradlew build

# 3. 서버 실행
./gradlew run
```

서버가 시작되면 브라우저에서 `http://localhost:3000` 접속

### 개발 모드 실행

```bash
# 자동 재시작 (파일 변경 감지)
./gradlew run --continuous
```

### 프로덕션 빌드

```bash
# JAR 파일 생성
./gradlew build

# 생성된 JAR 실행
java -jar build/libs/davinci-code-1.0.0.jar
```

## 📁 프로젝트 구조

```
Davinci_code/
├── src/main/kotlin/com/davinci/
│   ├── Application.kt              # Ktor 메인 애플리케이션
│   ├── models/
│   │   └── Models.kt               # 데이터 모델 정의
│   └── managers/
│       ├── GameManager.kt          # 게임 로직 관리
│       ├── UserManager.kt          # 사용자 관리
│       └── RoomManager.kt          # 방 관리
│
├── src/main/resources/
│   └── logback.xml                 # 로깅 설정
│
├── public/                         # 정적 파일
│   ├── index.html                  # 메인 HTML
│   ├── javascript/
│   │   ├── ChattingClient.js      # 채팅 클라이언트
│   │   └── GameClient.js          # 게임 클라이언트
│   └── stylesheets/
│       └── style.css              # 스타일시트
│
├── build.gradle.kts                # Gradle 빌드 설정
├── settings.gradle.kts
└── README.md
```

## 📡 API 문서

### WebSocket 연결

```javascript
// 연결
const ws = new WebSocket('ws://localhost:3000/ws');

// 메시지 형식
{
  "type": "reqRegisterUser",
  "name": "플레이어1"
}
```

### 메시지 타입

#### 사용자 관리
- `reqRegisterUser` - 사용자 등록
- `resRegisterUser` - 등록 응답

#### 방 관리
- `reqRoomList` - 방 목록 조회
- `reqCreatingRoom` - 방 생성
- `reqEnteringARoom` - 방 입장
- `reqLeavingARoom` - 방 퇴장

#### 게임
- `reqStartGame` - 게임 시작
- `reqDrawTile` - 타일 뽑기
- `reqGuess` - 숫자 추리
- `reqEndTurn` - 턴 종료
- `reqGameState` - 게임 상태 조회

#### 서버 이벤트
- `gameStarted` - 게임 시작됨
- `gameStateUpdate` - 게임 상태 업데이트
- `guessResult` - 추리 결과
- `turnChanged` - 턴 변경
- `gameEnded` - 게임 종료
- `chatMsg` - 채팅 메시지

## 🎨 UI 컴포넌트

### 색상 팔레트

```css
--primary-color: #667eea;      /* 메인 보라색 */
--secondary-color: #764ba2;    /* 보조 보라색 */
--success-color: #48bb78;      /* 성공 녹색 */
--warning-color: #f6ad55;      /* 경고 오렌지 */
```

## 📈 개발 히스토리

### v1.0.0 (2025-01-14)
- ✅ Kotlin/Ktor 서버 구현
- ✅ WebSocket 실시간 통신
- ✅ 완전한 게임 로직 구현
- ✅ 프리미엄 UI 디자인

### 마이그레이션 과정

**Before (Node.js)**
```
Node.js + Express + Socket.io
├── JavaScript 게임 로직
├── Jade 템플릿
└── npm 패키지 관리
```

**After (Kotlin)**
```
Kotlin + Ktor + WebSocket
├── Kotlin 게임 로직
├── 정적 HTML
└── Gradle 빌드 시스템
```

**개선 사항:**
- ⚡ 타입 안정성 향상 (Kotlin)
- 🔒 컴파일 타임 에러 체크
- 📦 의존성 관리 개선 (Gradle)
- 🚀 성능 최적화
- 🛡️ 보안 강화 (최신 Ktor)

## 🔮 향후 계획

### Phase 2 (진행 중)
- [ ] Mustache 템플릿 엔진 적용
- [ ] 사용자 인증 시스템
- [ ] 게임 기록 및 통계

### Phase 3
- [ ] AI 플레이어
- [ ] 관전 모드
- [ ] 토너먼트 모드

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

Private - 개인 프로젝트

## 👥 개발자

- **Original Base**: Hyeonuk Kim
- **Ktor Migration & Enhancement**: Claude AI Assistant

## 📞 문의

프로젝트 링크: [https://github.com/Uginim/Davinci_code](https://github.com/Uginim/Davinci_code)

---

⭐ 이 프로젝트가 마음에 드셨다면 Star를 눌러주세요!
