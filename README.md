# LinkPortal Launcher

URL 바로가기(.url) 컬렉션 PWA — **재생이 아닌 접속** 런처.
링크를 폴더로 정리하고, 더블클릭으로 대상 사이트를 엽니다.

## 시작

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 프로덕션 빌드 (PWA precache 포함)
npm run preview
```

## 원칙

- **접속 모델** — 미디어 추출 없이 `window.open`으로 대상 사이트를 엶. 인증은 대상 사이트에 위임.
- **로컬 우선** — 데이터는 IndexedDB(Dexie)에 기기별 저장. 빈 시작, 서버 없음.
- **데스크톱 전용 레이아웃** — 폴더 트리 사이드바 + 링크 카드 그리드, **좌·우 독립 스크롤**. 모바일 전용 화면은 제거됨.

## 주요 기능

- **폴더 트리** — 무제한 깊이, ⋯ 메뉴(이동·하위 추가·삭제), 더블클릭 이름 변경. 폴더 이동은 메뉴/모달 전용(드래그 이동 없음)
- **폴더 추가** — 기본 입력값 `🧺 새 폴더`. 같은 부모 아래 중복 시 `🧺 새 폴더 1`, `🧺 새 폴더 2`처럼 자동 카운팅
- **링크 바구니** — 루트 인박스 `🧺 링크 바구니`. 드롭·미분류 링크의 기본 수집처
- **링크 카드** — 메타데이터 자동 수집(auto) / 파비콘 fallback(manual). favicon 로드 실패 시 `🔗` placeholder 표시. YouTube oEmbed 채널명(`authorName`) 표시. 액션 버튼: ×(삭제) · ↗(이동) · ✎(편집)
- **선택·열기** — 카드 클릭은 선택/해제, 카드 더블클릭은 열기(YouTube는 인앱 재생). 빈 공간 드래그로 영역 선택, 선택 카드 일괄 드래그 이동. 바깥 클릭 시 선택 해제
- **YouTube 인앱 재생** — YouTube 링크는 오버레이 플레이어(다음 영상·실패 시 새 탭 fallback)
- **`.url` 드래그 임포트** — 앱 전체(`app-body`) 단일 드롭 오버레이. 빈 DB·미선택 시 `🧺 링크 바구니` 자동 생성
- **링크 이동** — ↗ 버튼, 모달, 또는 트리로 드래그앤드롭(단일·다중)
- **삭제 확인 / 바로 삭제** — 링크 × 버튼·현재 페이지 일괄 삭제는 기본 확인 모달. `바로 삭제` 토글 ON 시 확인 없이 삭제
- **검색·정렬·페이지네이션** — 제목·채널명·URL 검색, 최근 추가순 / 이름순, 페이지당 12개
- **정리 미션·토스트** — 바구니→다른 폴더 이동 시 `정리 완료!`, 바구니 0개 시 `🧺 바구니 클리어`
- **테마** — 🌙 다크 / ☀️ 라이트 / ✨ 네온 / 🅰️ 크림슨(`localStorage`)

## 구조

- **개발 인계:** [`docs/DEVELOPMENT-HANDOFF.md`](docs/DEVELOPMENT-HANDOFF.md) — 구현 과정·결정·미완 항목
- **React Hook 주의:** [`docs/REACT-HOOKS-EARLY-RETURN.md`](docs/REACT-HOOKS-EARLY-RETURN.md) — 조기 return과 Hook 호출 순서 기록
- `src/db` — Dexie IndexedDB 스키마·CRUD·인박스·`moveLinks`/`deleteLinks`
- `src/services` — 메타데이터, URL launch, `.url` 파싱·드롭, `linkDrag`(다중 드래그), `missions`(정리 카운트)
- `src/components` — TreeView, LinkCardList, LinkCard, LinkDropZone, YouTubePlayer, ThemeToggle, Toast, InputModal
- `src/hooks` — `useCategories`, `useLinks`, `useInstantDelete`, `useTheme`, `useToast`
- `src/styles` — `global.css` + `theme.css` (dark / light / neon / crimson)

## 기술 스택

React 19 · TypeScript · Vite 6 · Dexie 4 · vite-plugin-pwa · react-youtube

## 지원 범위

- 데스크톱 전용 UI입니다. 화면 폭이 작아져도 모바일 전용 버블 화면으로 전환하지 않고, 동일한 트리 + 링크 목록 레이아웃을 유지합니다.
