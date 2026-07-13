import 'server-only';

import { parse, type HTMLElement } from 'node-html-parser';

const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h2',
  'h3',
  'h4',
  'hr',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'u',
  'ul',
]);

const ALLOWED_ATTRS = new Set(['class', 'href', 'rel', 'target', 'title']);

function isSafeUrl(value: string) {
  try {
    const url = new URL(value, 'https://rootloom.in');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function sanitizeElement(node: HTMLElement) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType !== 1) {
      continue;
    }

    const element = child as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      element.replaceWith(...element.childNodes);
      continue;
    }

    for (const attrName of Object.keys(element.attributes)) {
      const normalizedAttr = attrName.toLowerCase();
      const attrValue = element.getAttribute(attrName) || '';

      if (
        normalizedAttr.startsWith('on') ||
        normalizedAttr === 'style' ||
        !ALLOWED_ATTRS.has(normalizedAttr)
      ) {
        element.removeAttribute(attrName);
        continue;
      }

      if (normalizedAttr === 'href' && !isSafeUrl(attrValue)) {
        element.removeAttribute(attrName);
      }
    }

    if (tagName === 'a') {
      const target = element.getAttribute('target');
      if (target === '_blank') {
        element.setAttribute('rel', 'noopener noreferrer');
      }
    }

    sanitizeElement(element);
  }
}

export function sanitizeHtml(html: string) {
  const root = parse(html || '', {
    blockTextElements: {
      script: false,
      style: false,
      pre: true,
    },
  });

  sanitizeElement(root);
  return root.toString();
}
