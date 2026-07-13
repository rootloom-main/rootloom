import { parse } from 'node-html-parser';
import { View, Text, Image } from '@react-pdf/renderer';
import React from 'react';

// Helper to parse CSS inline style string into a React Native/React PDF stylesheet object
export function parseInlineStyle(styleStr: string): any {
    if (!styleStr) return {};
    const styles: any = {};
    const declarations = styleStr.split(';');

    for (const decl of declarations) {
        const parts = decl.split(':');
        if (parts.length < 2) continue;
        const key = parts[0].trim().toLowerCase();
        let val: any = parts.slice(1).join(':').trim();

        // Convert key from kebab-case to camelCase
        const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

        // Process values
        if (typeof val === 'string') {
            if (val.endsWith('px')) {
                const num = parseFloat(val);
                if (!isNaN(num)) val = num;
            } else if (val.endsWith('mm')) {
                // Approximate mm to pt (1mm = 2.83465pt)
                const num = parseFloat(val);
                if (!isNaN(num)) val = num * 2.83465;
            } else if (val.endsWith('pt')) {
                const num = parseFloat(val);
                if (!isNaN(num)) val = num;
            } else if (!isNaN(Number(val)) && val !== '') {
                val = Number(val);
            }
        }

        styles[camelKey] = val;
    }

    // Expand padding shorthand
    if (styles.padding !== undefined) {
        const val = styles.padding;
        if (typeof val === 'number') {
            styles.paddingTop = val;
            styles.paddingBottom = val;
            styles.paddingLeft = val;
            styles.paddingRight = val;
        } else if (typeof val === 'string') {
            const parts = val.split(/\s+/).map(p => parseFloat(p)).filter(p => !isNaN(p));
            if (parts.length === 1) {
                styles.paddingTop = styles.paddingBottom = styles.paddingLeft = styles.paddingRight = parts[0];
            } else if (parts.length === 2) {
                styles.paddingTop = styles.paddingBottom = parts[0];
                styles.paddingLeft = styles.paddingRight = parts[1];
            } else if (parts.length === 3) {
                styles.paddingTop = parts[0];
                styles.paddingLeft = styles.paddingRight = parts[1];
                styles.paddingBottom = parts[2];
            } else if (parts.length === 4) {
                styles.paddingTop = parts[0];
                styles.paddingRight = parts[1];
                styles.paddingBottom = parts[2];
                styles.paddingLeft = parts[3];
            }
        }
        delete styles.padding;
    }

    // Expand margin shorthand
    if (styles.margin !== undefined) {
        const val = styles.margin;
        if (typeof val === 'number') {
            styles.marginTop = val;
            styles.marginBottom = val;
            styles.marginLeft = val;
            styles.marginRight = val;
        } else if (typeof val === 'string') {
            const parts = val.split(/\s+/).map(p => parseFloat(p)).filter(p => !isNaN(p));
            if (parts.length === 1) {
                styles.marginTop = styles.marginBottom = styles.marginLeft = styles.marginRight = parts[0];
            } else if (parts.length === 2) {
                styles.marginTop = styles.marginBottom = parts[0];
                styles.marginLeft = styles.marginRight = parts[1];
            } else if (parts.length === 3) {
                styles.marginTop = parts[0];
                styles.marginLeft = styles.marginRight = parts[1];
                styles.marginBottom = parts[2];
            } else if (parts.length === 4) {
                styles.marginTop = parts[0];
                styles.marginRight = parts[1];
                styles.marginBottom = parts[2];
                styles.marginLeft = parts[3];
            }
        }
        delete styles.margin;
    }

    // Expand border shorthand
    if (styles.border !== undefined) {
        const val = styles.border;
        if (typeof val === 'string') {
            const parts = val.split(/\s+/);
            const width = parseFloat(parts[0]);
            if (!isNaN(width)) styles.borderWidth = width;
            if (parts[1]) styles.borderStyle = parts[1];
            if (parts[2]) styles.borderColor = parts[2];
        }
        delete styles.border;
    }

    if (styles.borderBottom !== undefined) {
        const val = styles.borderBottom;
        if (typeof val === 'string') {
            const parts = val.split(/\s+/);
            const width = parseFloat(parts[0]);
            if (!isNaN(width)) styles.borderBottomWidth = width;
            if (parts[2]) styles.borderBottomColor = parts[2];
            else if (parts[1] && parts[1].startsWith('#')) styles.borderBottomColor = parts[1];
        }
        delete styles.borderBottom;
    }

    if (styles.borderTop !== undefined) {
        const val = styles.borderTop;
        if (typeof val === 'string') {
            const parts = val.split(/\s+/);
            const width = parseFloat(parts[0]);
            if (!isNaN(width)) styles.borderTopWidth = width;
            if (parts[2]) styles.borderTopColor = parts[2];
            else if (parts[1] && parts[1].startsWith('#')) styles.borderTopColor = parts[1];
        }
        delete styles.borderTop;
    }

    if (styles.borderLeft !== undefined) {
        const val = styles.borderLeft;
        if (typeof val === 'string') {
            const parts = val.split(/\s+/);
            const width = parseFloat(parts[0]);
            if (!isNaN(width)) styles.borderLeftWidth = width;
            if (parts[2]) styles.borderLeftColor = parts[2];
            else if (parts[1] && parts[1].startsWith('#')) styles.borderLeftColor = parts[1];
        }
        delete styles.borderLeft;
    }

    if (styles.borderRight !== undefined) {
        const val = styles.borderRight;
        if (typeof val === 'string') {
            const parts = val.split(/\s+/);
            const width = parseFloat(parts[0]);
            if (!isNaN(width)) styles.borderRightWidth = width;
            if (parts[2]) styles.borderRightColor = parts[2];
            else if (parts[1] && parts[1].startsWith('#')) styles.borderRightColor = parts[1];
        }
        delete styles.borderRight;
    }

    // Set font weight and normalize font family to standard react-pdf fonts
    const standardFonts = ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique', 'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique', 'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic'];

    const isBold = styles.fontWeight === 'bold' || Number(styles.fontWeight) > 500;

    if (styles.fontFamily) {
        const cleanedFont = styles.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
        const match = standardFonts.find(f => f.toLowerCase() === cleanedFont.toLowerCase());
        if (match) {
            styles.fontFamily = match;
        } else {
            styles.fontFamily = isBold ? 'Helvetica-Bold' : 'Helvetica';
        }
    } else if (isBold) {
        styles.fontFamily = 'Helvetica-Bold';
    }

    // Map display: flex to flexDirection: 'row' if not specified
    if (styles.display === 'flex' && !styles.flexDirection) {
        styles.flexDirection = 'row';
    }

    // Remove browser-only or unsupported properties before react-pdf renders.
    // Saved templates are authored as HTML/CSS, but react-pdf only supports a
    // smaller React Native style subset. Passing through raw browser CSS can
    // turn invoice downloads into 500s.
    delete styles.display;
    delete styles.borderCollapse;
    delete styles.float;
    delete styles.filter;
    delete styles.boxShadow;
    delete styles.overflow;
    delete styles.textTransform;
    delete styles.letterSpacing;
    delete styles.gap;
    delete styles.position;
    delete styles.zIndex;
    delete styles.left;
    delete styles.right;
    delete styles.top;
    delete styles.bottom;
    delete styles.maxWidth;
    delete styles.maxHeight;

    for (const [key, value] of Object.entries(styles)) {
        if (
            value === undefined ||
            value === null ||
            value === '' ||
            (typeof value === 'number' && !Number.isFinite(value))
        ) {
            delete styles[key];
        }
    }

    return styles;
}

