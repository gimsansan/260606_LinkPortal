# 링크함 — 개발 인계 문서

> URL 바로가기(.url) 컬렉션 PWA. 원본 기획은 `project-skeleton.md`(외부 인계 문서)를 참고.
> 이 문서는 **현재 코드베이스까지의 구현 과정·결정·미완 항목**을 개발자에게 넘기기 위한 기록이다.
>
> **표시명 vs 내부명**
> - **사용자에게 보이는 이름:** **링크함** — `index.html` `<title>`, PWA manifest(`vite.config.ts`), 헤더 로고(`App.tsx`)
> - **내부 식별자(변경하지 않음):** IndexedDB `LinkPortal-launcher`, 백업 JSON `app: 'LinkPortal'`, npm 패키지 `LinkPortal-launcher`, localStorage·드래그 타입 등 `linkportal-*` 키
>
> **용어 메모:** 내부 코드·DB는 여전히 `category`(카테고리)지만, **UI 표시 텍스트는 "폴더"** 로 통일됨. 이 문서는 코드 기준으로 `카테고리`를 사용한다.

---

## 1. 제품 컨셉과 최우선 원칙

| 원칙 | 구현 |
|------|------|
| **재생이 아닌 접속** | 미디어 추출 없음. `launchUrl()` → `window.open` (단, **YouTube는 인앱 오버레이 재생** — §3 Phase 7) |
| **인증은 대상 사이트에 위임** | iframe 로그인·자격증명 저장 없음 |
| **로컬 PWA** | IndexedDB(Dexie), 기기별 데이터. **JSON 백업·복원** (헤더 ⬇⬆) |
| **구조 커스터마이징** | 카테고리 트리 생성·이름변경·이동(메뉴)·삭제, 링크 편집·이동(버튼 + **드래그앤드롭**) |
| **외형 커스터마이징** | **3테마** (dark / light / neon). 테마 선택은 `linkportal-theme`에 저장 |
| **데스크톱 전용** | 모바일 전용 Radial Bubble 화면 제거. 화면 폭이 좁아져도 `TreeView + LinkCardList` 유지 |

---

## 2. 기술 스택

- **React 19** + **TypeScript** + **Vite 6**
- **Dexie 4** (IndexedDB)
- **vite-plugin-pwa** (manifest, service worker)
- **react-youtube** (YouTube IFrame 인앱 플레이어)
- 스타일: `src/styles/global.css` + `src/styles/theme.css` + `components/link-list-panel.css`, `components/drag-interactions.css`, `components/YouTubePlayer.css`

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

PWA 아이콘 재생성: `scripts/generate-pwa-icons.ps1` → `public/pwa-192.png`, `public/pwa-512.png`

---

## 3. 구현 타임라인 (작업 순서)

### Phase 0 — 프로젝트 뼈대

- Vite + React + TS + PWA 설정
- 데이터 모델: `Category`(무제한 깊이 트리), `LinkItem`(auto/manual 카드)
- Dexie DB 이름: `LinkPortal-launcher` (stores: `categories`, `links`)
- 현재는 데스크톱 전용. 과거 플랫폼 분기(`useIsDesktop`, `RadialBubbleView`)는 제거됨

### Phase 1 — 화면 구조

| 범위 | 네비게이션 | 링크 표시 |
|------|------------|-----------|
| **데스크톱 전용** | `TreeView` 사이드바 (좌 스크롤) | `LinkCardList` 그리드 (우 스크롤) |

- 화면 폭이 좁아져도 모바일 전용 화면으로 전환하지 않음

### Phase 2 — 링크·메타데이터

- **YouTube**: oEmbed + `hqdefault.jpg` 썸네일
- **YouTube 채널명**: oEmbed `author_name` → `LinkMetadata.authorName` → `LinkItem.authorName` → 카드에 표시
- **일반 URL**: OG fetch → CORS 실패 시 hostname + favicon fallback (**의도된 동작**)
- **auto/manual** 구분: 썸네일·점선 테두리 (텍스트 배지 없음)
- `src/services/url.ts` — `launchUrl`, `getFaviconUrl`, YouTube ID 추출

### Phase 3 — 드래그 임포트 (.url)

- `urlFile.ts`, `dropImport.ts`, `LinkDropZone`
- **Phase 13**에서 앱 전체 단일 드롭존으로 통합 (`App.tsx` → `link-drop-zone--app`)

