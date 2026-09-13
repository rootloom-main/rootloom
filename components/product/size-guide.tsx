'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Ruler, Info, Check, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParsedSizeGuide {
  headers: string[];
  rows: { size: string; values: string[] }[];
  instructions: { title: string; description: string }[];
  hasInches: boolean;
}

/**
 * Parse markdown table and measurement text into structured data
 */
function parseSizeGuide(raw: string | undefined | null): ParsedSizeGuide | null {
  if (!raw || typeof raw !== 'string') return null;

  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const tableLines = lines.filter((l) => l.startsWith('|') && l.endsWith('|'));
  const textLines = lines.filter((l) => !l.startsWith('|'));

  if (tableLines.length < 2) return null;

  // Header row
  const headers = tableLines[0]
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean);

  // Data rows
  const rows: { size: string; values: string[] }[] = [];
  for (let i = 1; i < tableLines.length; i++) {
    const line = tableLines[i];
    // Skip divider line like | --- | --- |
    if (line.replace(/[\s|\-:]/g, '').length === 0) continue;
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length > 0) {
      rows.push({
        size: cells[0],
        values: cells,
      });
    }
  }

  // Parse measurement instructions
  const instructions: { title: string; description: string }[] = [];
  const joinedText = textLines.join('\n').replace(/\*{2,}/g, ''); // strip asterisks
  const instructionBlocks = joinedText
    .split(/\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const block of instructionBlocks) {
    const colonMatch = block.match(/^([^:\n]+):\s*([\s\S]+)$/);
    if (colonMatch) {
      instructions.push({
        title: colonMatch[1].trim(),
        description: colonMatch[2].trim(),
      });
    } else if (block.length > 5) {
      instructions.push({
        title: 'Note',
        description: block,
      });
    }
  }

  const hasInches = headers.some((h) => /inch/i.test(h));

  return {
    headers,
    rows,
    instructions,
    hasInches,
  };
}

// Fallback sizing data when product has no custom size guide
const DEFAULT_HEADERS = ['Size', 'Chest', 'Waist', 'Hip', 'Length'];
const DEFAULT_ROWS_CM = [
  { size: 'XS', values: ['XS', '84', '68', '90', '64'] },
  { size: 'S', values: ['S', '88', '72', '94', '65'] },
  { size: 'M', values: ['M', '92', '76', '98', '66'] },
  { size: 'L', values: ['L', '96', '80', '102', '67'] },
  { size: 'XL', values: ['XL', '100', '84', '106', '68'] },
  { size: 'XXL', values: ['XXL', '104', '88', '110', '69'] },
];

const DEFAULT_INSTRUCTIONS = [
  {
    title: 'Chest',
    description: 'Measure around the fullest part of your chest, keeping the tape measure horizontal.',
  },
  {
    title: 'Waist',
    description: 'Measure around your natural waistline, where you normally wear your trousers or skirt.',
  },
  {
    title: 'Hips',
    description: 'Measure around the fullest part of your hips, standing with feet together.',
  },
  {
    title: 'Length',
    description: 'Measure from the highest point of the shoulder seam down to the bottom hem.',
  },
];

export interface SizeGuideContentProps {
  sizeGuideData?: string | null;
  selectedSize?: string | null;
  productName?: string;
  isModal?: boolean;
}

