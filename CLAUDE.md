# SNMPUPS - Electron 전환 프로젝트

## 프로젝트 목표

기존 Python(PyQt6) 기반 UPS 감시 프로그램을 **Electron + Node.js** 기반 Windows 데스크톱 앱으로 완전히 재작성한다.
모든 기존 기능을 100% 유지하면서 현대적인 웹 기술 스택으로 전환한다.

## 현재 상태 (AS-IS)

- **언어**: Python 3
- **GUI**: PyQt6
- **SNMP**: PySNMP (pysnmp.hlapi.v3arch.asyncio)
- **비동기**: qasync + asyncio
- **빌드**: PyInstaller → snmpups.exe (단일 실행파일)
- **소스**: `snmpups.py` 단일 파일 (1013줄)

## 목표 상태 (TO-BE)

- **플랫폼**: Electron (Main + Renderer 프로세스)
- **언어**: TypeScript (전체)
- **프론트엔드**: React + TailwindCSS
- **SNMP**: net-snmp (Node.js 네이티브 SNMP 라이브러리)
- **빌드/번들**: electron-builder (Windows .exe 패키징)
- **패키지 매니저**: npm

## 유지해야 할 핵심 기능

### 1. 듀얼 UPS 실시간 모니터링
- **UPS#1** (3상 - R/S/T): 입력 전압/전류/전력, 출력 전압/전류/부하율, 주파수, 배터리 상태/전압/잔량 (23개 파라미터)
- **UPS#2** (단상): 입력/출력 전압, 입력/출력 주파수, 배터리 상태/전압/잔량/온도 (9개 파라미터)
- SNMP v2c 프로토콜, 설정 가능한 폴링 간격 (기본 5초)

### 2. SNMP OID 체계 (RFC 1628 UPS-MIB)
```
베이스 OID: 1.3.6.1.2.1.33
- .1.3.3.1.3.x  입력 전압 (phase x)
- .1.3.3.1.4.x  입력 전류 (phase x)
- .1.3.3.1.5.x  입력 전력 (phase x)
- .1.2.3.0      입력 주파수
- .1.4.1.0      출력 상태
- .1.4.4.1.2.x  출력 전압 (phase x)
- .1.4.4.1.3.x  출력 전류 (phase x)
- .1.4.2.0      출력 주파수
- .1.4.4.1.5.x  출력 부하율 (phase x)
- .1.2.1.0      배터리 상태
- .1.2.5.0      배터리 전압
- .1.2.4.0      배터리 잔량
- .1.2.7.0      배터리 온도 (UPS#2만)
```