### Phase 4 — 품질·스켈레톤

- `seedIfEmpty()` 빈 함수, sortOrder, 카테고리·링크 CRUD 모달

### Phase 5 — 인박스 + 빈 화면 드롭

- **Phase 13**에서 인박스 명칭 **`🧺 링크 바구니`** 로 확정 (`INBOX_TITLE`). 레거시 `미분류`, `📌 나중에 정리` 자동 마이그레이션
- `getOrCreateInboxCategory()` — 드롭·미분류 링크 수집

### Phase 6 — UI 미세 조정

- 트리 행 ⋯ 메뉴, 카드 액션 버튼 레이아웃(× 좌 · ↗ 중 · ✎ 우)

### Phase 7 — YouTube 인앱 재생

- `YouTubePlayer.tsx` — 오버레이, 다음 영상, 실패 시 새 탭 fallback

### Phase 8 — 링크 드래그앤드롭

- dataTransfer: **`application/linkportal-link`** (`services/linkDrag.ts`)
- 트리 노드 드롭 → `moveLink` / `moveLinks`
- ~~`DragTrashZone` 휴지통 드래그 삭제~~ → **제거됨**. 삭제는 × 버튼 + 확인 모달

### Phase 9 — 링크 목록 정렬·페이지네이션

- 정렬: **최근 추가순** / **이름순** 만 (`SortKey`: `newest` | `title`). ~~오래된순~~ 제거
- 페이지당 12개, `link-list-panel.css`

### Phase 10 — UI 문구·용어

- UI **"폴더"** 통일, 인스턴스 별명 기능 제거

### Phase 11 — 테마 (dark / light / neon)

- `useTheme.ts`, `ThemeToggle`, `theme.css`
- 현재 `useTheme.ts`는 `dark → light → neon` 순환

### Phase 12 — 데스크톱 2-pane 스크롤 + 트리 ⋯ 메뉴

- 좌 `.tree-view__list` / 우 `.app-main` 독립 스크롤
- ⋯: ↗ 이동 · 📁 하위 · ❌ 삭제. **폴더 드래그 이동은 의도적으로 미구현** (실수 비용·복잡도)

### Phase 13 — UX 정리 (2026-06 후반)

1. **통합 드롭존** — `LinkDropZone`을 `App.tsx` `app-body` 한 겹으로. TreeView·LinkCardList 등 개별 래퍼 제거
2. **인박스 리네임** — `🧺 링크 바구니`, 레거시 제목 DB 마이그레이션
3. **삭제 확인** — 링크 × → `confirm-delete-link`. 툴바 **현재 페이지 삭제** → `confirm-delete-page-links` + `deleteLinks()`
4. **데스크톱 시작 UX** — 폴더 있으면 인박스(없으면 첫 루트) **자동 선택**. 빈 안내 문구 `translateX` 클리pping 제거
5. **폴더 추가 기본값** — `DEFAULT_NEW_FOLDER_TITLE = '🧺 새 폴더'` (편집 가능)
6. **라이트 모드** — `link-list-panel.css` 하드코딩 색 → CSS 변수

### Phase 14 — 다중 선택·정리 미션 (2026-06)

1. **다중 선택** (`LinkCardList.tsx`)
   - `link-list__select-area`에서 마quee(영역 드래그) 선택
   - 카드 위 pointerdown은 마quee 시작에서 제외. 카드 클릭은 선택/해제, 더블클릭은 열기
   - **바깥 클릭** 선택 해제: select-area 빈 곳, 툴바·페이지네이션, 트리·헤더(document listener)
   - 그리드 gap 24px, select-area padding·하단 여백 확대
2. **일괄 이동** — `moveLinks()`, `linkDrag.ts` payload `{ ids[], categoryId }`
3. **정리 미션·토스트** (`services/missions.ts`, `hooks/useToast.ts`, `components/Toast.tsx`)
   - 바구니 → 다른 폴더 이동: `정리 완료!` (1초)
   - 이동 후 바구니 0개: `🧺 바구니 클리어`
   - localStorage: `linkportal-organize-count`
4. ~~헤더 `BasketStatus` 숫자 pop~~ → **제거** (토스트 방식으로 대체)

### Phase 15 — 데스크톱 전용 단순화·삭제 UX (2026-06)

