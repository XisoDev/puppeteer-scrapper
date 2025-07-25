# Windows 페이징 파일 부족 문제 해결 가이드

## 문제 설명
Windows에서 Chrome 브라우저 실행 시 다음과 같은 오류가 발생하는 경우:
```
이 작업을 완료하기 위한 페이징 파일이 너무 작습니다. (0x5AF)
```

이는 시스템의 가상 메모리(페이징 파일)가 부족해서 발생하는 문제입니다.

## 해결 방법

### 1. 가상 메모리 증가 (권장)

1. **시스템 속성 열기**
   - Windows 키 + R → `sysdm.cpl` 입력 → 확인

2. **고급 탭 → 성능 설정**
   - "고급" 탭 클릭
   - "성능" 섹션에서 "설정" 버튼 클릭

3. **가상 메모리 변경**
   - "고급" 탭 클릭
   - "가상 메모리" 섹션에서 "변경" 버튼 클릭

4. **페이징 파일 크기 설정**
   - "자동으로 모든 드라이버의 페이징 파일 크기 관리" 체크 해제
   - 시스템 드라이브(C:) 선택
   - "사용자 지정 크기" 선택
   - 초기 크기: `4096` MB
   - 최대 크기: `8192` MB (또는 더 큰 값)
   - "설정" 클릭

5. **재부팅**
   - 변경사항을 적용하기 위해 컴퓨터 재부팅

### 2. 임시 해결책

#### A. 다른 드라이브에 페이징 파일 생성
1. 시스템 속성 → 고급 → 성능 설정 → 고급 → 가상 메모리 변경
2. 다른 드라이브(예: D:) 선택
3. 사용자 지정 크기로 설정 (4096-8192 MB)
4. 시스템 드라이브의 페이징 파일은 "페이징 파일 없음"으로 설정

#### B. 시스템 메모리 정리
1. 불필요한 프로그램 종료
2. 작업 관리자에서 메모리 사용량이 높은 프로세스 종료
3. 임시 파일 정리

### 3. 스크래퍼 설정 최적화

현재 코드에서 이미 다음과 같은 최적화가 적용되어 있습니다:

- 메모리 사용량 제한 (`--max_old_space_size=512`)
- 불필요한 리소스 로딩 차단 (이미지, CSS, 폰트)
- 최소한의 브라우저 기능만 사용

### 4. 추가 권장사항

1. **Windows 전용 스크립트 사용**
   ```bash
   npm run start:win -- --headless
   ```

2. **헤드리스 모드 사용**
   ```bash
   npm run start -- --headless
   ```

3. **크롤링 깊이 제한**
   ```bash
   npm run start -- -d 2
   ```

4. **동시 처리 수 제한**
   - Windows에서 자동으로 3개로 제한됨
   - 링크 수집기는 2개로 제한됨

### 5. 시스템 요구사항 확인

- **최소 RAM**: 4GB
- **권장 RAM**: 8GB 이상
- **가상 메모리**: 최소 4GB, 권장 8GB 이상
- **디스크 여유 공간**: 최소 2GB

### 6. 문제가 지속되는 경우

1. **Puppeteer 재설치**
   ```bash
   npm uninstall puppeteer
   npm install puppeteer
   ```

2. **Chrome 브라우저 업데이트**
   - 최신 버전의 Chrome 설치

3. **시스템 업데이트**
   - Windows 업데이트 확인 및 설치

## 참고사항

- 가상 메모리 설정 후 반드시 재부팅이 필요합니다
- 페이징 파일 크기는 물리적 RAM의 1.5-2배를 권장합니다
- SSD 사용 시 페이징 파일 성능이 향상됩니다 