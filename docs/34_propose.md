## 기록

```ts
url.ts
https://youtube.com/shorts/xbrRAj9pL_c       shorts

/shorts/VIDEO_ID 형식

https://youtube.com/shorts/xbrRAj9pL_c?si=RlaXj7oaxLEa-j9q      shorts + 추적용 쿼리


https://www.youtube.com/watch?v=Cx076SwzFog    watch

https://youtu.be/Cx076SwzFog      단축 URL
```

si 의미?
YouTube 공유 링크에 자동으로 붙는 추적용 파라미터입니다. 공유 경로(카카오톡, 트위터 등)를 추적하기 위한 것으로, 영상 재생과는 무관합니다. 


일반 YouTube와 동일하게 썸네일 + oEmbed 메타데이터(채널명 포함) 가져옵니다.

```ts
if (parsed.hostname.includes('youtube.com')) {
  const v = parsed.searchParams.get('v');
  if (v) return v;
  const embed = parsed.pathname.match(/\/embed\/([^/?]+)/);
  if (embed) return embed[1];
  const shorts = parsed.pathname.match(/\/shorts\/([^/?]+)/);  // ← 추가
  if (shorts) return shorts[1];                                 // ← 추가
}
```

필요없는게 많았음 
일단 백업기능을 함