1. **모바일 전용 UI 제거**
   - `RadialBubbleView.tsx`, `useMediaQuery.ts` 삭제
   - `App.tsx`의 `isDesktop`, `screen`, `goBack`, `drillDown` 분기 제거
   - 항상 `TreeView + LinkCardList` 렌더링
   - Radial Bubble / 모바일 테마 토글 CSS 제거
2. **링크 열기 방식 변경**
   - `LinkCard`: 클릭 = 선택/해제, 더블클릭 = 열기
   - Enter 키는 기존처럼 열기
3. **삭제 UX**
   - `useInstantDelete.ts`: `linkportal-instant-delete` 저장
   - 기본값 OFF → 확인 모달
   - ON → 링크 × / 현재 페이지 삭제를 모달 없이 즉시 실행
   - 툴바의 선택 항목 🗑 버튼은 제거됨
4. **라이트 테마 폴더 색**
   - 라이트 테마 폴더 아이콘 색을 진한 파랑(`#2563eb`)에서 기본 빈 폴더 계열(`#7eb8e8`)로 변경

### Phase 16 — 검색·fallback·폴더명 카운팅 (2026-06)

1. **링크 검색** (`LinkCardList.tsx`)
   - 검색 input 추가: 제목 · 채널명(`authorName`) · URL 대상
   - 정렬 결과(`sorted`) 이후 `filteredLinks`를 만들고, 페이지네이션은 검색 결과 기준으로 계산
   - 검색어 변경 시 `setPage(0)`, UI와 slice 모두 `safePage` 기준
   - 검색 결과 0개 시 `검색 결과가 없습니다.` 표시
2. **favicon 로드 실패 fallback** (`LinkCard.tsx`)
   - `faviconUrl` 값은 있지만 실제 이미지 로드가 실패하면 브라우저 깨진 이미지 대신 `🔗` placeholder 표시
   - 링크의 favicon URL이 바뀌면 실패 상태 초기화
3. **폴더 추가 기본명 카운팅** (`db/index.ts`, `App.tsx`)
   - 같은 부모 아래 형제 폴더 기준으로 `🧺 새 폴더`, `🧺 새 폴더 1`, `🧺 새 폴더 2` 순서 자동 제안
   - 생성 시에도 기본 폴더명 패턴 중복이면 사용 가능한 다음 번호로 저장
   - 기존 중복 폴더명은 자동 정리하지 않음
4. **Hook 조기 return 문제 기록**
   - `nextDefaultFolderTitle`의 `useMemo`를 `if (!ready) return ...` 위로 이동
   - 관련 메모: `docs/REACT-HOOKS-EARLY-RETURN.md`

### Phase 17 — JSON 백업·복원 (2026-06)

1. **DB 계층** (`db/index.ts`)
   - `exportData()` — categories + links 전체를 `BackupPayload` JSON으로 반환
   - `importData(payload, mode)` — `merge`(기본, 같은 id 덮어쓰기) / `replace`(전체 교체)
   - `payload.app === 'LinkPortal'` 검증, Dexie 트랜잭션 + `bulkPut`
2. **서비스 계층** (`services/backup.ts`)
   - `downloadBackup()` — Blob + `<a download>`로 `linkportal-backup-YYYY-MM-DD.json` 저장
   - `readBackupFile(file, mode)` — File → JSON parse → `importData` 위임
3. **UI** (`App.tsx`, `global.css`)
   - 헤더 `.app-header__actions`: ⬇ 내보내기 · ⬆ 가져오기(숨은 file input) · `ThemeToggle`
   - 토스트: `백업을 내보냈어요` / `가져오기 완료` / `가져오기 실패 — 파일 확인`

### Phase 18 — 표시명·내비게이션 UX (2026-06)

1. **앱 표시명 → 링크함**
   - `App.tsx` 헤더 로고 버튼 텍스트
   - `index.html` `<title>`, `vite.config.ts` PWA `name` / `short_name`
   - **내부 DB명·백업 `app` 필드·npm 패키지명은 `LinkPortal*` 유지** (기존 데이터·백업 호환)
2. **로고 클릭 = 홈** (`App.tsx` `handleGoHome`)
   - `🧺 링크 바구니`(없으면 첫 루트)로 이동
   - 전역 검색(`useGlobalSearch`) 초기화·검색 UI 닫기
   - YouTube 오버레이 닫기
