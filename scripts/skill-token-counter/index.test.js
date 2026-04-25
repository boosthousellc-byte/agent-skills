import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { parseSkillMd, listFilesRecursiveLocal } from './index.js';

describe('parseSkillMd', () => {
  it('splits valid frontmatter and body', () => {
    const content = '---\nname: firebase-basics\ndescription: A Firebase skill\n---\n# Body\nsome content';
    const { frontmatter, body } = parseSkillMd(content);
    expect(frontmatter).toBe('---\nname: firebase-basics\ndescription: A Firebase skill\n---\n');
    expect(body).toBe('# Body\nsome content');
  });

  it('returned frontmatter string includes the --- delimiters', () => {
    const content = '---\nname: test\n---\n# Body';
    const { frontmatter } = parseSkillMd(content);
    expect(frontmatter).toMatch(/^---\n/);
    expect(frontmatter).toMatch(/\n---\n$/);
  });

  it('returns empty frontmatter and full content as body when no frontmatter present', () => {
    const content = '# Just a body\nno frontmatter here';
    const { frontmatter, body } = parseSkillMd(content);
    expect(frontmatter).toBe('');
    expect(body).toBe(content);
  });

  it('returns empty body when frontmatter has no trailing content', () => {
    const content = '---\nname: test\n---\n';
    const { frontmatter, body } = parseSkillMd(content);
    expect(frontmatter).toBe('---\nname: test\n---\n');
    expect(body).toBe('');
  });

  it('returns empty frontmatter when closing delimiter is missing', () => {
    const content = '---\nname: test\n# no closing delimiter';
    const { frontmatter, body } = parseSkillMd(content);
    expect(frontmatter).toBe('');
    expect(body).toBe(content);
  });

  it('returns empty frontmatter and body for an empty string', () => {
    const { frontmatter, body } = parseSkillMd('');
    expect(frontmatter).toBe('');
    expect(body).toBe('');
  });

  it('stops at the first closing delimiter, leaving subsequent --- blocks in the body', () => {
    const content = '---\nname: test\n---\n# Body\n---\nfake: block\n---\n';
    const { frontmatter, body } = parseSkillMd(content);
    expect(frontmatter).toBe('---\nname: test\n---\n');
    expect(body).toBe('# Body\n---\nfake: block\n---\n');
  });

  it('requires frontmatter to start at the very beginning of the string', () => {
    const content = '\n---\nname: test\n---\n# Body';
    const { frontmatter, body } = parseSkillMd(content);
    expect(frontmatter).toBe('');
    expect(body).toBe(content);
  });

  it('handles multiline frontmatter values', () => {
    const content = '---\nname: test\ndescription: line one\n  line two indented\ntags:\n  - foo\n  - bar\n---\nBody text';
    const { frontmatter, body } = parseSkillMd(content);
    expect(frontmatter).toContain('description: line one');
    expect(frontmatter).toContain('  - bar');
    expect(body).toBe('Body text');
  });

  it('frontmatter and body together reconstruct the original content', () => {
    const content = '---\nname: test\n---\n# Body\nwith multiple\nlines';
    const { frontmatter, body } = parseSkillMd(content);
    expect(frontmatter + body).toBe(content);
  });
});

describe('listFilesRecursiveLocal', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('returns empty array for a non-existent directory', async () => {
    const files = await listFilesRecursiveLocal('/nonexistent/path/that/does/not/exist');
    expect(files).toEqual([]);
  });

  it('returns files from an existing directory', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
    fs.writeFileSync(path.join(tmpDir, 'a.md'), 'content a');
    fs.writeFileSync(path.join(tmpDir, 'b.md'), 'content b');

    const files = await listFilesRecursiveLocal(tmpDir);
    expect(files.sort()).toEqual([
      path.join(tmpDir, 'a.md'),
      path.join(tmpDir, 'b.md'),
    ]);
  });

  it('recurses into subdirectories', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
    const sub = path.join(tmpDir, 'sub');
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(tmpDir, 'top.md'), 'top');
    fs.writeFileSync(path.join(sub, 'nested.md'), 'nested');

    const files = await listFilesRecursiveLocal(tmpDir);
    expect(files.sort()).toEqual([
      path.join(sub, 'nested.md'),
      path.join(tmpDir, 'top.md'),
    ]);
  });

  it('returns empty array for a "references" dir that does not exist, enabling fallback to "reference"', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
    const referenceDir = path.join(tmpDir, 'reference');
    fs.mkdirSync(referenceDir);
    fs.writeFileSync(path.join(referenceDir, 'ops.md'), 'ops content');

    const fromReferences = await listFilesRecursiveLocal(path.join(tmpDir, 'references'));
    expect(fromReferences).toEqual([]);

    const fromReference = await listFilesRecursiveLocal(referenceDir);
    expect(fromReference).toEqual([path.join(referenceDir, 'ops.md')]);
  });
});
