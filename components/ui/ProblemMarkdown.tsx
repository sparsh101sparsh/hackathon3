'use client';

import React from 'react';

type ProblemMarkdownSize = 'default' | 'compact';

function renderMath(value: string) {
  const normalized = value
    .replace(/\\times/g, '×')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\lt/g, '<')
    .replace(/\\gt/g, '>')
    .replace(/\\textit\{([^}]+)\}/g, '$1')
    .replace(/\\_/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  const pieces = normalized.split(/(\^[+-]?\d+)/g);

  return pieces.map((piece, index) => {
    if (piece.startsWith('^')) {
      return <sup key={`${piece}-${index}`}>{piece.slice(1)}</sup>;
    }
    return <React.Fragment key={`${piece}-${index}`}>{piece}</React.Fragment>;
  });
}

function inlineParts(value: string) {
  return value.split(/(\*\*[^*]+\*\*|`[^`]+`|\$[^$\n]+\$|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`} className="font-bold text-slate-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${part}-${index}`} className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-amber-300">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      return (
        <span key={`${part}-${index}`} className="font-mono text-amber-200">
          {renderMath(part.slice(1, -1))}
        </span>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`${part}-${index}`} className="italic text-slate-100">{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

interface ProblemMarkdownProps {
  content: string;
  className?: string;
  size?: ProblemMarkdownSize;
}

export function ProblemMarkdown({ content, className = '', size = 'default' }: ProblemMarkdownProps) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  const isCompact = size === 'compact';
  const paragraphClass = isCompact ? 'leading-relaxed text-slate-300' : 'leading-7 text-slate-300';
  const listClass = isCompact ? 'list-disc space-y-1 pl-4 text-slate-300' : 'list-disc space-y-1 pl-5 text-slate-300';

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className={listClass}>
        {listItems.map((item, index) => <li key={`${item}-${index}`}>{inlineParts(item)}</li>)}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
      return;
    }
    flushList();
    if (!trimmed) {
      blocks.push(<div key={`space-${index}`} className="h-2" aria-hidden="true" />);
    } else if (trimmed.startsWith('### ')) {
      blocks.push(<h4 key={`heading-${index}`} className="pt-2 text-sm font-bold text-white">{inlineParts(trimmed.slice(4))}</h4>);
    } else if (trimmed.startsWith('## ')) {
      blocks.push(<h3 key={`heading-${index}`} className="pt-2 text-base font-bold text-white">{inlineParts(trimmed.slice(3))}</h3>);
    } else {
      blocks.push(<p key={`paragraph-${index}`} className={paragraphClass}>{inlineParts(line)}</p>);
    }
  });
  flushList();

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
}