3. **검색 역할 분리**
   - **전역 검색** — 헤더 🔍, 모든 링크 + 폴더 경로. 결과 클릭 시 해당 폴더 이동
   - **폴더 검색** — `LinkCardList` 툴바, 현재 폴더만. **`categoryTitle` 변경 시 `query` 자동 초기화**

### Phase 19 — YouTube 랜덤 재생 (2026-06)

1. **셔플 유틸** (`src/utils/shuffle.ts`)
   - Fisher–Yates `shuffleArray<T>()` — 원본 배열 불변
2. **재생 플레이리스트** (`App.tsx`)
   - `youtubePlaylist`: 현재 폴더 YouTube 링크, `createdAt` **내림차순** (재생 기본 순서)
   - `isShuffled`, `shuffledPlaylist`, `activePlaylist` — OFF면 원본, ON이면 셔플본을 `YouTubePlayer`에 전달
   - **`activeCategoryId` 변경 시** `isShuffled`·`shuffledPlaylist` 리셋
3. **동작 규칙**
   - **OFF → ON**: 매번 새로 섞음. 재생 중이면 `playingLink`를 0번에 고정하고 나머지만 섞음 (Spotify 패턴)
   - **ON → OFF**: `youtubePlaylist` 원본 순서로 다음 곡 계산
   - **전체 재생 + ON**: 전체 셔플 후 첫 곡 재생
   - **전체 재생 + OFF**: `youtubePlaylist[0]` (최근 추가순 첫 곡)
4. **UI** (`LinkCardList.tsx`, `link-list-panel.css`)
   - 툴바 **랜덤 재생** 토글 (자동 넘김 옆). `autoAdvance`와 동일한 스위치 스타일
   - **목록 정렬**(최근 추가순 / 이름순)과 **재생 순서**는 분리 — 이름순은 `title` `localeCompare('ko')` **표시 전용**

---

## 4. 디렉터리·파일 맵

```
src/
  App.tsx                 # 데스크톱 전용 레이아웃, 상태·모달·드롭존·정리 미션·토스트·백업·홈(로고)·전역 검색
  main.tsx
  types/index.ts
  db/index.ts             # CRUD, INBOX_TITLE, authorName 저장, moveLinks, deleteLinks, exportData/importData, 기본 폴더명 카운팅
  services/
    url.ts, metadata.ts, urlFile.ts, dropImport.ts
    linkDrag.ts           # LINK_DRAG_TYPE, parse/build payload (다중)
    missions.ts           # 정리 카운트
    backup.ts             # downloadBackup, readBackupFile
  utils/
    shuffle.ts            # Fisher–Yates (YouTube 랜덤 재생)
  hooks/
    useCategories.ts, useLinks.ts
    useGlobalSearch.ts    # 헤더 전역 링크 검색
    useAutoAdvance.ts     # YouTube 연속 재생
    useTheme.ts           # dark/light/neon 순환
    useToast.ts           # 토스트 큐
  components/
    TreeView.tsx          # 트리 + 링크 드롭 타겟 (폴더 드래그 없음)
    LinkCardList.tsx      # 그리드, 폴더 검색·정렬·페이지, 마quee 다중 선택, 랜덤 재생 토글
    LinkCard.tsx          # 클릭 선택, 더블클릭 열기, draggable, selected 상태, favicon fallback
    LinkDropZone.tsx      # .url/URL 드롭 오버레이
    EmptyDropPanel.tsx
    YouTubePlayer.tsx
    ThemeToggle.tsx
    Toast.tsx
    InputModal.tsx
    link-list-panel.css, drag-interactions.css
  styles/
    global.css, theme.css
public/
  favicon.svg, pwa-192.png, pwa-512.png
scripts/
  generate-pwa-icons.ps1
docs/
  REACT-HOOKS-EARLY-RETURN.md
```

**삭제된 파일:** `DragTrashZone.tsx`, `BasketStatus.tsx`, `RadialBubbleView.tsx`, `hooks/useMediaQuery.ts`

**인계 시 우선 읽을 파일:** `App.tsx` → `db/index.ts` → `LinkCardList.tsx` / `linkDrag.ts` → `TreeView.tsx`

---

## 5. 데이터 모델

### Category

```ts
id, parentId (null = 루트), title, sortOrder, createdAt, updatedAt
```

### LinkItem

```ts
id, categoryId, url, title, imageUrl?, faviconUrl?, authorName?, source: 'auto' | 'manual', createdAt, updatedAt
```

### 인박스

