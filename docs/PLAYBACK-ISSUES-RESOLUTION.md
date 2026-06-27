# Playback Issues And Fixes

## 목적

재생목록 모드와 자동 넘김을 추가하는 과정에서 발견한 재생 관련 문제, 원인, 적용한 해결법을 기록한다. 이후 같은 증상이 다시 발생했을 때 원인 추적과 수정 범위를 빠르게 확인하기 위한 문서다.

## 관련 파일

### 핵심 재생 흐름

- `src/App.tsx`
  - `playingLink`: 현재 재생 중인 링크 상태
  - `youtubePlaylist`: 현재 폴더의 YouTube 링크 재생 큐
  - `handlePlayVideo`: 특정 링크 재생 시작
  - `handlePlayAll`: 폴더의 YouTube 링크 전체 재생 시작
- `src/components/YouTubePlayer.tsx`
  - YouTube iframe 재생
  - 종료 오버레이
  - 다음 영상 이동
  - 자동 넘김
  - 같은 영상 중복 링크 재생 보강
- `src/components/LinkCard.tsx`
  - YouTube 링크는 앱 내부 플레이어로 재생
  - YouTube가 아닌 링크는 `window.open` 유지
- `src/components/LinkCardList.tsx`
  - `▶ 전체 재생` 버튼
  - `자동 넘김` 토글
  - 재생 순서 안내 툴팁

### 설정과 스타일

- `src/hooks/useAutoAdvance.ts`
  - 자동 넘김 설정 저장
  - localStorage key: `linkportal-auto-advance`
  - 기본값: `false`
- `src/components/link-list-panel.css`
  - 자동 넘김 토글 스타일
- `src/styles/global.css`
  - 전체 재생 버튼 스타일

### 분석에 참고한 파일

- `src/services/url.ts`
  - `extractYouTubeVideoId`
  - 현재 "임베드 가능" 판별은 YouTube video id 추출 성공 여부
- `src/hooks/useLinks.ts`
  - 현재 폴더의 링크 목록 로드
- `src/db/index.ts`
  - `getLinksByCategory`
  - DB 기준 링크 정렬 확인
- `src/hooks/useInstantDelete.ts`
  - localStorage 토글 패턴 참고

## 기능 구분

### 전체 재생

`▶ 전체 재생`은 재생을 시작하는 버튼이다.

- 폴더 안의 YouTube 링크만 대상으로 한다.
- 현재 구현 기준 재생 순서는 `최근 추가순`이다.
- 페이지 UI, 이름순 정렬, 검색 결과 화면과는 독립적으로 동작한다.
- YouTube 링크가 0개면 버튼을 표시하지 않는다.

### 자동 넘김

`자동 넘김`은 이미 재생 중인 영상이 끝났을 때 다음 영상으로 넘어갈지 정하는 설정이다.

- 기본값은 OFF다.
- OFF: 영상 종료 후 종료 오버레이에서 `다음 영상`을 사용자가 직접 클릭한다.
- ON: 영상 종료 시 기존 `handleNext`를 재사용해 다음 링크를 자동 재생한다.
- 자동재생 정책 때문에 다음 영상이 음소거되거나 멈출 수 있다.

## 문제 1: 화면 순서와 재생 큐 순서가 달라 다음 곡이 없는 것처럼 보임

### 증상

사용자가 화면 중간 또는 위쪽 카드를 선택했는데, 영상 종료 후 다음 영상으로 넘어가지 않았다.

### 원인

처음 구현에서는 `youtubePlaylist`가 DB에서 가져온 `links` 순서를 그대로 사용했다. 반면 화면 기본 정렬은 최근 추가순이었다.

그 결과 화면에서는 위쪽 카드처럼 보여도, 재생 큐 기준으로는 마지막 항목일 수 있었다. 마지막 항목이면 `nextLink`가 없으므로 자동 넘김 ON이어도 다음으로 넘어갈 수 없다.

### 해결

`src/App.tsx`의 `youtubePlaylist`를 YouTube 필터 후 `createdAt` 내림차순으로 정렬했다.

