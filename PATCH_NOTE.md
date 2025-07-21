# Patch Note v1.2.0

## 주요 변경 사항

이번 업데이트는 `--prefix` 옵션을 사용할 때 발생하는 상대 경로 계산 문제를 해결하고, 코드의 안정성과 일관성을 개선하는 데 중점을 두었습니다.

### ✨ 주요 개선 사항

- **상대 경로 변환 로직 개선**:
  - `--prefix` 옵션이 적용된 경우, HTML 파일 내의 모든 링크(`<a>`, `<link>`, `<img>`, `<script>`)가 올바른 상대 경로로 변환되도록 `calculateRelativePath` 함수를 수정했습니다.
  - 이제 `path.posix.relative`를 사용하여 운영체제에 상관없이 일관된 상대 경로를 생성합니다.
  
- **Prefix 경로 적용 오류 수정**:
  - `savePage` 및 `saveAsset` 함수에서 `prefix`가 파일 시스템 경로에 올바르게 적용되지 않던 문제를 해결했습니다.

### ♻️ 리팩토링

- 불필요한 `prefix` 인수를 `convertHtmlLinksToRelative` 함수에서 제거하여 코드의 가독성과 유지보수성을 향상시켰습니다. 