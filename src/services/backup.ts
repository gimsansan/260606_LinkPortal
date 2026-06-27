import { exportData, importData, type BackupPayload, type ImportMode } from '../db';

// 현재 DB를 JSON 파일로 내려받기.
export async function downloadBackup(): Promise<void> {
  const payload = await exportData();

  // 객체 → JSON 문자열 → Blob. null,2 는 사람이 열어봤을 때 읽기 좋게 들여쓰기.
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });

  // Blob을 가리키는 임시 URL을 만들고, 보이지 않는 <a>를 클릭해 다운로드 트리거.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date(payload.exportedAt).toISOString().slice(0, 10); // YYYY-MM-DD
  a.href = url;
  a.download = `linkportal-backup-${date}.json`;
  a.click();

  // 임시 URL 회수 — 안 하면 메모리에 계속 남음.
  URL.revokeObjectURL(url);
}

// 사용자가 고른 파일을 읽어 복원. 기본 merge.
export async function readBackupFile(file: File, mode: ImportMode = 'merge'): Promise<void> {
  const text = await file.text(); // File → 문자열
  const payload = JSON.parse(text) as BackupPayload; // 문자열 → 객체
  await importData(payload, mode); // 검증·반영은 1단계 함수에 위임
}
