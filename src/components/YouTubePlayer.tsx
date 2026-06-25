import { useState, useCallback } from 'react';
import YouTube from 'react-youtube';
import type { LinkItem } from '../types';
import { extractYouTubeVideoId } from '../services/url';
import './YouTubePlayer.css';

interface YouTubePlayerProps {
  /** 현재 재생할 링크 */
  link: LinkItem;
  /** 같은 카테고리의 YouTube 링크 목록 (순서대로) */
  playlist: LinkItem[];
  /** 플레이어 닫기 (목록으로) */
  onClose: () => void;
  /** 다른 영상 재생 요청 */
  onPlayLink: (link: LinkItem) => void;
}

export function YouTubePlayer({ link, playlist, onClose, onPlayLink }: YouTubePlayerProps) {
  const [ended, setEnded] = useState(false);
  const videoId = extractYouTubeVideoId(link.url);

  const currentIndex = playlist.findIndex((l) => l.id === link.id);
  const nextLink = currentIndex >= 0 && currentIndex < playlist.length - 1
    ? playlist[currentIndex + 1]
    : null;

  const handleEnd = useCallback(() => setEnded(true), []);
  const handlePlay = useCallback(() => setEnded(false), []);

  const handleNext = useCallback(() => {
    if (nextLink) {
      setEnded(false);
      onPlayLink(nextLink);
    }
  }, [nextLink, onPlayLink]);

  const handleError = useCallback(() => {
    // 비공개/연령제한 등 재생 실패 → 새 탭 fallback
    window.open(link.url, '_blank', 'noopener,noreferrer');
    onClose();
  }, [link.url, onClose]);

  if (!videoId) return null;

  return (
    <div className="yt-player-overlay" onClick={onClose}>
      <div className="yt-player" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="yt-player__close"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>

        <h3 className="yt-player__title">{link.title}</h3>

        <div className="yt-player__wrapper">
          <YouTube
            videoId={videoId}
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                rel: 0,
                modestbranding: 1,
                autoplay: 1,
              },
            }}
            onEnd={handleEnd}
            onPlay={handlePlay}
            onError={handleError}
            className="yt-player__iframe"
            iframeClassName="yt-player__iframe-inner"
          />

          {ended && (
            <div className="yt-player__end-overlay">
              <div className="yt-player__end-actions">
                <button type="button" className="yt-player__btn" onClick={onClose}>
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
                <p className="yt-player__next-title">
                  다음: {nextLink.title}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
