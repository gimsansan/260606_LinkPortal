# LinkPortal Launcher — 개발 인계 문서

> URL 바로가기(.url) 컬렉션 PWA. 원본 기획은 `project-skeleton.md`(외부 인계 문서)를 참고.
> 이 문서는 **현재 코드베이스까지의 구현 과정·결정·미완 항목**을 개발자에게 넘기기 위한 기록이다.
>
> **용어 메모:** 내부 코드·DB는 여전히 `category`(카테고리)지만, **UI 표시 텍스트는 "폴더"** 로 통일됨. 이 문서는 코드 기준으로 `카테고리`를 사용한다.

---

## 1. 제품 컨셉과 최우선 원칙

| 원칙 | 구현 |
|------|------|
| **재생이 아닌 접속** | 미디어 추출 없음. `launchUrl()` → `window.open` (단, **YouTube는 인앱 오버레이 재생** — §3 Phase 7) |
| **인증은 대상 사이트에 위임** | iframe 로그인·자격증명 저장 없음 |
| **로컬 PWA** | IndexedDB(Dexie), 기기별 데이터 |
| **구조 커스터마이징** | 카테고리 트리 생성·이름변경·이동·삭제, 링크 편집·이동(버튼 + **드래그앤드롭**) |
| **외형 커스터마이징** | **3테마** (dark / light / neon) — 헤더·모바일 토글, `localStorage`(`linkportal-theme`) 저장 (§3 Phase 11) |

---

## 2. 기술 스택

- **React 19** + **TypeScript** + **Vite 6**
- **Dexie 4** (IndexedDB)
- **vite-plugin-pwa** (manifest, service worker)
- **react-youtube** (YouTube IFrame 인앱 플레이어)
- 스타일: `src/styles/global.css`(CSS 변수, BEM 유사) + `src/styles/theme.css`(테마 팔레트·오버라이드, **global.css 뒤에** `main.tsx`에서 import) + 기능별 컴포넌트 CSS
  (`components/YouTubePlayer.css`, `components/link-list-panel.css`, `components/drag-interactions.css`)

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
- 플랫폼 분기: `useIsDesktop()` — **768px** 이상 = 웹, 미만 = 모바일

### Phase 1 — 화면 구조

| 플랫폼 | 네비게이션 | 링크 표시 |
|--------|------------|-----------|
| **웹 (≥768px)** | `TreeView` 사이드바 (좌 스크롤) | `LinkCardList` 그리드 (우 스크롤) |
| **모바일** | `RadialBubbleView` 방사형 + drill-down | 링크 화면에서 `LinkCardList` |

- 초기에는 웹에 방사형/트리 **토글**이 있었음 → **웹은 트리 전용**으로 정리 (토글·dead CSS 제거)

### Phase 2 — 링크·메타데이터

- **YouTube**: oEmbed + `hqdefault.jpg` 썸네일
- **일반 URL**: OG 태그 직접 fetch 시도 → CORS 실패 시 hostname + favicon fallback (**의도된 동작**)
- **auto 카드**: `imageUrl` 있음 / **manual 카드**: 파비콘·점선 테두리 (※ "수제/직접 추가" 텍스트 배지는 이후 제거됨 — §3 Phase 10)
- **열기 모델**: `src/services/url.ts` — `launchUrl`, `getFaviconUrl`, YouTube ID 추출

### Phase 3 — 드래그 임포트 (.url)

- `src/services/urlFile.ts` — INI `URL=` 파싱, 파일명(`.url` 제거) = 제목
- `src/services/dropImport.ts` — `files(.url)` → `text/uri-list` → `text/plain` 순 처리
- `LinkDropZone` + `LinkCardList` 드롭존 (카테고리 선택 시)

### Phase 4 — 품질·스켈레톤 완성 (우선순위 묶음)