```ts
const youtubePlaylist = useMemo(
  () =>
    links
      .filter((l) => !!extractYouTubeVideoId(l.url))
      .sort((a, b) => b.createdAt - a.createdAt),
  [links],
);
```

### 결과

- 화면 기본 정렬인 최근 추가순과 재생 큐가 맞춰졌다.
- 화면 위쪽 카드에서 시작하면 아래쪽 카드 방향으로 다음 재생이 이어진다.
- `▶ 전체 재생`도 가장 최근에 추가한 YouTube 링크부터 시작한다.

### 주의

사용자가 UI에서 이름순 정렬로 바꿔도 재생 큐는 여전히 최근 추가순이다. 현재 툴팁으로 `폴더 YouTube 링크를 최근 추가순으로 재생 · 페이지·이름순과 무관`이라고 안내한다.

## 문제 2: 페이지 나뉨이 재생과 관련 있다고 오해할 수 있음

### 증상

링크가 많아져 페이지 UI가 생기면, 현재 페이지 안에서만 재생되는지 혼동될 수 있다.

### 원인

`LinkCardList`는 12개씩 화면을 나눠 보여주지만, 재생 큐는 `App.tsx`의 `links` 전체에서 만든다.

### 결론

페이지 UI는 보기만 나누는 기능이다.

- 재생 큐는 현재 폴더의 YouTube 링크 전체 기준이다.
- 1페이지 마지막 YouTube 링크가 끝나도 2페이지에 다음 YouTube 링크가 있으면 이어질 수 있다.
- `현재 페이지 삭제` 같은 페이지 기반 기능과 재생 큐는 별개다.

## 문제 3: 같은 YouTube 링크가 연속으로 있을 때 다음 영상이 재생되지 않음

### 증상

4번째 영상을 재생한 뒤 5번째에 같은 YouTube 영상이 있었는데, 다음 영상으로 넘어가지 않고 YouTube 리플레이 화면에 멈췄다.

### 원인

4번째와 5번째 링크는 앱 데이터상 서로 다른 `link.id`를 가진 다른 카드지만, YouTube `videoId`는 동일했다.

기존 구현에서는 `react-youtube`에 전달되는 `videoId`가 같으면 플레이어가 새로 마운트되지 않을 수 있었다. 그 결과 링크 상태는 다음 항목으로 바뀌었지만, YouTube iframe은 끝난 상태를 유지해 같은 영상을 다시 시작하지 못했다.

### 해결

`src/components/YouTubePlayer.tsx`의 `YouTube` 컴포넌트에 `key={link.id}`를 추가했다.

```tsx
<YouTube
  key={link.id}
  videoId={videoId}
  ...
/>
```

### 결과

같은 `videoId`라도 `link.id`가 바뀌면 React가 YouTube 플레이어를 새로 마운트한다. 중복 링크가 연속으로 있어도 다음 카드의 영상으로 다시 재생할 수 있다.

## 문제 4: YouTube 종료 이벤트가 안정적으로 오지 않을 수 있음

### 증상

영상이 끝났는데 앱의 종료 오버레이가 뜨지 않고, YouTube 자체 리플레이 화면만 보였다.

### 원인

일부 YouTube 임베드 영상에서 `onEnd` 이벤트가 기대대로 오지 않거나 늦게 올 수 있다. 특히 방송 클립, 긴 영상, 라이브성 콘텐츠 등에서 발생할 수 있다.

### 해결

`onEnd`뿐 아니라 YouTube IFrame API의 상태 변경 이벤트도 함께 처리했다.

```ts
const YT_ENDED = 0;

const handleStateChange = useCallback(
  (event: { data: number }) => {
    if (event.data === YT_ENDED) handleEnd();
  },
  [handleEnd],
);
```

그리고 `YouTube` 컴포넌트에 `onStateChange={handleStateChange}`를 연결했다.

### 중복 처리 방지

`onEnd`와 `onStateChange`가 둘 다 종료를 알려줄 수 있으므로, `endHandledRef`로 종료 처리가 한 번만 실행되도록 했다.

