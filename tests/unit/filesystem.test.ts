import { describe, expect, it } from 'vitest';
import { getDescendants, isValidName, uniqueName, validateImport } from '../../src/lib/filesystem';
import { SEED_FILES } from '../../src/lib/data';
import type { WorkspaceFile } from '../../src/lib/types';
const make = (
  id: string,
  parentId: string,
  kind: WorkspaceFile['kind'] = 'folder',
): WorkspaceFile => ({ id, name: id, kind, parentId, modified: 1, size: 0 });
describe('virtual filesystem', () => {
  it('walks all descendants, not unrelated siblings', () => {
    const files = [make('a', 'root'), make('b', 'a'), make('c', 'b', 'text'), make('d', 'root')];
    expect(getDescendants(files, 'a')).toEqual(['a', 'b', 'c']);
  });
  it('does not loop when malformed data contains a cycle', () =>
    expect(getDescendants([make('a', 'b'), make('b', 'a')], 'a')).toEqual(['a', 'b']));
  it.each(['Notes.md', 'Ghi chú hôm nay.md', 'A new folder'])(
    'accepts ordinary names: %s',
    (name) => expect(isValidName(name)).toBe(true),
  );
  it.each(['', '  ', '..', '.', 'folder/file', 'C:\\files', 'bad?name', 'x'.repeat(121)])(
    'rejects unsafe names: %s',
    (name) => expect(isValidName(name)).toBe(false),
  );
  it('keeps duplicate filenames unique, case insensitively', () => {
    const files = [
      { ...make('x', 'root', 'text'), name: 'Note.md' },
      { ...make('y', 'root', 'text'), name: 'note (2).md' },
    ];
    expect(uniqueName(files, 'root', 'note.md')).toBe('note (3).md');
    expect(uniqueName(files, 'root', 'Note.md', 'x')).toBe('Note.md');
    expect(uniqueName(files, 'elsewhere', 'Note.md')).toBe('Note.md');
  });
  it('accepts the bundled workspace and its JSON round trip', () => {
    expect(validateImport(SEED_FILES)).toBe(true);
    expect(validateImport(JSON.parse(JSON.stringify(SEED_FILES)))).toBe(true);
  });
  it('rejects duplicate ids, orphaned files, and directory cycles', () => {
    expect(validateImport([make('a', 'root'), make('a', 'root')])).toBe(false);
    expect(validateImport([make('a', 'missing')])).toBe(false);
    expect(validateImport([make('a', 'b'), make('b', 'a')])).toBe(false);
    expect(validateImport([make('a', 'root', 'text'), make('b', 'a')])).toBe(false);
  });
  it('rejects untrusted URLs, invalid content, and excessive lists', () => {
    expect(validateImport([{ ...make('a', 'root', 'image'), url: 'javascript:alert(1)' }])).toBe(
      false,
    );
    expect(
      validateImport([{ ...make('a', 'root', 'image'), url: 'https://evil.example/track' }]),
    ).toBe(false);
    expect(
      validateImport([{ ...make('a', 'root', 'image'), url: 'data:image/svg+xml;base64,AAAA' }]),
    ).toBe(false);
    expect(validateImport([{ ...make('a', 'root', 'text'), content: {} }])).toBe(false);
    expect(validateImport(Array.from({ length: 1001 }, (_, i) => make(String(i), 'root')))).toBe(
      false,
    );
  });
  it('keeps long duplicate names within the supported length', () => {
    const name = 'x'.repeat(117) + '.md';
    const files = [{ ...make('a', 'root', 'text'), name }];
    const duplicate = uniqueName(files, 'root', name);
    expect(duplicate.length).toBe(120);
    expect(duplicate.endsWith(' (2).md')).toBe(true);
    expect(isValidName(duplicate)).toBe(true);
  });
  it('rejects reserved ids and malformed flags', () => {
    expect(validateImport([make('root', 'root')])).toBe(false);
    expect(validateImport([{ ...make('a', 'root'), favorite: 'yes' }])).toBe(false);
    expect(validateImport([{ ...make('a', 'root'), trashed: {} }])).toBe(false);
  });
  it('rejects traversal paths and accepts only actual image data URLs', () => {
    expect(
      validateImport([{ ...make('a', 'root', 'image'), url: '/wallpapers/../../api/system' }]),
    ).toBe(false);
    expect(
      validateImport([{ ...make('a', 'root', 'image'), url: 'data:image/png;base64,AAAA' }]),
    ).toBe(true);
    expect(
      validateImport([{ ...make('a', 'root', 'image'), url: 'data:image/png;base64,<script>' }]),
    ).toBe(false);
  });
});