1. **seed 더미 제거** — `seedIfEmpty()` 빈 함수, 첫 화면 빈 DB
2. **manual 경로 favicon** — `getFaviconUrl(url)` 적용
3. **PWA 아이콘** — `public/pwa-192.png`, `pwa-512.png` 추가
4. **카테고리 편집** — 이름변경(✎), 이동(↗), 삭제(×, 확인 모달)
5. **링크 편집** — URL·제목 직접 입력 (`EditLinkModal`), 메타 재수집 없음
6. **sortOrder** — `nextSortOrder`, 삭제 후 `renormalizeSiblingSortOrder`; `TreeView`에서 형제 `sortOrder` 정렬
7. **`.url` 메타** — `titleOverride` 시에도 `fetchLinkMetadata` 호출 (제목만 파일명, 썸네일 유지)

### Phase 5 — 인박스 + 빈 화면 드롭

- 카테고리 미선택 시 드롭 → `getOrCreateInboxCategory()` 로 루트 **`미분류`** 자동 생성
- 드롭존 확장: `TreeView` 사이드바, `EmptyDropPanel`(메인 빈 영역), `RadialBubbleView`(모바일)
- **링크 분류**: 카드 **↗** → `MoveLinkModal` → `moveLink()` 로 `categoryId` 변경

### Phase 6 — UI 미세 조정

- 트리 행 액션 아이콘(✎ ↗ + ×) 크기 32px

### Phase 7 — YouTube 인앱 재생

- `react-youtube` 추가 (**의존성 변경 → rebuild 필요했음**)
- `components/YouTubePlayer.tsx` + `YouTubePlayer.css` — 오버레이 모달 플레이어
- 동작: YouTube 링크 카드 클릭 → 새 탭 대신 인앱 재생. **종료 시 "다음 영상"**(같은 폴더의 YouTube 링크 순서), **재생 실패(비공개/연령제한) 시 새 탭 fallback**
- `App.tsx`: `playingLink` 상태 + `youtubePlaylist`(현재 폴더 YouTube 링크 필터) + `handlePlayVideo`
- 비-YouTube 링크는 기존대로 `launchUrl` (접속 모델 유지)

### Phase 8 — 링크 드래그앤드롭

- 카드 `draggable`, dataTransfer 타입 **`application/linkportal-link`** (`LinkCard.tsx`)
- **폴더로 이동**: 트리 노드에 드롭 → `TreeView` `onLinkDrop` → `App.handleTreeLinkDrop` → `moveLink()`
- **삭제(휴지통)**: 드래그 중 표시되는 `components/DragTrashZone.tsx`에 드롭 → `handleTrashDrop` → `deleteLink()`
- `App.tsx`: `draggingLink` 상태로 휴지통 표시 토글, `drag-interactions.css`

### Phase 9 — 링크 목록 정렬·페이지네이션

- `LinkCardList.tsx`: 정렬 **최신순/오래된순/이름순**(`SortKey`), 페이지당 **12개**(`PAGE_SIZE`), 항목 수 표시
- `link-list-panel.css` 분리

### Phase 10 — UI 문구·용어 정리

- 표시 용어 **"카테고리" → "폴더"** 통일 (코드 식별자는 유지)
- 링크 카드의 **"수제"/"직접 추가" 텍스트 배지 제거** (manual은 파비콘·점선 테두리로만 구분)
- 빈 화면/빈 목록 안내 문구 친화적으로 변경 + 영역 중앙 배치(CSS)
- **인스턴스(브라우저) 별명 기능**: localStorage 기반으로 추가했다가 **이후 전량 제거** (관련 코드·CSS 삭제 완료)

### Phase 11 — 테마 시스템 (dark / light / neon)

