import { compileHtmlToReactPdf } from './html-to-pdf';
import { renderToBuffer, Document, Page } from '@react-pdf/renderer';
import React from 'react';

// Read HTML from stdin
let htmlData = '';
process.stdin.on('data', chunk => {
    htmlData += chunk;
});

process.stdin.on('end', async () => {
    try {
        const reactElements = compileHtmlToReactPdf(htmlData);
        
        // Parse paper settings from CLI arguments
        const paperSize = process.argv[2] === 'Letter' ? 'LETTER' : 'A4';
        const orientation = process.argv[3] === 'landscape' ? 'landscape' : 'portrait';
        
        const topMargin = process.argv[4] !== undefined ? Number(process.argv[4]) : 30;
        const bottomMargin = process.argv[5] !== undefined ? Number(process.argv[5]) : 30;
        const leftMargin = process.argv[6] !== undefined ? Number(process.argv[6]) : 30;
        const rightMargin = process.argv[7] !== undefined ? Number(process.argv[7]) : 30;

        const documentElement = React.createElement(Document, {}, 
            React.createElement(Page, { 
                size: paperSize,
                orientation: orientation,
                style: {
                    paddingTop: topMargin,
                    paddingBottom: bottomMargin,
                    paddingLeft: leftMargin,
                    paddingRight: rightMargin,
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'Helvetica',
                    fontSize: 10
                }
            }, ...reactElements as any)
        );

        const pdfBuffer = await renderToBuffer(documentElement as any);
        process.stdout.write(pdfBuffer);
        process.exit(0);
    } catch (err) {
        console.error('CLI PDF compilation failed:', err);
        process.exit(1);
    }
});
