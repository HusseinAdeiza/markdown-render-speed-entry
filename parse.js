// Fast markdown renderer: parse(markdown) -> HTML
// A minimal but functional CommonMark-ish subset for speed.

export function parse(markdown) {
  let html = '';
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines = [];
  let inList = false;
  let listType = null; // 'ul' or 'ol'
  let listStart = 1;

  const lines = markdown.split('\n');
  let i = 0;

  function flushCode() {
    if (inCodeBlock) {
      const langAttr = codeLang ? ` class="language-${codeLang}"` : '';
      html += `<pre><code${langAttr}>${escapeHtml(codeLines.join('\n'))}</code></pre>\n`;
      inCodeBlock = false;
      codeLang = '';
      codeLines = [];
    }
  }

  function flushList() {
    if (inList) {
      html += `</${listType}>\n`;
      inList = false;
      listType = null;
      listStart = 1;
    }
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function inline(text) {
    // Bold **text**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code `code`
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Links [text](url)
    text = text.replace(/\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2">$1</a>');
    // Images ![alt](url)
    text = text.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '<img src="$2" alt="$1">');
    // Strikethrough ~~text~~
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
    return escapeHtml(text);
  }

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fenceMatch = line.match(/^```(\w*)/);
    if (fenceMatch) {
      flushList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = fenceMatch[1] || '';
      } else {
        flushCode();
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      i++;
      continue;
    }

    // ATX heading
    const hMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      const content = inline(hMatch[2]);
      html += `<h${level}>${content}</h${level}>\n`;
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      flushList();
      html += '<hr>\n';
      i++;
      continue;
    }

    // Blockquote
    const bqMatch = line.match(/^>\s*(.*)/);
    if (bqMatch) {
      flushList();
      html += `<blockquote>${inline(bqMatch[1])}</blockquote>\n`;
      i++;
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^([*+-])\s+(.*)/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
      }
      html += `<li>${inline(ulMatch[2])}</li>\n`;
      i++;
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
        listStart = parseInt(olMatch[1], 10) || 1;
      }
      html += `<li>${inline(olMatch[2])}</li>\n`;
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      flushList();
      html += '\n';
      i++;
      continue;
    }

    // Paragraph
    flushList();
    const paraLines = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^(#{1,6})\s/) && !lines[i].match(/^([*+-]|\d+\.)\s/) && !lines[i].match(/^```/) && !lines[i].match(/^>\s/) && !/^[-*_]{3,}\s*$/.test(lines[i].trim())) {
      paraLines.push(lines[i]);
      i++;
    }
    html += `<p>${inline(paraLines.join(' '))}</p>\n`;
  }

  flushCode();
  flushList();

  return html;
}
