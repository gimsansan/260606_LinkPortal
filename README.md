# LinkPortal Launcher

URL 바로가기(.url) 컬렉션 PWA — **재생이 아닌 접속** 런처.

## 시작

```bash
npm install
npm run dev
```

## 원칙

- 인증은 대상 사이트에 위임 (열기 모델)
- 데이터는 IndexedDB 로컬 저장 (빈 시작, 더미 없음)
- 모바일: 방사형 버블 + drill-down
- 웹(768px+): 트리 사이드바 + 링크 카드
- 빈 화면 드롭 → `미분류` 인박스 자동 생성 · 링크 ↗로 카테고리 이동

## 구조

- **개발 인계:** [`docs/DEVELOPMENT-HANDOFF.md`](docs/DEVELOPMENT-HANDOFF.md) — 구현 과정·결정·미완 항목
- `src/db` — Dexie IndexedDB
- `src/services` — 메타데이터 수집, URL launch, `.url` 파싱·드롭 임포트
- `src/components` — TreeView, LinkCard (웹) / RadialBubbleView (모바일)
