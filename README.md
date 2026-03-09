# SNMPUPS - 김포 제1레이더 UPS 감시 프로그램

SNMP v2c 프로토콜 기반 듀얼 UPS 실시간 모니터링 데스크톱 애플리케이션

## 개요

김포 제1레이더 시설의 UPS 2대(3상 + 단상)를 실시간으로 감시하는 Windows 데스크톱 프로그램입니다. RFC 1628 UPS-MIB 표준 OID를 사용하여 입출력 전압/전류/전력, 주파수, 배터리 상태 등을 모니터링하고, 임계값 위반 시 알람을 발생시킵니다.

## 주요 기능

- **듀얼 UPS 모니터링**: UPS#1(3상 R/S/T, 23개 파라미터) + UPS#2(단상, 9개 파라미터)
- **실시간 SNMP 폴링**: 설정 가능한 간격(기본 5초)으로 데이터 수집
- **임계값 알람**: 파라미터별 min/max 설정, 비정상 시 색상 표시 + WAV 사운드 알람
- **UDP 데이터 전송**: 통합감시 서버로 모니터링 데이터 실시간 전송
- **이벤트 로그**: UPS별 독립 로그 패널 (최대 500줄) + 파일 로깅

## 기술 스택

| 구분 | 기술 |
|------|------|
| 플랫폼 | Electron |
| 언어 | TypeScript |
| 프론트엔드 | React + TailwindCSS |
| 폰트 | Pretendard |
| SNMP | net-snmp (v2c) |
| 빌드 | electron-vite + electron-builder |

## 프로젝트 구조

```
snmpups/
├── src/
│   ├── main/           # Electron Main 프로세스
│   │   ├── index.ts    # 앱 진입점, BrowserWindow
│   │   ├── snmp.ts     # SNMP 폴링 + 값 변환
│   │   ├── udp.ts      # UDP 데이터 전송
│   │   ├── settings.ts # 설정 파일 I/O
│   │   ├── alarm.ts    # 알람 사운드 관리
│   │   ├── threshold.ts# 임계값 체크
│   │   ├── ipc-handlers.ts
│   │   └── logger.ts
│   ├── renderer/       # React UI
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── UpsPanel.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── EventLog.tsx
│   │   │   ├── SettingsDialog.tsx
│   │   │   └── Footer.tsx
│   │   └── hooks/
│   │       └── useSnmpData.ts
│   ├── shared/         # 공유 타입/상수
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   └── ipc-channels.ts
│   └── preload/
│       └── index.ts
├── assets/             # WAV, 아이콘
├── electron-builder.yml
└── electron.vite.config.ts
```

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 프로덕션 빌드 (소스 컴파일)
npm run build

# Windows 배포판 생성 (NSIS 설치파일 + Portable exe)
npx electron-builder --win
```

## 배포판

`dist/` 디렉토리에 생성됩니다:

- **SNMPUPS Setup 2.0.0.exe** - NSIS 설치 프로그램
- **SNMPUPS 2.0.0.exe** - Portable 실행 파일 (설치 불필요)

## 설정 파일

실행 파일과 같은 경로에 JSON 설정 파일이 생성됩니다:

| 파일 | 용도 |
|------|------|
| `settings.json` | UPS#1 SNMP/UDP/임계값 설정 |
| `ups2_settings.json` | UPS#2 SNMP/UDP/임계값 설정 |
| `keepalive_settings.json` | Keepalive 설정 |

## SNMP OID 체계

RFC 1628 UPS-MIB 기반 (베이스 OID: `1.3.6.1.2.1.33`)

| 파라미터 | OID suffix |
|----------|-----------|
| 입력 전압 | `.1.3.3.1.3.x` |
| 입력 전류 | `.1.3.3.1.4.x` |
| 입력 전력 | `.1.3.3.1.5.x` |
| 출력 전압 | `.1.4.4.1.2.x` |
| 출력 전류 | `.1.4.4.1.3.x` |
| 출력 부하율 | `.1.4.4.1.5.x` |
| 배터리 상태 | `.1.2.1.0` |
| 배터리 전압 | `.1.2.5.0` |
| 배터리 잔량 | `.1.2.4.0` |

## 라이선스

Internal use only - 김포 제1레이더 시설 전용

---

Developed by 13615
