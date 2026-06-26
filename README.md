# LinkPortal Launcher

URL 바로가기(.url) 컬렉션 PWA — **재생이 아닌 접속** 런처.
링크를 폴더로 정리하고, 클릭 한 번으로 대상 사이트를 엽니다.

## 시작

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 프로덕션 빌드 (PWA precache 포함)
npm run preview
```

## 원칙

- **접속 모델** — 미디어 추출 없이 `window.open`으로 대상 사이트를 엶. 인증은 대상 사이트에 위임.
- **로컬 우선** — 데이터는 IndexedDB(Dexie)에 기기별 저장. 빈 시작(더미 없음), 서버 없음.
- **반응형 레이아웃**
  - 웹(768px+): 폴더 트리 사이드바 + 링크 카드 그리드, **좌·우 독립 스크롤** (트리 목록 / 링크 영역 각각)
  - 모바일: 방사형 버블 + drill-down

## 주요 기능

- **폴더 트리** — 무제한 깊이, ⋯ 메뉴(이동·하위 추가·삭제), 더블클릭 이름 변경
- **링크 카드** — 메타데이터 자동 수집(auto) / 파비콘 fallback(manual)
- **YouTube 인앱 재생** — YouTube 링크는 새 탭 대신 오버레이 플레이어로 재생(다음 영상·실패 시 새 탭 fallback)
- **`.url` 드래그 임포트** — 바탕화면 `.url` 파일을 끌어다 놓으면 등록, 빈 화면 드롭 시 `미분류` 폴더 자동 생성
- **링크 이동** — 카드의 ↗ 버튼 또는 폴더로 드래그앤드롭
- **정렬·페이지네이션** — 최신순/오래된순/이름순, 페이지당 12개
- **테마 전환** — 🌙 다크 / ☀️ 라이트 / ✨ 네온 순환, `localStorage` 저장 (웹 헤더·모바일 우상단 토글)

## 구조

- **개발 인계:** [`docs/DEVELOPMENT-HANDOFF.md`](docs/DEVELOPMENT-HANDOFF.md) — 구현 과정·결정·미완 항목
- `src/db` — Dexie IndexedDB 스키마·CRUD
- `src/services` — 메타데이터 수집, URL launch, `.url` 파싱·드롭 임포트
- `src/components` — TreeView·LinkCardList·LinkCard(웹), RadialBubbleView(모바일), YouTubePlayer, ThemeToggle, InputModal
- `src/hooks` — `useCategories`, `useLinks`, `useMediaQuery`, `useTheme`
- `src/styles` — `global.css` + `theme.css` (dark / light / neon, `main.tsx`에서 global 뒤에 로드)

## 기술 스택

React 19 · TypeScript · Vite 6 · Dexie 4 · vite-plugin-pwa · react-youtube
