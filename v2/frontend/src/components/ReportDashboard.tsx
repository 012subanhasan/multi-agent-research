'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  BarChart2,
  Network,
  BookOpen,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChartsView } from './ChartsView';
import { MermaidRenderer } from './MermaidRenderer';

interface ReportSection {
  heading: string;
  content: string;
}

interface ChartDataItem {
  label: string;
  value: number;
}

interface ChartSpec {
  title: string;
  type: string;
  data: ChartDataItem[];
}

export interface VisualReport {
  title: string;
  subtitle: string;
  summary: string;
  key_findings: string[];
  charts: ChartSpec[];
  mermaid_diagram: string;
  sections: ReportSection[];
}

interface ReportDashboardProps {
  report: VisualReport;
  cached?: boolean;
}

/**
 * Sanitizes Mermaid code:
 * 1. Native ER Diagram Sanitizer: Repairs split relationship lines and operator spaces in-place without truncating entity names.
 * 2. Prevents Subgraph and Node ID collisions in Flowcharts.
 * 3. Discards non-Mermaid header titles.
 */
const sanitizeMermaidCode = (code: string): string => {
  if (!code || typeof code !== 'string') return '';

  let clean = code.trim();

  clean = clean.replace(/\[\s*"([^"]*?)\\n([^"]*?)"\s*\]/g, '["$1<br/>$2"]');
  clean = clean.replace(/\[\s*"([^"]*?)\n([^"]*?)"\s*\]/g, '["$1<br/>$2"]');

  // Find the start of the actual Mermaid diagram keyword and strip any preceding text/headers
  const keywordMatch = clean.match(
    /\b(?:graph|flowchart|sequenceDiagram|classDiagram|erDiagram|gantt|stateDiagram-v2|stateDiagram|mindmap|pie|gitGraph|C4Context|%%{init)\b/i
  );

  if (keywordMatch && keywordMatch.index !== undefined) {
    clean = clean.slice(keywordMatch.index);
  }

  // Native ER Diagram Sanitizer: Cleanly repair split lines and operator spaces without modifying entity names
  if (/^\s*erDiagram\b/i.test(clean)) {
    clean = clean.replace(/\r\n/g, '\n');

    // Fix spaces within ER relationship operators
    clean = clean
      .replace(/\|\s+\|/g, '||')
      .replace(/\|\s+\-\-/g, '|--')
      .replace(/\-\-\s+o\{/g, '--o{')
      .replace(/\.\.\s+o\{/g, '..o{')
      .replace(/\}\s+\|\./g, '}|..')
      .replace(/\|\s+\-\-\s*o\{/g, '|--o{')
      .replace(/\|\s+\-\-\s*\|/g, '|--|')
      .replace(/\|\s*\|\s*\-\-\s*o\{/g, '||--o{')
      .replace(/\|\s*\|\s*\-\-\s*\|/g, '||--|')
      .replace(/\|\s*\|\s*\.\.\s*\|/g, '||..|')
      .replace(/\}\s*\|\s*\.\.\s*\|/g, '}|..|');

    const lines = clean.split('\n');
    const fixedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // If line is a relationship continuation starting with pipe/brace, join it with the previous line
      if ((line.startsWith('|') || line.startsWith('}')) && fixedLines.length > 0 && !line.includes('{') && !line.includes('}')) {
        const prev = fixedLines[fixedLines.length - 1];
        fixedLines[fixedLines.length - 1] = prev + ' ' + line.replace(/^\|\s*/, '');
      } else {
        fixedLines.push(lines[i]);
      }
    }
    return fixedLines.join('\n').trim();
  }

  // Extract all node IDs to prevent Subgraph/Node ID collisions in Flowcharts
  const nodeIds = new Set<string>();
  const nodeMatches = clean.matchAll(/\b([A-Za-z0-9_-]+)\s*\[/g);
  for (const m of nodeMatches) {
    if (m[1]) nodeIds.add(m[1]);
  }

  const lines = clean.split('\n');
  const sanitizedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    if (!trimmed) continue;

    const isCommaLine = /^,\s*/.test(trimmed);
    const isRawStyleProps = /^(stroke|fill|color|stroke-width|font-size|font-family|stroke-dasharray)\s*:/i.test(
      trimmed.replace(/^,\s*/, '')
    );

    if (isCommaLine || (isRawStyleProps && !/^(style|classDef|linkStyle|class)\b/i.test(trimmed))) {
      const styleFragment = trimmed.replace(/^,\s*/, '');
      if (sanitizedLines.length > 0) {
        const lastIdx = sanitizedLines.length - 1;
        if (/^(style|classDef|linkStyle|class)\b/i.test(sanitizedLines[lastIdx].trim())) {
          sanitizedLines[lastIdx] = `${sanitizedLines[lastIdx].trimEnd()},${styleFragment}`;
        }
      }
      continue;
    }

    if (/^\s*subgraph\b/i.test(trimmed)) {
      trimmed = trimmed.replace(/^\s*subgraph\s+([A-Za-z0-9_-]+)(.*)$/i, (_m, subId, rest) => {
        let finalSubId = subId;
        if (nodeIds.has(subId) || ['pg', 'api', 'db', 'merchant', 'settlement'].includes(subId.toLowerCase())) {
          finalSubId = `sub_${subId}`;
        }
        return `subgraph ${finalSubId}${rest}`;
      });

      trimmed = trimmed.replace(/^(\s*subgraph\s+[A-Za-z0-9_-]+)\s*\[\s*([^\]]+)\s*\]/gi, (_m, g1, title) => {
        const cleanTitle = title.replace(/^"/, '').replace(/"$/, '').replace(/"/g, "'");
        return `${g1} ["${cleanTitle}"]`;
      });
      line = trimmed;
    }

    line = line.replace(/(\b[A-Za-z0-9_-]+)\[\(\s*([^"\)\n]+?)\s*\)\]/g, (_m, id, label) => {
      return `${id}[("${label.replace(/"/g, "'").trim()}")]`;
    });

    line = line.replace(/(\b[A-Za-z0-9_-]+)\[\s*(?!"\vert{}\()([^"\]\n]+?)\s*\]/g, (_m, id, label) => {
      return `${id}["${label.replace(/"/g, "'").trim()}"]`;
    });

    sanitizedLines.push(line);
  }

  const headerRegex =
    /^(?:graph|flowchart|sequenceDiagram|classDiagram|erDiagram|gantt|stateDiagram-v2|stateDiagram|mindmap|pie|gitGraph|C4Context|%%{init)\b/i;
  const firstNonCommentLine = sanitizedLines.find((l) => !l.trim().startsWith('%%'));

  if (sanitizedLines.length > 0 && firstNonCommentLine && !headerRegex.test(firstNonCommentLine.trim())) {
    sanitizedLines.unshift('flowchart TD');
  }

  return sanitizedLines.join('\n').trim();
};

const wrapUnwrappedMermaid = (input: string): string => {
  if (!input || typeof input !== 'string') return '';

  const strictMermaidHeaderRegex =
    /^(?:graph\s+(?:TD|LR|TB|RL|BT)|flowchart\s+(?:TD|LR|TB|RL|BT)|sequenceDiagram|classDiagram|erDiagram|gantt|stateDiagram-v2|stateDiagram|mindmap|pie|gitGraph|C4Context)\b/i;

  const lines = input.split('\n');
  const resultLines: string[] = [];
  let inFencedBlock = false;
  let inMermaidCollect = false;
  let mermaidBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('```')) {
      inFencedBlock = !inFencedBlock;
      if (inMermaidCollect) {
        const code = sanitizeMermaidCode(mermaidBuffer.join('\n'));
        if (code) {
          resultLines.push('```mermaid\n' + code + '\n```');
        } else {
          resultLines.push(...mermaidBuffer);
        }
        mermaidBuffer = [];
        inMermaidCollect = false;
      }
      resultLines.push(line);
      continue;
    }

    if (inFencedBlock) {
      resultLines.push(line);
      continue;
    }

    if (!inMermaidCollect && strictMermaidHeaderRegex.test(trimmedLine)) {
      inMermaidCollect = true;
      mermaidBuffer.push(line);
      continue;
    }

    if (inMermaidCollect) {
      const isMermaidLine =
        trimmedLine === '' ||
        trimmedLine.startsWith('%%') ||
        /^(subgraph|end|style|classDef|class|linkStyle|click|direction|participant|actor|autonumber|activate|deactivate|loop|alt|else|opt|par|critical|option|break|rect|note)\b/i.test(
          trimmedLine
        ) ||
        /^[,\.:]/.test(trimmedLine) ||
        /^(stroke|fill|color|stroke-width|font-size|font-family):/i.test(trimmedLine) ||
        trimmedLine.includes('-->') ||
        trimmedLine.includes('---') ||
        trimmedLine.includes('==>') ||
        trimmedLine.includes('-.-') ||
        trimmedLine.includes('->>') ||
        trimmedLine.includes('-->>') ||
        trimmedLine.includes('->') ||
        /^[A-Za-z0-9_-]+[\[\(\{\>"]/.test(trimmedLine) ||
        line.startsWith(' ') ||
        line.startsWith('\t');

      const isMarkdownHeader = /^#{1,6}\s/.test(trimmedLine);

      if (isMarkdownHeader || (!isMermaidLine && trimmedLine.length > 0)) {
        const code = sanitizeMermaidCode(mermaidBuffer.join('\n'));
        if (code) {
          resultLines.push('```mermaid\n' + code + '\n```\n');
        } else {
          resultLines.push(...mermaidBuffer);
        }
        mermaidBuffer = [];
        inMermaidCollect = false;
        resultLines.push(line);
      } else {
        mermaidBuffer.push(line);
      }
      continue;
    }

    resultLines.push(line);
  }

  if (inMermaidCollect && mermaidBuffer.length > 0) {
    const code = sanitizeMermaidCode(mermaidBuffer.join('\n'));
    if (code) {
      resultLines.push('```mermaid\n' + code + '\n```');
    } else {
      resultLines.push(...mermaidBuffer);
    }
  }

  return resultLines.join('\n');
};

const preprocessMarkdown = (rawText: string = ''): string => {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText.replace(/\\n/g, '\n');

  text = text.replace(/\|\s*\|+/g, '|\n|');
  text = text.replace(/([^\n])\n(\|[^\n]+\|\n\|[-:\s|]+\|)/g, '$1\n\n$2');
  text = text.replace(/(\|[^\n]+\|)\n([^\|\n#\s\d\*-])/g, '$1\n\n$2');
  text = text.replace(/([^\n])\n([0-9]+\.[0-9]+\s+[A-Z])/g, '$1\n\n$2');

  text = text
    .replace(/\\le\b/g, '≤')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\times\b/g, '×')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\tau_\{?ij\}?/g, 'τᵢⱼ')
    .replace(/\\tau\b/g, 'τ')
    .replace(/\\mathbb\{G\}_o/g, '𝔾ₒ')
    .replace(/\\mu_i\b/g, 'μᵢ')
    .replace(/\\lambda_i\b/g, 'λᵢ')
    .replace(/\\rho_i\b/g, 'ρᵢ')
    .replace(/\\mu\b/g, 'μ')
    .replace(/\\lambda\b/g, 'λ')
    .replace(/\\rho\b/g, 'ρ')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\sigma\b/g, 'σ')
    .replace(/\\theta\b/g, 'θ');

  text = wrapUnwrappedMermaid(text);

  return text;
};

const MermaidStyleFix = () => (
  <style>{`
    .mermaid-svg-container svg {
      max-width: 100% !important;
      height: auto !important;
      margin: 0 auto;
    }
  `}</style>
);

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  return (
    <>
      <MermaidStyleFix />
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const isMermaid = match && match[1] === 'mermaid';

            if (isMermaid) {
              const cleanCode = sanitizeMermaidCode(String(children));

              return (
                <div className="my-6 w-full overflow-x-auto rounded-2xl bg-slate-950 p-4 border border-slate-800 shadow-xl">
                  <div className="min-w-[650px]">
                    <MermaidRenderer chart={cleanCode} />
                  </div>
                </div>
              );
            }

            const isInline = !match && !String(children).includes('\n');

            if (isInline) {
              return (
                <code
                  className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-xs font-semibold text-indigo-300 border border-slate-700/50"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <pre
                className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto border border-slate-800/80 my-3"
                {...props}
              >
                <code>{children}</code>
              </pre>
            );
          },
          table({ children }: any) {
            return (
              <div className="overflow-x-auto my-6 rounded-xl border border-slate-800 bg-slate-950/80 shadow-xl">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }: any) {
            return (
              <thead className="bg-indigo-950/60 text-indigo-300 border-b border-slate-800 font-semibold uppercase text-[11px] tracking-wider">
                {children}
              </thead>
            );
          },
          th({ children }: any) {
            return (
              <th className="px-4 py-3 text-indigo-300 font-bold border-r border-slate-800/50 last:border-r-0">
                {children}
              </th>
            );
          },
          td({ children }: any) {
            return (
              <td className="px-4 py-3 border-t border-slate-800/60 text-slate-300 leading-relaxed border-r border-slate-800/30 last:border-r-0">
                {children}
              </td>
            );
          },
          tr({ children }: any) {
            return (
              <tr className="hover:bg-slate-900/50 transition-colors even:bg-slate-900/20">
                {children}
              </tr>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </>
  );
};

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ report, cached }) => {
  const [copied, setCopied] = useState(false);

  const [openSections, setOpenSections] = useState<Set<number>>(() => {
    return new Set(report?.sections?.map((_, idx) => idx) || []);
  });

  useEffect(() => {
    if (report?.sections) {
      setOpenSections(new Set(report.sections.map((_, idx) => idx)));
    }
  }, [report]);

  const toggleSection = (idx: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleAllSections = () => {
    if (!report?.sections) return;
    if (openSections.size === report.sections.length) {
      setOpenSections(new Set());
    } else {
      setOpenSections(new Set(report.sections.map((_, idx) => idx)));
    }
  };

  const handleCopyJson = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!report) return;

    let md = `# ${report.title || 'Report'}\n\n*${report.subtitle || ''}*\n\n## Executive Summary\n${report.summary || ''
      }\n\n## Key Findings\n`;

    report.key_findings?.forEach((kf) => {
      md += `- ${kf}\n`;
    });

    md += `\n## Report Sections\n`;
    report.sections?.forEach((sec) => {
      md += `### ${sec.heading}\n${preprocessMarkdown(sec.content)}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (report.title || 'report').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${safeTitle}_report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!report) return null;

  return (
    <div className="w-full space-y-8 animate-fadeIn">
      {/* Report Header Card */}
      <div className="glass-panel p-8 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden bg-slate-900/60 backdrop-blur-md">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Multi-Agent Synthesis
              </span>
              {cached && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  MongoDB Cached
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
              </button>

              <button
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs text-indigo-300 font-medium transition-all shadow-sm shadow-indigo-500/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export Markdown</span>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{report.title}</h2>
            <p className="text-sm md:text-base text-slate-400 font-medium mt-1">{report.subtitle}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1.5">
              Executive Summary
            </h4>
            <div className="text-sm text-slate-200 leading-relaxed">
              <MarkdownContent content={preprocessMarkdown(report.summary)} />
            </div>
          </div>
        </div>
      </div>

      {/* Key Verified Findings */}
      {report.key_findings && report.key_findings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">Verified Key Insights</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.key_findings.map((finding, idx) => (
              <div
                key={idx}
                className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 flex items-start gap-3 hover:border-indigo-500/30 transition-all"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 mt-0.5">
                  {idx + 1}
                </span>
                <div className="text-xs md:text-sm text-slate-200 leading-relaxed">
                  <MarkdownContent content={preprocessMarkdown(finding)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Charts View */}
      {report.charts && report.charts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">Data Visualizations & Metrics</h3>
          </div>
          <ChartsView charts={report.charts} />
        </div>
      )}

      {/* Standalone Mermaid Diagram */}
      {report.mermaid_diagram && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">Concept & Architecture Diagram</h3>
          </div>
          <div className="w-full overflow-x-auto rounded-2xl bg-slate-950 p-4 border border-slate-800">
            <div className="min-w-[650px]">
              <MermaidRenderer chart={sanitizeMermaidCode(report.mermaid_diagram)} />
            </div>
          </div>
        </div>
      )}

      {/* Detailed Report Sections */}
      {report.sections && report.sections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">Detailed Analysis Sections</h3>
            </div>

            <button
              onClick={toggleAllSections}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
            >
              {openSections.size === report.sections.length ? 'Collapse All' : 'Expand All'}
            </button>
          </div>

          <div className="space-y-3">
            {report.sections.map((section, idx) => {
              const isOpen = openSections.has(idx);
              const cleanContent = preprocessMarkdown(section.content);

              return (
                <div
                  key={idx}
                  className="glass-panel rounded-2xl border border-slate-800/80 bg-slate-900/40 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleSection(idx)}
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-900/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <h4 className="text-base font-semibold text-slate-100">{section.heading}</h4>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-4 border-t border-slate-800/50 text-sm text-slate-300 space-y-3 prose prose-invert max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-strong:text-indigo-300 prose-table:border-slate-800">
                      <MarkdownContent content={cleanContent} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};