### 3. 값 변환 로직 (반드시 보존)
- 주파수: `값 / 10` (단, UPS#1 입력주파수는 나누기 없음)
- 전력: `값 / 1000` (kW)
- 배터리 전압(UPS#2): `값 / 100`
- 입력/출력 전압: 그대로 사용
- 일반 전압: `값 / 10`
- 전류: `값 / 10`
- 배터리 상태: 1=알 수 없음, 2=정상, 3=배터리 부족, 4=배터리 소진
- 출력 상태: 1=기타, 2=없음, 3=정상, 4=바이패스, 5=배터리, 6=부스터, 7=리듀서

### 4. 임계값 알람 시스템
- 각 파라미터별 min/max 설정 가능
- 상태 추적 (low/high/normal) - 중복 알림 방지
- 비정상 시 빨간색(#ff4c4c), 정상 시 초록색(#32cd32) 표시
- WAV 알람 사운드 재생 (4초 간격 반복)
- UPS별 독립 음소거 기능

### 5. 네트워크 통신
- UDP로 모니터링 데이터 전송 (fire-and-forget)
- UPS#1 → server_ip:1991, UPS#2 → server_ip:1990
- JSON 포맷: `{"UPS": 1, "Data": {...}}`

### 6. 설정 관리
- `settings.json` (UPS#1), `ups2_settings.json` (UPS#2), `keepalive_settings.json`
- GUI 설정 다이얼로그 (일반 탭 + 이벤트 탭)
- 설정 항목: SNMP IP/Community, UDP 서버 IP/포트, 폴링 간격, 알람 사운드 경로, 파라미터별 min/max 임계값

### 7. 이벤트 로그
- UPS별 독립 이벤트 로그 패널
- 최대 500줄 자동 트리밍
- 임계값 위반, 상태 변경, SNMP 오류 기록
- 로그 초기화 버튼
- 파일 로깅: RotatingFileHandler (100KB, 3 백업)

### 8. UI 레이아웃
- 창 제목: "김포공항 제1레이더 UPS 감시 프로그램"
- 화면 왼쪽 절반 크기, 전체 높이
- UPS#1 섹션 (위): 데이터 테이블(좌) + 이벤트 로그(우)
- UPS#2 섹션 (아래): 데이터 테이블(좌) + 이벤트 로그(우)
- 하단 푸터: "Developed by 13615" + 메모리 사용량 + 최종 갱신 시각

## 프로젝트 구조 (목표)

```
snmpups/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── electron-builder.yml        # electron-builder 패키징 설정
├── src/
│   ├── main/                   # Electron Main 프로세스
│   │   ├── index.ts            # 앱 진입점, BrowserWindow 생성
│   │   ├── snmp.ts             # SNMP 폴링 로직 (net-snmp)
│   │   ├── udp.ts              # UDP 데이터 전송
│   │   ├── settings.ts         # 설정 파일 읽기/쓰기
│   │   ├── alarm.ts            # 알람 사운드 관리
│   │   ├── threshold.ts        # 임계값 체크 로직
│   │   └── ipc-handlers.ts     # IPC 핸들러 등록
│   ├── renderer/               # Electron Renderer 프로세스 (React)
│   │   ├── index.html
│   │   ├── index.tsx           # React 진입점
│   │   ├── App.tsx             # 메인 레이아웃
│   │   ├── components/
│   │   │   ├── UpsPanel.tsx        # UPS 데이터 테이블 + 로그 패널
│   │   │   ├── DataTable.tsx       # SNMP 데이터 테이블 (항목/값)
│   │   │   ├── EventLog.tsx        # 이벤트 로그 영역
│   │   │   ├── SettingsDialog.tsx  # 설정 다이얼로그
│   │   │   └── Footer.tsx          # 하단 상태 바
│   │   ├── hooks/
│   │   │   └── useSnmpData.ts      # SNMP 데이터 수신 훅
│   │   └── styles/
│   │       └── global.css          # TailwindCSS + 커스텀 스타일
│   ├── shared/                 # Main/Renderer 공유 타입
│   │   ├── types.ts            # 인터페이스, 타입 정의
│   │   ├── constants.ts        # OID 맵, 상태 맵, 기본 설정값
│   │   └── ipc-channels.ts     # IPC 채널 이름 상수
│   └── preload/
│       └── index.ts            # contextBridge API 노출
├── assets/
│   ├── icon.ico
│   ├── icon.png
│   ├── UPS1.wav
│   └── UPS2.wav
└── dist/                       # 빌드 출력
```

## 아키텍처 원칙

### Main 프로세스 담당
- SNMP 폴링 (net-snmp)
- UDP 데이터 전송
- 설정 파일 I/O
- 파일 로깅 (winston 또는 electron-log)
- 알람 사운드 재생 관리
- 임계값 체크 및 상태 추적

### Renderer 프로세스 담당
- React UI 렌더링
- IPC를 통해 Main으로부터 데이터 수신
- 설정 다이얼로그 표시
- 이벤트 로그 표시
- 색상 기반 상태 표시

### IPC 통신 (Main ↔ Renderer)
- `snmp:data` - SNMP 데이터 업데이트 (Main → Renderer)
- `snmp:log` - 이벤트 로그 메시지 (Main → Renderer)
- `snmp:alarm-state` - 알람 상태 변경 (Main → Renderer)
- `settings:get` - 설정 조회 (Renderer → Main)
- `settings:save` - 설정 저장 (Renderer → Main)
- `alarm:mute` - 음소거 토글 (Renderer → Main)
- `log:clear` - 로그 초기화 (Renderer → Main)

## 개발 규칙

- 한국어 UI 텍스트 그대로 유지 (김포공항 제1레이더, 항목명 등)
- 기존 settings.json / ups2_settings.json / keepalive_settings.json 포맷 호환
- SNMP OID 및 값 변환 로직 1:1 이식
- 색상 코드 유지: 정상=#32cd32, 비정상=#ff4c4c
- UDP 전송 JSON 포맷 동일하게 유지
- Windows 전용 타겟 (electron-builder win 설정)
- electron-builder로 단일 .exe 인스톨러 생성

## 기술 의존성

```json
{
  "dependencies": {
    "net-snmp": "SNMP v2c 통신",
    "electron-log": "파일 로깅 (rotating)",
    "electron-store": "설정 파일 관리 (선택)",
    "react": "UI 프레임워크",
    "react-dom": "React DOM 렌더링"
  },
  "devDependencies": {
    "electron": "데스크톱 앱 런타임",
    "electron-builder": "Windows exe 빌드",
    "typescript": "타입 안전성",
    "tailwindcss": "유틸리티 CSS",
    "webpack 또는 vite": "번들링"
  }
}
```

## 마이그레이션 체크리스트

- [ ] Electron 프로젝트 초기화 (package.json, tsconfig)
- [ ] Main 프로세스 구현 - BrowserWindow 생성
- [ ] shared/constants.ts - OID 맵, 상태 맵, 기본 설정값 이식
- [ ] shared/types.ts - TypeScript 인터페이스 정의
- [ ] main/settings.ts - JSON 설정 파일 로드/저장
- [ ] main/snmp.ts - net-snmp 기반 SNMP 폴링 구현
- [ ] main/threshold.ts - 임계값 체크 + 상태 추적 로직
- [ ] main/udp.ts - UDP 데이터 전송
- [ ] main/alarm.ts - WAV 알람 사운드 관리
- [ ] main/ipc-handlers.ts - IPC 핸들러 등록
- [ ] preload/index.ts - contextBridge API
- [ ] renderer/ - React UI 전체 구현
  - [ ] App.tsx - 메인 레이아웃 (UPS#1 위, UPS#2 아래)
  - [ ] DataTable.tsx - 항목/값 테이블 (색상 표시)
  - [ ] EventLog.tsx - 이벤트 로그 (500줄 트리밍)
  - [ ] SettingsDialog.tsx - 설정 다이얼로그 (일반 + 이벤트 탭)
  - [ ] Footer.tsx - 메모리 사용량 + 최종 갱신 시각
- [ ] electron-builder 설정 - Windows exe 빌드
- [ ] 기능 검증 - 기존 Python 버전과 1:1 동작 비교
