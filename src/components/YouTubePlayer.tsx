import { useState, useCallback, useEffect, useRef } from "react";
import YouTube from "react-youtube";
import type { LinkItem } from "../types";
import { extractYouTubeVideoId } from "../services/url";
import "./YouTubePlayer.css";

/** YouTube IFrame API — PlayerState.ENDED */
const YT_ENDED = 0;

interface YouTubePlayerProps {
  /** 현재 재생할 링크 */
  link: LinkItem;
  /** 같은 카테고리의 YouTube 링크 목록 (순서대로) */
  playlist: LinkItem[];
  /** 플레이어 닫기 (목록으로) */
  onClose: () => void;
  /** 다른 영상 재생 요청 */
  onPlayLink: (link: LinkItem) => void;
  /** true면 종료 시 다음 곡 자동 재생 (브라우저 정책으로 음소거될 수 있음) */
  autoAdvance?: boolean;
}

export function YouTubePlayer({
  link,
  playlist,
  onClose,
  onPlayLink,
  autoAdvance = false,
}: YouTubePlayerProps) {
  const [ended, setEnded] = useState(false);
  const endHandledRef = useRef(false);
  const videoId = extractYouTubeVideoId(link.url);

  useEffect(() => {
    endHandledRef.current = false;
    setEnded(false);
  }, [link.id]);

  const currentIndex = playlist.findIndex((l) => l.id === link.id);
  const nextLink =
    currentIndex >= 0 && currentIndex < playlist.length - 1
      ? playlist[currentIndex + 1]
      : null;

  const handlePlay = useCallback(() => setEnded(false), []);

  const handleNext = useCallback(() => {
    if (nextLink) {
      setEnded(false);
      onPlayLink(nextLink);
    }
  }, [nextLink, onPlayLink]);

  const handleEnd = useCallback(() => {
    if (endHandledRef.current) return;
    endHandledRef.current = true;
    if (autoAdvance && nextLink) {
      handleNext();
    } else {
      setEnded(true);
    }
  }, [autoAdvance, nextLink, handleNext]);

  const handleStateChange = useCallback(
    (event: { data: number }) => {
      if (event.data === YT_ENDED) handleEnd();
    },
    [handleEnd],
  );

  const handleError = useCallback(() => {
    // 비공개/연령제한 등 재생 실패 → 새 탭 fallback
    window.open(link.url, "_blank", "noopener,noreferrer");
    onClose();
  }, [link.url, onClose]);

  // ── 드래그 이동 ──
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    const rect = (
      e.currentTarget.parentElement as HTMLElement
    ).getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    };
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // 영상 변경 시 위치 초기화 (중앙으로)
  useEffect(() => {
    setPos(null);
  }, [link.id]);

  if (!videoId) return null;

  return (
    <div className="yt-player-overlay" onClick={onClose}>
      <div
        className="yt-player"
        onClick={(e) => e.stopPropagation()}
        style={
          pos
            ? {
                position: "fixed",
                left: pos.x,
                top: pos.y,
                transform: "none",
                margin: 0,
              }
            : undefined
        }
      >
        <button
          type="button"
          className="yt-player__close"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>

        <h3 className="yt-player__title" onMouseDown={handleDragStart}>
          {link.title}
        </h3>

        <div className="yt-player__wrapper">
          <YouTube
            key={link.id}
            videoId={videoId}
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                rel: 0,
                modestbranding: 1,
                autoplay: 1,
              },
            }}
            onEnd={handleEnd}
            onStateChange={handleStateChange}
            onPlay={handlePlay}
            onError={handleError}
            className="yt-player__iframe"
            iframeClassName="yt-player__iframe-inner"
          />

          {ended && (
            <div className="yt-player__end-overlay">
              <div className="yt-player__end-actions">
                <button
                  type="button"
                  className="yt-player__btn"
                  onClick={onClose}
                >
                  목록으로
                </button>
                {nextLink && (
                  <button
                    type="button"
                    className="yt-player__btn yt-player__btn--next"
                    onClick={handleNext}
                  >
                    다음 영상 ▶
                  </button>
                )}
              </div>
              {nextLink && (
                <p className="yt-player__next-title">다음: {nextLink.title}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