export function SizeGuideContent({
  sizeGuideData,
  selectedSize,
  isModal = false,
}: SizeGuideContentProps) {
  const parsed = parseSizeGuide(sizeGuideData);
  const [unit, setUnit] = useState<'in' | 'cm'>(parsed?.hasInches ? 'in' : 'cm');

  // Convert values between inches and cm if applicable
  const formatValue = (val: string, header: string, colIndex: number): string => {
    // If it's the size column (e.g. S, M, L, XL), return as is
    if (colIndex === 0 || /^(size|brand size)$/i.test(header.trim())) {
      return val;
    }

    const num = parseFloat(val);
    if (isNaN(num)) return val;

    if (parsed) {
      const colIsInches = /inch/i.test(header);
      if (colIsInches && unit === 'cm') {
        // Convert inches to cm
        return (num * 2.54).toFixed(1).replace(/\.0$/, '');
      } else if (!colIsInches && unit === 'in') {
        // Assume cm, convert to inches
        return (num / 2.54).toFixed(1).replace(/\.0$/, '');
      }
      return val;
    } else {
      // Default table is in CM
      if (unit === 'in') {
        return (num / 2.54).toFixed(1).replace(/\.0$/, '');
      }
      return val;
    }
  };

  const getDisplayHeader = (header: string): string => {
    if (/^(size|brand size)$/i.test(header.trim())) return header;
    if (unit === 'cm') {
      return header.replace(/\(inches\)/i, '(cm)').replace(/\bin\b/i, 'cm');
    } else {
      return header.replace(/\(cm\)/i, '(inches)').replace(/\bcm\b/i, 'in');
    }
  };

  const headers = parsed ? parsed.headers : DEFAULT_HEADERS.map((h) => (h === 'Size' ? h : `${h} (${unit})`));
  const rows = parsed
    ? parsed.rows
    : unit === 'in'
    ? DEFAULT_ROWS_CM.map((r) => ({
        size: r.size,
        values: r.values.map((v, i) =>
          i === 0 ? v : (parseFloat(v) / 2.54).toFixed(1).replace(/\.0$/, '')
        ),
      }))
    : DEFAULT_ROWS_CM;
  const instructions = parsed?.instructions.length ? parsed.instructions : DEFAULT_INSTRUCTIONS;

  return (
    <div className={cn('space-y-6 w-full max-w-full min-w-0', isModal ? 'py-1' : '')}>
      {/* Header controls: Selected size badge & Unit Toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-stone-50 p-3 sm:p-3.5 rounded-2xl border border-stone-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-deep-forest/10 flex items-center justify-center text-deep-forest shrink-0">
            <Ruler className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-700">Measurement Unit</p>
            <p className="text-[11px] text-stone-400">
              {unit === 'in' ? 'Showing sizes in inches' : 'Showing sizes in centimeters'}
            </p>
          </div>
        </div>

        {/* Unit Toggle Pill */}
        <div className="inline-flex items-center p-1 bg-white rounded-xl border border-stone-200 shadow-sm shrink-0">
          <button
            type="button"
            onClick={() => setUnit('in')}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-bold transition-all',
              unit === 'in'
                ? 'bg-deep-forest text-white shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            )}
          >
            Inches (in)
          </button>
          <button
            type="button"
            onClick={() => setUnit('cm')}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-bold transition-all',
              unit === 'cm'
                ? 'bg-deep-forest text-white shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            )}
          >
            CM (cm)
          </button>
        </div>
      </div>

      {/* Selected Size Highlight Indicator */}
      {selectedSize && (
        <div className="flex items-center gap-2 text-xs text-moss-olive font-semibold bg-moss-olive/10 border border-moss-olive/20 px-3.5 py-2 rounded-xl">
          <Check className="h-3.5 w-3.5 shrink-0" />
          <span>
            You have selected size <strong className="text-deep-forest underline">{selectedSize}</strong>. See highlighted row below.
          </span>
        </div>
      )}

      {/* Sizing Table */}
      <div className="overflow-hidden rounded-2xl border border-stone-200/80 shadow-sm bg-white w-full max-w-full min-w-0">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-stone-300 w-full max-w-full">
          <table className="w-full text-left border-collapse min-w-[340px]">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200/80 text-stone-600 text-[11px] font-bold uppercase tracking-wider">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className={cn(
                      'px-3.5 sm:px-4 py-3 sm:py-3.5 text-center whitespace-nowrap',
                      i === 0 ? 'text-left font-extrabold text-deep-forest pl-4 sm:pl-5' : ''
                    )}
                  >
                    {getDisplayHeader(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
              {rows.map((row, idx) => {
                const isSelected =
                  selectedSize &&
                  (row.size.toLowerCase() === selectedSize.toLowerCase() ||
                    row.values.some((v) => v.toLowerCase() === selectedSize.toLowerCase()));

                return (
                  <tr
                    key={idx}
                    className={cn(
                      'transition-colors duration-150',
                      isSelected
                        ? 'bg-deep-forest/5 font-bold text-deep-forest relative'
                        : idx % 2 === 0
                        ? 'bg-white hover:bg-stone-50/70'
                        : 'bg-stone-50/40 hover:bg-stone-50'
                    )}
                  >
                    {row.values.map((val, colIdx) => (
                      <td
                        key={colIdx}
                        className={cn(
                          'px-3.5 sm:px-4 py-3 text-center whitespace-nowrap',
                          colIdx === 0 ? 'text-left font-bold pl-4 sm:pl-5' : 'text-stone-600',
                          isSelected && colIdx === 0 ? 'text-deep-forest' : ''
                        )}
                      >
                        {colIdx === 0 && isSelected ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-deep-forest animate-pulse" />
                            {val}
                            <span className="text-[10px] bg-deep-forest text-white px-1.5 py-0.5 rounded font-black tracking-wide ml-1">
                              YOUR SIZE
                            </span>
                          </span>
                        ) : (
                          formatValue(val, headers[colIdx] || '', colIdx)
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* How to Measure Guidance */}
      {instructions.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-stone-800">
            <HelpCircle className="h-4 w-4 text-moss-olive shrink-0" />
            <h4 className="text-sm font-bold tracking-tight">How to Measure for Best Fit</h4>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {instructions.map((inst, i) => (
              <div
                key={i}
                className="bg-stone-50/80 rounded-xl p-3.5 border border-stone-100/90 text-xs space-y-1 hover:border-stone-200 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-moss-olive bg-moss-olive/10 px-2 py-0.5 rounded">
                    {inst.title}
                  </span>
                </div>
                <p className="text-stone-600 leading-relaxed text-[11px] sm:text-xs">
                  {inst.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sizing tip footer */}
      <div className="flex items-start gap-2 bg-amber-50/80 border border-amber-200/70 rounded-xl p-3 text-xs text-amber-800">
        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-snug text-[11px] sm:text-xs">
          <strong>Fit Tip:</strong> Measurements refer to standard garment specifications. If you are between two sizes or prefer a looser, relaxed look, we recommend choosing the larger size.
        </p>
      </div>
    </div>
  );
}

export interface SizeGuideProps {
  sizeGuideData?: string | null;
  selectedSize?: string | null;
  productName?: string;
}

export function SizeGuide({ sizeGuideData, selectedSize, productName }: SizeGuideProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="link"
          className="p-0 h-auto text-moss-olive hover:text-deep-forest text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors underline-offset-4 hover:underline cursor-pointer"
        >
          <Ruler className="w-3.5 h-3.5" />
          Size Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-5 sm:p-6 rounded-2xl">
        <DialogHeader className="pb-2 border-b border-stone-100">
          <DialogTitle className="font-serif text-xl sm:text-2xl text-deep-forest">
            Size & Fit Guide
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-500">
            {productName
              ? `Measurement details for ${productName}`
              : 'Find your perfect fit with our accurate size chart.'}
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <SizeGuideContent
            sizeGuideData={sizeGuideData}
            selectedSize={selectedSize}
            productName={productName}
            isModal={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