- `INBOX_TITLE = '🧺 링크 바구니'`
- `DEFAULT_NEW_FOLDER_TITLE = '🧺 새 폴더'` (일반 폴더 추가 모달 기본값)
- 기본 폴더명 카운팅: 같은 부모 아래에서 `🧺 새 폴더`가 이미 있으면 `🧺 새 폴더 1`, 이후 `🧺 새 폴더 2`처럼 사용 가능한 번호 제안
- 레거시: `미분류`, `📌 나중에 정리` → 첫 조회 시 `🧺 링크 바구니`로 rename
- `getOrCreateInboxCategory()` — 없으면 루트에 생성

### sortOrder 규칙

- 추가: `max(형제 sortOrder) + 1`
- 삭제: 해당 부모 형제 `0..n-1` 재정렬
- `moveCategory`: 순환 방지, 이전 부모 renormalize

### BackupPayload (`exportData` / `importData`)

```ts
{
  app: 'LinkPortal',
  version: 1,
  exportedAt: number,
  categories: Category[],
  links: LinkItem[],
}
```

- **merge**(기본): `bulkPut` — 같은 `id`는 덮어쓰기, 백업에 없는 기존 레코드는 유지
- **replace**: `clear()` 후 백업으로 전면 교체
- 잘못된 JSON(`{}`, `[]`, 깨진 텍스트 등)은 검증/`JSON.parse` 단계에서 거부

---

## 6. 주요 사용자 플로우

### 링크 추가

1. **+** 모달 → URL (수제 카드 옵션)
2. **드롭** — 앱 어디든 (`LinkDropZone--app`)
3. 카테고리 없/미선택 → **🧺 링크 바구니** 생성·등록

### 링크 카드

- 클릭: 선택/해제
- 더블클릭: YouTube → 인앱 / 그 외 → `launchUrl`
- **×** 삭제(즉시 실행, 토스트 **되돌리기**로 복구) · **↗** 이동 · **✎** 편집
- **드래그**: 트리 폴더에 드롭 → 이동 (다중 선택 시 일괄)
- **다중 선택**: 빈 공간 영역 드래그 · 카드 클릭 토글 · 바깥 클릭 해제
- **검색**
  - **전역**(헤더 🔍): 모든 폴더 링크, 폴더 경로 표시. 로고(홈) 클릭 시 초기화
  - **폴더**(`LinkCardList`): 현재 폴더만. 폴더 이동 시 검색어 자동 초기화
- **favicon fallback**: 외부 사이트 `/favicon.ico` 로드 실패 시 `🔗` placeholder 표시

### YouTube 재생

- **플레이리스트** (`App.tsx` `youtubePlaylist`): 현재 폴더 embeddable YouTube, `createdAt` 내림차순
- **다음 곡** (`YouTubePlayer.tsx`): `playlist`에서 `link.id` 기준 `findIndex` + 1. `onPlayLink`로 전환
- **자동 넘김** (`useAutoAdvance`, `linkportal-auto-advance` localStorage)
- **랜덤 재생** (`App.tsx` `handleShuffleChange`, `handlePlayAll`)
  - OFF: `youtubePlaylist` 원본
  - ON: `shuffledPlaylist` → `activePlaylist`로 플레이어에 전달
  - 폴더(`activeCategoryId`) 변경 시 OFF 리셋
  - 셔플 상태는 **세션만** (localStorage 미사용)

### 정리 미션

- **대상**: `🧺 링크 바구니` → 다른 폴더로 이동할 때만 카운트
- **토스트**: `정리 완료!` → (바구니 0이면) `바구니 클리어`
- 테마 전환은 `dark → light → neon` 순환

### 백업·복원

- **⬇ 내보내기** — `linkportal-backup-YYYY-MM-DD.json` (들여쓰기 JSON, `BackupPayload`)
- **⬆ 가져오기** — 숨은 file input, 기본 **merge**. 복원 후 `refreshAll()`로 화면 갱신
- merge는 같은 `id`만 덮어씀. 백업 이후 새로 만든 폴더(id 다름)는 그대로 남음
- 동일 백업을 두 번 올려도 id 중복 덮어쓰기라 레코드 수는 늘지 않음

### 데스크톱 시작