// Convert HTML String to react-pdf Component Trees
export function compileHtmlToReactPdf(htmlStr: string): React.ReactNode {
    if (!htmlStr) return null;
    const root = parse(htmlStr);

    function getInheritableStyles(styles: any): any {
        const inheritable: any = {};
        if (styles.color !== undefined) inheritable.color = styles.color;
        if (styles.fontFamily !== undefined) inheritable.fontFamily = styles.fontFamily;
        if (styles.fontSize !== undefined) inheritable.fontSize = styles.fontSize;
        if (styles.fontWeight !== undefined) inheritable.fontWeight = styles.fontWeight;
        if (styles.textAlign !== undefined) inheritable.textAlign = styles.textAlign;
        if (styles.lineHeight !== undefined) inheritable.lineHeight = styles.lineHeight;
        return inheritable;
    }

    function renderNode(node: any, index: number, parentStyle: any = {}): React.ReactNode {
        // Text node
        if (node.nodeType === 3) {
            const text = node.text;
            if (text === '\n' || !text.trim()) return null;
            return text;
        }

        // Element node
        if (node.nodeType === 1) {
            const tagName = node.tagName.toLowerCase();
            const localStyle = parseInlineStyle(node.getAttribute('style') || '');

            // Merge parent inheritable styles with local inline styles
            const inlineStyles = {
                ...parentStyle,
                ...localStyle
            };

            let component: any = View;
            const props: any = { key: index, style: inlineStyles };

            if (tagName === 'table' || tagName === 'thead' || tagName === 'tbody') {
                component = View;
                inlineStyles.flexDirection = 'column';
                inlineStyles.width = inlineStyles.width || '100%';
            } else if (tagName === 'tr') {
                component = View;
                inlineStyles.flexDirection = 'row';
                inlineStyles.width = inlineStyles.width || '100%';
            } else if (tagName === 'td' || tagName === 'th') {
                component = View;
                inlineStyles.flexDirection = 'column';
                if (tagName === 'th') {
                    inlineStyles.fontWeight = 'bold';
                    inlineStyles.fontFamily = inlineStyles.fontFamily || 'Helvetica-Bold';
                }
            } else if (tagName === 'div') {
                component = View;
                inlineStyles.flexDirection = inlineStyles.flexDirection || 'column';
            } else if (['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'i', 'em'].includes(tagName)) {
                component = Text;
                if (['strong', 'b'].includes(tagName)) {
                    inlineStyles.fontWeight = 'bold';
                    inlineStyles.fontFamily = inlineStyles.fontFamily || 'Helvetica-Bold';
                }
            } else if (tagName === 'img') {
                const src = node.getAttribute('src');
                if (!src || src.trim() === '' || src.includes('{{') || src.includes('}}')) {
                    return null;
                }
                const isBase64 = src.startsWith('data:image/');
                const cleanSrc = src.split('?')[0].toLowerCase();
                const hasValidExt = cleanSrc.endsWith('.png') || cleanSrc.endsWith('.jpg') || cleanSrc.endsWith('.jpeg');

                if (!isBase64 && !hasValidExt) {
                    console.warn('Skipping invalid image for PDF:', src);
                    return null;
                }

                if (src.startsWith('http://') || src.startsWith('https://')) {
                    console.warn('Skipping remote image for PDF to keep invoice rendering reliable:', src);
                    return null;
                }

                component = Image;
                props.src = src;
                if (!inlineStyles.width && !inlineStyles.height) {
                    inlineStyles.width = 80;
                    inlineStyles.height = 'auto';
                }
            } else if (tagName === 'br') {
                return React.createElement(Text, { key: index }, '\n');
            }

            // Recursively render children with inheritable styles
            const inheritable = getInheritableStyles(inlineStyles);
            const children = node.childNodes
                .map((child: any, idx: number) => renderNode(child, idx, inheritable))
                .filter(Boolean);

            if (component === Text) {
                return React.createElement(component, props, ...children);
            }

            // Ensure any direct text children inside a View are wrapped in Text nodes
            const processedChildren = children.map((c: any, cidx: number) => {
                if (typeof c === 'string') {
                    return React.createElement(Text, {
                        key: `txt-${cidx}`,
                        style: {
                            fontSize: inlineStyles.fontSize || 10,
                            fontFamily: inlineStyles.fontFamily || 'Helvetica',
                            color: inlineStyles.color,
                            fontWeight: inlineStyles.fontWeight,
                            textAlign: inlineStyles.textAlign
                        }
                    }, c);
                }
                return c;
            });

            return React.createElement(component, props, ...processedChildren);
        }

        return null;
    }

    return root.childNodes
        .map((child, idx) => renderNode(child, idx))
        .filter(Boolean);
}