- `hooks/useTheme.ts` — `document.documentElement`에 `data-theme` 설정, `localStorage` 키 `linkportal-theme`, 클릭마다 dark → light → neon 순환
- `components/ThemeToggle.tsx` — 🌙 / ☀️ / ✨ 아이콘 버튼
- `styles/theme.css` — 테마별 CSS 변수 + 기존 `global.css` 하드코딩 색 덮어쓰기
- `App.tsx`: 웹 헤더 우측·모바일 `.app-mobile-theme`(우상단 fixed)에 토글 배치
- **네온**: 보라/시안/마젠타 팔레트 + `global.css` 레거시 변수(`--bg`, `--text` 등) 재정의, TreeView·Bubble·카드 글로우
- **라이트**: 레거시 변수 재정의 + TreeView/`+` 버튼 가독성 보정 (흰 배경 위 진한 텍스트·밝은 버튼 배경)
- **주의**: `global.css`에 `--text` 등 레거시 변수를 쓰는 선택자는 테마별로 `theme.css`에서 반드시 매핑해야 함. 미매핑 시 라이트에서 텍스트·버튼이 안 보일 수 있음.

### Phase 12 — 데스크톱 2-pane 스크롤 + 트리 ⋯ 메뉴 UX

- **좌·우 독립 스크롤** (`global.css`, `@media (min-width: 768px)` + `app--tree-layout`)
  - 앱 전체: `height: 100vh/100dvh`, `overflow: hidden` — 페이지 통째 스크롤 차단
  - **좌측**: `.tree-view__list` — `overflow-y: auto` (폴더 헤더·`+` 고정)
  - **우측**: `.app-main > .link-drop-zone` — `overflow-y: auto` (링크 그리드·빈 화면)
  - `overscroll-behavior: contain`, `scrollbar-gutter: stable`
- **트리 ⋯ 메뉴** (`TreeView.tsx` + `global.css`)
  - 항목: **↗ 이동**(accent 색), **📁 하위 폴더 추가**, **❌ 삭제**
  - 메뉴 열림 시 `.tree-node__row--menu-open` + `z-index` — 루트·중간 폴더에서 하위 행에 가려져 이동 클릭 안 되던 문제 수정
- **후속 개선 후보**: macOS 등에서 스크롤바 thumb/track 시각화 (`theme.css`에 width·track 미적용)

---

## 4. 디렉터리·파일 맵

```
src/
  App.tsx                 # 상태·모달·플랫폼 분기·링크/카테고리 핸들러
  main.tsx
  types/index.ts          # Category, LinkItem, LinkMetadata
  db/index.ts             # Dexie CRUD, sortOrder, inbox, moveLink
  services/
    url.ts                # launch, favicon, YouTube ID, isValidUrl
    metadata.ts           # oEmbed, OG fetch, fallback
    urlFile.ts            # .url INI 파싱
    dropImport.ts         # DataTransfer → 링크 목록
  hooks/
    useCategories.ts      # getChildCategories (sortOrder 정렬됨)
    useLinks.ts
    useMediaQuery.ts      # useIsDesktop @ 768px
    useTheme.ts           # dark/light/neon 순환, localStorage
  components/
    TreeView.tsx          # 웹 트리 + ⋯ 메뉴(↗이동·📁하위·❌삭제) + 링크 드롭 타겟
    LinkCardList.tsx      # 링크 그리드 + 정렬·페이지네이션 + 드롭존
    LinkCard.tsx          # auto/manual 카드, ✎ × ↗, draggable
    LinkDropZone.tsx      # .url/URL 드래그 임포트 오버레이
    EmptyDropPanel.tsx    # 메인 빈 화면 드롭
    RadialBubbleView.tsx  # 모바일 방사형
    YouTubePlayer.tsx     # YouTube 인앱 오버레이 플레이어 (+ .css)
    DragTrashZone.tsx     # 카드 드래그 중 표시되는 삭제 휴지통
    ThemeToggle.tsx       # 테마 순환 버튼 (🌙/☀️/✨)
    InputModal.tsx        # 추가/편집/이동/확인 모달 일체
    link-list-panel.css   # 링크 목록 패널(정렬·페이지) 스타일
    drag-interactions.css # 드래그앤드롭 시각 피드백
  styles/
    global.css            # 레이아웃·2-pane 독립 스크롤(데스크톱)·컴포넌트 스타일
    theme.css             # 테마 변수·테마별 오버라이드 (global 뒤에 로드)
public/
  favicon.svg, pwa-192.png, pwa-512.png
scripts/
  generate-pwa-icons.ps1
```

