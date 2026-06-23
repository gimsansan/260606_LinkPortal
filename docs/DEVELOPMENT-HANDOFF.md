# LinkPortal Launcher — 개발 인계 문서

> URL 바로가기(.url) 컬렉션 PWA. 원본 기획은 `project-skeleton.md`(외부 인계 문서)를 참고.
> 이 문서는 **현재 코드베이스까지의 구현 과정·결정·미완 항목**을 개발자에게 넘기기 위한 기록이다.

---

## 1. 제품 컨셉과 최우선 원칙

| 원칙 | 구현 |
|------|------|
| **재생이 아닌 접속** | 미디어 추출 없음. `launchUrl()` → `window.open` |
| **인증은 대상 사이트에 위임** | iframe 로그인·자격증명 저장 없음 |
| **로컬 PWA** | IndexedDB(Dexie), 기기별 데이터 |
| **구조 커스터마이징** | 카테고리 트리 생성·이름변경·이동·삭제, 링크 편집·이동 |
| **외형 커스터마이징** | 현재 범위 밖 (앱 기본 다크 테마) |

---

## 2. 기술 스택

- **React 19** + **TypeScript** + **Vite 6**
- **Dexie 4** (IndexedDB)
- **vite-plugin-pwa** (manifest, service worker)
- 스타일: 단일 `src/styles/global.css` (CSS 변수, BEM 유사 클래스)

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
| **웹 (≥768px)** | `TreeView` 사이드바 | `LinkCardList` 그리드 |
| **모바일** | `RadialBubbleView` 방사형 + drill-down | 링크 화면에서 `LinkCardList` |

- 초기에는 웹에 방사형/트리 **토글**이 있었음 → **웹은 트리 전용**으로 정리 (토글·dead CSS 제거)

### Phase 2 — 링크·메타데이터

- **YouTube**: oEmbed + `hqdefault.jpg` 썸네일
- **일반 URL**: OG 태그 직접 fetch 시도 → CORS 실패 시 hostname + favicon fallback (**의도된 동작**)
- **auto 카드**: `imageUrl` 있음 / **manual 카드**: 파비콘·수제 배지·점선 테두리
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
  components/
    TreeView.tsx          # 웹 트리 + 행 액션
    LinkCardList.tsx      # 링크 그리드 + 드롭존
    LinkCard.tsx          # auto/manual 카드, ✎ × ↗
    LinkDropZone.tsx      # 드래그 오버레이
    EmptyDropPanel.tsx    # 메인 빈 화면 드롭
    RadialBubbleView.tsx  # 모바일 방사형
    InputModal.tsx        # 추가/편집/이동/확인 모달 일체
  styles/global.css
public/
  favicon.svg, pwa-192.png, pwa-512.png
scripts/
  generate-pwa-icons.ps1
```

**인계 시 우선 읽을 파일:** `App.tsx` → `db/index.ts` → `dropImport.ts` / `metadata.ts` → `TreeView.tsx` / `LinkCardList.tsx`

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

- **+** (헤더/행): 하위·루트 추가
- **✎** 이름 변경 · **↗** 상위 이동 · **×** 삭제(하위·링크 포함, 확인)

### 링크 카드

- 클릭: `launchUrl`
- **✎** 편집 · **×** 삭제(확인 없음) · **↗** 다른 카테고리로 이동

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
| **외형/테마 커스터마이징** | 스켈레톤 범위 밖 |

---

## 9. 운영·디버깅 메모

### IndexedDB

- DB 이름: `LinkPortal-launcher`
- **코드에서 seed 제거 ≠ 기존 브라우저 데이터 삭제**. 이전 dev 세션 데이터는 DevTools → Application → IndexedDB 삭제 또는 “사이트 데이터 삭제”로 비울 수 있음.
- Local Storage의 `coderead-*` 등은 **본 앱과 무관** (같은 origin에 다른 앱 흔적).

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

1. 링크 삭제 확인 모달 (카테고리만 있음)
2. 모바일 트리/카테고리 편집 parity
3. 방사형 버블 수 제한 + drill-down 정책
4. 링크 편집 시 URL 변경 → 메타 재수집 옵션
5. OG 프록시 (별도 서비스 설계 후)
6. `App.tsx` 훅/모듈 분리 (기능 안정 후)

---

*문서 작성 기준: 저장소 `2606_bookOff` / 앱 표시명 LinkPortal / 패키지명 `LinkPortal-launcher`*
