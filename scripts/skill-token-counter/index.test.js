import { describe, it, expect } from 'vitest';
import { parseSkillMd } from './index.js';

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