**인계 시 우선 읽을 파일:** `App.tsx` → `db/index.ts` → `dropImport.ts` / `metadata.ts` → `TreeView.tsx` / `LinkCardList.tsx` / `YouTubePlayer.tsx`

---

## 5. 데이터 모델

### Category

```ts
id, parentId (null = 루트), title, sortOrder, createdAt, updatedAt
```

### LinkItem

```ts
id, categoryId, url, title, imageUrl?, faviconUrl?, source: 'auto' | 'manual', createdAt, updatedAt
```

### 인박스

- 상수 `INBOX_TITLE = '미분류'`
- 루트(`parentId === null`) 중 제목이 `미분류`인 카테고리 1개를 인박스로 사용
- 없으면 드롭/추가 시 자동 생성

### sortOrder 규칙

- 추가: `max(형제 sortOrder) + 1`
- 삭제: 해당 부모의 형제만 `0..n-1` 재정렬
- 이동(`moveCategory`): **이전 부모**만 renormalize; 이동 노드는 새 부모 끝에 append
- 순환 방지: `newParentId`가 자기 자신 또는 자손이면 `false`

---

## 6. 주요 사용자 플로우

### 링크 추가

1. **모달 +** → URL 입력; “수제 카드” 체크 시 `forceManual` (메타 없이 favicon만)
2. **드롭** → `.url` / uri-list / plain URL
3. 카테고리 없으면 → **미분류** 생성 후 등록, 해당 카테고리로 UI 선택

### `addLinkToCategory` 분기 (`App.tsx`)

| 조건 | 동작 |
|------|------|
| `forceManual` | manual 카드, favicon만 |
| `titleOverride` (`.url` 등) | 메타 fetch + **제목만 override**, image 있으면 auto |
| 기본 | 전체 메타 fetch |

### 카테고리 (웹 트리)

- **+** (헤더): 루트 폴더 추가 · **⋯** (행): **↗ 이동** · **📁 하위 폴더 추가** · **❌ 삭제**
- 폴더명 **더블클릭** → 이름 변경 (`edit-category` 모달)
- **↗ 이동** → `MoveCategoryModal` → 다른 상위(또는 루트)로 `moveCategory()`

### 데스크톱 레이아웃 (스크롤)

| 영역 | 스크롤 컨테이너 | 고정 UI |
|------|-----------------|---------|
| 좌 (260px) | `.tree-view__list` | "폴더" 헤더, `+` |
| 우 (flex) | `.app-main > .link-drop-zone` | 앱 헤더(LinkPortal) |

- 좌·우 경계: `.tree-view` `border-right`
- 모바일은 기존처럼 페이지/뷰 단위 스크롤

### 링크 카드

- 클릭: YouTube → **인앱 재생**(`YouTubePlayer`), 그 외 → `launchUrl`
- **✎** 편집 · **×** 삭제(확인 없음) · **↗** 다른 카테고리로 이동(모달)
- **드래그앤드롭**: 트리 폴더에 드롭 → 이동 / 휴지통(`DragTrashZone`)에 드롭 → 삭제
- 목록: **정렬**(최신/오래된/이름순) · **페이지네이션**(12개/페이지)

### 테마

- 헤더(웹) 또는 우상단(모바일) **ThemeToggle** 클릭 → dark → light → neon → …
- 선택값은 `localStorage`(`linkportal-theme`)에 저장, 새로고침 후 유지
- 스타일 수정 시 `theme.css`의 `[data-theme='…']` 변수 + `global.css` 레거시 변수(`--bg`, `--text` 등) 매핑 여부 확인

---

## 7. 모달 상태 (`App.tsx` `ModalState`)

| type | 용도 |
|------|------|
| `add-category` | 카테고리 추가 |
| `edit-category` | 이름 변경 |
| `move-category` | 카테고리 상위 이동 |
| `confirm-delete-category` | 카테고리 삭제 확인 |
| `add-link` | 링크 추가 |
| `edit-link` | URL·제목 편집 |
| `move-link` | 링크 카테고리 이동 |