```ts
const endHandledRef = useRef(false);

const handleEnd = useCallback(() => {
  if (endHandledRef.current) return;
  endHandledRef.current = true;
  ...
}, [autoAdvance, nextLink, handleNext]);
```

링크가 바뀌면 플래그와 종료 오버레이 상태를 초기화한다.

```ts
useEffect(() => {
  endHandledRef.current = false;
  setEnded(false);
}, [link.id]);
```

## 문제 5: 자동 넘김의 기본값과 브라우저 자동재생 정책

### 증상 가능성

자동 넘김 ON 상태에서 두 번째 영상부터 소리가 안 나거나, 재생이 멈춘 것처럼 보일 수 있다.

### 원인

첫 영상은 사용자가 `▶ 전체 재생` 또는 카드 재생을 직접 실행하므로 사용자 제스처가 있다. 하지만 다음 영상은 앱이 자동으로 시작하므로 브라우저가 소리 있는 자동재생으로 판단해 제한할 수 있다.

### 해결 방향

자동 넘김 기본값을 OFF로 유지했다.

```ts
const AUTO_ADVANCE_KEY = 'linkportal-auto-advance';

function getStoredAutoAdvance(): boolean {
  return localStorage.getItem(AUTO_ADVANCE_KEY) === 'true';
}
```

### 결과

- 기본 동작은 기존처럼 사용자가 종료 오버레이에서 `다음 영상`을 직접 누르는 방식이다.
- 사용자가 원할 때만 자동 넘김을 켠다.
- 토글 툴팁에 브라우저 정책상 음소거 가능성을 안내한다.

## 현재 재생 흐름

### 카드에서 시작

```text
LinkCard double click
→ YouTube 링크면 onPlay(link)
→ App.handlePlayVideo(link)
→ playingLink 변경
→ YouTubePlayer 표시
```

### 전체 재생에서 시작

```text
▶ 전체 재생 클릭
→ App.handlePlayAll()
→ youtubePlaylist[0] 재생
→ YouTubePlayer 표시
```

### 영상 종료

```text
YouTube onEnd 또는 onStateChange(ENDED)
→ YouTubePlayer.handleEnd()
→ autoAdvance ON + nextLink 있음: handleNext()
→ autoAdvance OFF 또는 nextLink 없음: 종료 오버레이 표시
```

### 다음 영상

```text
handleNext()
→ onPlayLink(nextLink)
→ App.handlePlayVideo(nextLink)
→ playingLink 변경
→ YouTubePlayer가 link.id 기준으로 새로 마운트
```

## 테스트 체크리스트

- YouTube 링크가 0개인 폴더에서 `▶ 전체 재생` 버튼이 숨겨지는지 확인
- YouTube 링크가 여러 개인 폴더에서 `▶ 전체 재생`이 가장 최근 링크부터 시작하는지 확인
- 자동 넘김 OFF에서 영상 종료 후 `다음 영상` 버튼이 보이는지 확인
- 자동 넘김 ON에서 다음 영상으로 자동 이동하는지 확인
- 같은 YouTube URL이 연속으로 있을 때 다음 항목으로 넘어가 다시 재생되는지 확인
- 페이지가 2개 이상일 때 1페이지 끝에서 2페이지의 YouTube 링크까지 이어지는지 확인
- 이름순 정렬 상태에서도 재생 순서는 최근 추가순임을 사용자가 이해할 수 있는지 확인

## 남은 주의사항

- 재생 큐는 화면의 현재 정렬 상태를 따라가지 않는다. 현재는 항상 최근 추가순이다.
- 검색 결과만 대상으로 재생하지 않는다. 검색 UI는 화면 표시용이며 재생 큐는 폴더 전체 기준이다.
- YouTube 임베드 자체 정책, 영상 제한, 브라우저 자동재생 정책은 앱에서 완전히 제어할 수 없다.
- 재생 실패(`onError`) 시 현재 구현은 원본 URL을 새 탭으로 열고 플레이어를 닫는다. 큐에서 실패 항목을 건너뛰는 처리는 아직 없다.