- `navStack` 비어 있고 폴더 있으면 → 인박스 또는 첫 루트 **자동 선택**
- **헤더 로고(링크함) 클릭** → 인박스(홈) + 전역 검색·플레이어 초기화
- 폴더 0개 → `EmptyDropPanel` 안내
- 모바일 전용 화면 없음. 좁은 웹뷰에서도 같은 2-pane 레이아웃 유지

### 카테고리

- **+** : 기본 `🧺 새 폴더`; 같은 부모에 기본명이 이미 있으면 `🧺 새 폴더 1`, `🧺 새 폴더 2` 순서
- **⋯** : ↗ 이동 · 📁 하위 · ❌ 삭제 (드래그 이동 **없음**)
- 더블클릭 → 이름 변경

---

## 7. 모달 상태 (`App.tsx` `ModalState`)

| type | 용도 |
|------|------|
| `add-category` | 폴더 추가 (기본 `🧺 새 폴더`) |
| `edit-category` | 이름 변경 |
| `move-category` | 폴더 상위 이동 |
| `confirm-delete-category` | 폴더 삭제 확인 |
| `add-link` | 링크 추가 |
| `edit-link` | URL·제목 편집 |
| `move-link` | 링크 폴더 이동 |

(링크 삭제는 모달 없이 즉시 실행 + 토스트 되돌리기. 폴더 삭제만 `confirm-delete-category`.)

---

## 8. 의도적으로 하지 않은 것

| 항목 | 사유 |
|------|------|
| **폴더 드래그 이동** | 실수 시 하위 전체 이동, 트리 DnD UX 복잡. ⋯ → 이동으로 충분 |
| **휴지통 드래그 삭제** | 제거. × + 확인 모달로 대체 |
| **헤더 바구니 카운터 pop** | 제거. 토스트 미션으로 대체 |
| **OG 프록시** | 로컬 PWA 정체성 |
| **모바일 전용 UI** | 앱 전제를 데스크톱 전용으로 확정. Radial Bubble 제거 |
| **임의 색상 테마 편집** | 3프리셋만 |
| **항상 보이는 스크롤바 UI** | 기능만 적용, thumb CSS 미완 |

---

## 9. 운영·디버깅 메모

### IndexedDB

- DB: `LinkPortal-launcher`
- seed 제거 ≠ 기존 데이터 삭제 → DevTools에서 삭제

### Local Storage (본 앱)

| 키 | 값 |
|----|-----|
| `linkportal-theme` | `dark` \| `light` \| `neon` |
| `linkportal-organize-count` | 바구니→폴더 이동 누적 수 |
| `linkportal-auto-advance` | YouTube 연속 재생 ON/OFF |

### 드래그 payload (`linkDrag.ts`)

```json
{ "ids": ["..."], "categoryId": "..." }
```

단일 호환: `{ "id", "categoryId" }`

### React Hook 조기 return

- Hook은 `if (!ready) return ...` 같은 조기 return보다 위에서 호출해야 한다
- 이번 이슈 기록: `docs/REACT-HOOKS-EARLY-RETURN.md`

---

## 10. 초기 화면 (현재)

- 빈 DB: 좌 트리 안내, 우 빈 패널
- 폴더만 있고 링크 없음: **자동 선택** 후 빈 링크 목록
- 첫 `.url` 드롭 → **🧺 링크 바구니** 생성·표시

---

## 11. 다음 작업 후보

1. **데스크톱 스크롤바 track/thumb 시각화**
2. 링크 편집 URL 변경 → 메타 재수집 옵션
3. 기존 YouTube 링크 authorName 백필/재수집 도구
4. OG 프록시 (별도 서비스)
5. 좁은 웹뷰 최소 폭/가로 스크롤 정책
6. `App.tsx` 훅/모듈 분리

> **완료된 이전 후보:** YouTube 인앱, 링크 DnD, 정렬·페이지네이션, 링크 검색, 3테마, 2-pane 스크롤, 트리 ⋯, 통합 드롭존, 다중 선택, 삭제·되돌리기 토스트, 정리 미션·토스트, 인박스 리네임, 폴더 추가 기본 emoji, 폴더명 카운팅, favicon 실패 fallback, 데스크톱 전용 단순화, YouTube 채널명 표시, JSON 백업·복원, 표시명 링크함, 로고 홈·검색 UX, **YouTube 랜덤 재생**

---

*문서 작성 기준: 저장소 `2606_LinkPortal` / **앱 표시명 링크함** / 내부 DB·패키지 `LinkPortal-launcher`*