---

## 8. 의도적으로 하지 않은 것 (후순위)

| 항목 | 사유 |
|------|------|
| **OG 프록시** | 별도 서버 필요, 로컬 PWA 정체성과 트레이드오프 |
| **App.tsx 분리 / refreshAll 최적화** | 동작·규모상 체감 낮음, 기능 완성 후 |
| **드롭 bulk 메타 병렬화** | 링크 수십 개 전엔 순차 await로 충분 |
| **모바일 카테고리 편집 UI** | 웹 트리에만 ✎↗× (방사형은 탐색·추가 위주) |
| **방사형 버블 한계·임계점** | 스켈레톤 §7 보류 |
| **사용자 정의 테마(색상 편집기 등)** | 3프리셋(dark/light/neon)만 제공, 임의 색상 편집 UI 없음 |
| **항상 보이는 스크롤바 UI** | 기능은 2-pane 독립 스크롤 적용됨; macOS overlay·thumb CSS 미완 |

---

## 9. 운영·디버깅 메모

### IndexedDB

- DB 이름: `LinkPortal-launcher`
- **코드에서 seed 제거 ≠ 기존 브라우저 데이터 삭제**. 이전 dev 세션 데이터는 DevTools → Application → IndexedDB 삭제 또는 “사이트 데이터 삭제”로 비울 수 있음.
- Local Storage의 `coderead-*` 등은 **본 앱과 무관** (같은 origin에 다른 앱 흔적).
- 테마: `linkportal-theme` (`dark` | `light` | `neon`) — DevTools → Application → Local Storage에서 확인·삭제 가능.

### 메타데이터

- 일반 사이트 OG 직접 fetch는 **CORS로 자주 실패** → manual 카드 + hostname/favicon은 정상 fallback.
- YouTube는 oEmbed로 auto 카드 가능.

### 드롭

- Windows 바탕화면 `.url` → 보통 `files`로 들어옴.
- OS/브라우저에 따라 `text/uri-list`만 올 수 있음 → `dropImport.ts` 양쪽 처리.
- `.url` 파일이 하나라도 파싱되면 uri-list는 건너뜀 (파일 우선).

### PWA

- manifest 아이콘: `public/pwa-192.png`, `pwa-512.png` (vite.config.ts 참조)
- 순수 웹 변경은 **rebuild 불필요** (HMR). `npm run build`는 배포·PWA precache 갱신 시.

---

## 10. 초기 화면 (현재)

- 카테고리·링크 **0건** — 빈 DB 정상 상태
- 웹: 좌 트리 “+ 로 추가하거나 .url …”, 우 “카테고리 선택 또는 드롭 → 미분류”
- 첫 드롭 후 트리에 **미분류** 나타나고 링크 카드 표시

---

## 11. 다음 작업 후보 (개발자 참고)

1. 링크 삭제 확인 모달 (현재 즉시 삭제 / 휴지통 드롭만 있음)
2. **데스크톱 스크롤바 track/thumb 시각화** (좌·우 패널)
3. 모바일 트리/카테고리 편집 parity (드래그앤드롭은 데스크톱 중심)
4. 방사형 버블 수 제한 + drill-down 정책
5. 링크 편집 시 URL 변경 → 메타 재수집 옵션
6. OG 프록시 (별도 서비스 설계 후)
7. `App.tsx` 훅/모듈 분리 (기능 안정 후)

> **완료된 이전 후보:** YouTube 인앱 재생, 링크 드래그앤드롭(이동·삭제), 목록 정렬·페이지네이션, 3테마(dark/light/neon), 데스크톱 좌·우 독립 스크롤, 트리 ⋯ 메뉴(이동 z-index)

---

*문서 작성 기준: 저장소 `260606_LinkPortal` / 앱 표시명 LinkPortal / 패키지명 `LinkPortal-launcher`*
