# Puppeteer Scraper

사이트를 크롤링하여 모든 링크를 5뎁스까지 오프라인으로 저장하는 Node.js 기반 스크립트입니다.

## 업데이트 내역

- **2024-06-XX**
  - 중복 링크 방문 방지: Set을 이용해 이미 방문한 URL은 다시 방문하지 않음
  - 해시(#), 쿼리스트링 등 URL 변형도 중복 처리 가능(옵션화 가능)
  - 내부 링크 크롤링 기준을 "같은 도메인"으로 확장 (baseUrl이 디렉토리여도 하위 전체 탐색)
  - 윈도우/맥/리눅스/WSL 환경 모두에서 main 함수가 항상 실행되도록 개선
  - Chrome 실행 경로 자동 감지 및 환경변수(CHROME_PATH) 지원
  - 디버깅을 위한 상세 로그(console.log) 대폭 강화
  - 크롤링 결과물의 상대경로 변환 및 에셋 자동 다운로드

## 기능

- 🔍 **5뎁스까지 크롤링**: 지정된 깊이까지 모든 링크를 탐색
- 💾 **오프라인 저장**: HTML 파일과 메타데이터를 로컬에 저장
- 🎯 **CSR 지원**: 동적 렌더링되는 페이지도 정상 크롤링
- 📊 **크롤링 리포트**: 방문한 모든 URL과 통계 정보 제공
- ⚙️ **CLI 옵션**: URL, 출력 디렉토리, 깊이 등을 커스터마이징 가능

## 설치

```bash
# 의존성 설치
npm install
```

## 사용법

### 기본 사용법
```bash
# 기본 설정으로 amuz.co.kr 크롤링
node scraper.js
```

### CLI 옵션 사용
```bash
# 다른 URL 크롤링
node scraper.js -u https://example.com

# 출력 디렉토리 지정
node scraper.js -o ./my-output

# 깊이 설정
node scraper.js -d 3

# 헤드리스 모드
node scraper.js --headless

# 모든 옵션 조합
node scraper.js -u https://amuz.co.kr -o ./amuz-offline -d 5 --headless
```

### 도움말
```bash
node scraper.js --help
```

## CLI 옵션

| 옵션 | 축약형 | 설명 | 기본값 |
|------|--------|------|--------|
| `--url` | `-u` | 크롤링할 기본 URL | `https://amuz.co.kr` |
| `--output` | `-o` | 출력 디렉토리 | `dist` |
| `--depth` | `-d` | 최대 크롤링 깊이 | `5` |
| `--headless` | - | 헤드리스 모드로 실행 | `false` |
| `--help` | `-h` | 도움말 표시 | - |

## 출력 구조

```
dist/
├── 0_depth/
│   ├── /index.html
│   └── /index.json
├── 1_depth/
│   ├── /about.html
│   ├── /about.json
│   ├── /contact.html
│   └── /contact.json
├── 2_depth/
│   └── ...
└── crawl-report.json
```

- `{depth}_depth/`: 각 깊이별로 분류된 HTML 파일들
- `*.html`: 크롤링된 페이지의 HTML 내용
- `*.json`: 각 페이지의 메타데이터 (URL, 깊이, 저장 시간 등)
- `crawl-report.json`: 전체 크롤링 리포트

## 예시

### amuz.co.kr 크롤링
```bash
node scraper.js -u https://amuz.co.kr -o ./amuz-offline -d 5
```

### 다른 사이트 크롤링
```bash
node scraper.js -u https://example.com -o ./example-offline -d 3 --headless
```

## 주의사항

1. **서버 부하 방지**: 요청 간격을 1초로 설정하여 서버에 과부하를 주지 않습니다.
2. **로봇 정책 준수**: 대상 사이트의 robots.txt를 확인하고 준수하세요.
3. **저장 공간**: 크롤링할 사이트의 크기에 따라 충분한 저장 공간이 필요합니다.
4. **네트워크**: 안정적인 인터넷 연결이 필요합니다.

## 윈도우 사용자 안내

윈도우에서 실행 시 Chrome이 시작되지 않는 경우:

1. **Chrome 설치 확인**: 최신 버전의 Chrome이 설치되어 있는지 확인
2. **관리자 권한**: 명령 프롬프트를 관리자 권한으로 실행
3. **방화벽 설정**: Windows Defender나 다른 보안 프로그램에서 Node.js 허용
4. **대체 실행**: `--headless` 옵션 사용 시도
   ```bash
   node scraper.js --headless
   ```

## 의존성

- `puppeteer`: 브라우저 자동화
- `fs-extra`: 파일 시스템 확장 기능
- `path`: 파일 경로 처리
- `url`: URL 파싱

## 라이선스

MIT License 