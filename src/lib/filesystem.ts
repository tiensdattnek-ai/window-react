import type { WorkspaceFile } from './types';

export function getDescendants(files: WorkspaceFile[], id: string): string[] {
  const visited = new Set<string>([id]);
  function walk(parentId: string) {
    for (const file of files)
      if (file.parentId === parentId && !visited.has(file.id)) {
        visited.add(file.id);
        walk(file.id);
      }
  }
  walk(id);
  return [...visited];
}
export function isValidName(name: string): boolean {
  return (
    !!name.trim() &&
    name.length <= 120 &&
    !/[\\/<>:"|?*\x00-\x1f]/.test(name) &&
    !['.', '..'].includes(name.trim())
  );
}
export function uniqueName(
  files: WorkspaceFile[],
  parentId: string,
  desired: string,
  excludeId?: string,
): string {
  const existing = new Set(
    files
      .filter((f) => f.parentId === parentId && !f.trashed && f.id !== excludeId)
      .map((f) => f.name.toLowerCase()),
  );
  if (!existing.has(desired.toLowerCase())) return desired;
  const dot = desired.lastIndexOf('.');
  const hasExtension = dot > 0 && desired.length - dot <= 16;
  const base = hasExtension ? desired.slice(0, dot) : desired;
  const ext = hasExtension ? desired.slice(dot) : '';
  const candidate = (number: number) => {
    const suffix = ` (${number})`;
    return `${base.slice(0, 120 - ext.length - suffix.length)}${suffix}${ext}`;
  };
  let number = 2;
  while (existing.has(candidate(number).toLowerCase())) number++;
  return candidate(number);
}
export function validateImport(value: unknown): value is WorkspaceFile[] {
  if (!Array.isArray(value) || value.length > 1000) return false;
  const ids = new Set<string>();
  for (const f of value) {
    if (
      !f ||
      typeof f !== 'object' ||
      typeof f.id !== 'string' ||
      !f.id ||
      f.id === 'root' ||
      f.id.length > 128 ||
      ids.has(f.id) ||
      typeof f.name !== 'string' ||
      !isValidName(f.name) ||
      !['folder', 'text', 'image', 'audio', 'code'].includes(f.kind) ||
      typeof f.parentId !== 'string' ||
      typeof f.modified !== 'number' ||
      !Number.isFinite(f.modified) ||
      typeof f.size !== 'number' ||
      !Number.isFinite(f.size) ||
      f.size < 0 ||
      (f.favorite !== undefined && typeof f.favorite !== 'boolean') ||
      (f.trashed !== undefined && typeof f.trashed !== 'boolean') ||
      (['image', 'audio'].includes(f.kind) && typeof f.url !== 'string') ||
      (f.content !== undefined && typeof f.content !== 'string') ||
      (f.url !== undefined &&
        (typeof f.url !== 'string' ||
          !(
            /^(?:\/wallpapers\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)|\/audio\/[a-zA-Z0-9_-]+\.(?:wav|mp3))$/.test(
              f.url,
            ) || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]*={0,2}$/.test(f.url)
          )))
    )
      return false;
    ids.add(f.id);
  }
  const byId = new Map(value.map((f) => [f.id, f]));
  for (const file of value) {
    const path = new Set<string>([file.id]);
    let parent = file.parentId;
    while (parent !== 'root') {
      if (path.has(parent)) return false;
      const folder = byId.get(parent);
      if (!folder || folder.kind !== 'folder') return false;
      path.add(parent);
      parent = folder.parentId;
    }
  }
  return true;
}
