'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface MermaidRendererProps {
  chart: string;
}

const generateSafeFallbackFlowchart = (failedChart: string): string => {
  try {
    const lines = failedChart.split('\n');
    const entities = new Set<string>();
    const relations: { from: string; to: string; label: string }[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const relMatch = trimmed.match(/^([A-Z0-9_]+)\s*([|}|o\-\.>=]+)\s*([A-Z0-9_]+)(?:\s*:\s*"([^"]+)")?/i);
      if (relMatch) {
        const from = relMatch[1];
        const to = relMatch[3];
        const label = relMatch[4] || '';
        if (from && to && from !== 'erDiagram' && to !== 'erDiagram') {
          entities.add(from);
          entities.add(to);
          relations.push({ from, to, label });
        }
      }
      const blockMatch = trimmed.match(/^([A-Z0-9_]+)\s*\{/i);
      if (blockMatch && blockMatch[1]) {
        entities.add(blockMatch[1]);
      }
    }

    if (entities.size > 0) {
      let fallback = 'flowchart TD\n';
      for (const ent of entities) {
        fallback += `  ${ent}["${ent}"]\n`;
      }
      for (const rel of relations) {
        if (rel.label) {
          fallback += `  ${rel.from} -->|"${rel.label}"| ${rel.to}\n`;
        } else {
          fallback += `  ${rel.from} --> ${rel.to}\n`;
        }
      }
      return fallback;
    }
  } catch (e) {
    console.error('Fallback generation error:', e);
  }

  return `flowchart TD
    Err["Diagram Schema"]
    Note["Entity Relationship Model Rendered"]
    Err --> Note
  `;
};

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      themeVariables: {
        darkMode: true,
        background: '#090d16',
        primaryColor: '#1e293b',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#475569',
        lineColor: '#64748b',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
        edgeLabelBackground: '#1e293b',
        clusterBkg: '#0f172a',
        clusterBorder: '#334155',
        defaultLinkColor: '#64748b',
        titleColor: '#f8fafc',
        actorBkg: '#1e293b',
        actorBorder: '#475569',
        actorTextColor: '#f8fafc',
        signalColor: '#818cf8',
        signalTextColor: '#f8fafc',
        noteBkg: '#334155',
        noteBorder: '#64748b',
        noteTextColor: '#f8fafc',
      },
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 14,
      flowchart: {
        htmlLabels: true,
        useMaxWidth: false,
        curve: 'basis',
        nodeSpacing: 50,
        rankSpacing: 50,
      },
      er: {
        useMaxWidth: false,
      },
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;

    const renderChart = async () => {
      if (!chart || !chart.trim()) {
        if (isMounted) {
          setError(null);
          setSvgContent('');
        }
        return;
      }

      let chartToRender = chart;

      try {
        let isValid = await mermaid.parse(chartToRender).catch(() => false);

        if (!isValid) {
          chartToRender = generateSafeFallbackFlowchart(chart);
          isValid = await mermaid.parse(chartToRender).catch(() => false);
        }

        if (!isValid) {
          if (isMounted) {
            setError('Unable to parse diagram syntax.');
          }
          return;
        }

        const { svg: renderedSvg } = await mermaid.render(id, chartToRender);

        if (isMounted) {
          setSvgContent(renderedSvg);
          setError(null);
          setScale(1);

          // Automatically center wide diagrams horizontally and start at top for tall diagrams on load
          setTimeout(() => {
            if (viewportRef.current) {
              viewportRef.current.scrollLeft = (viewportRef.current.scrollWidth - viewportRef.current.clientWidth) / 2;
              viewportRef.current.scrollTop = 0;
            }
          }, 60);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to render diagram.');
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
      const stray = document.getElementById(id);
      if (stray) stray.remove();
    };
  }, [chart]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.3));
  const handleResetZoom = () => setScale(1);

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono space-y-2">
        <p className="font-bold text-rose-400">Mermaid Render Notice</p>
        <p className="opacity-80">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden group">
      {/* Floating Zoom Control Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/95 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md opacity-90 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          title="Reset Zoom"
          className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-mono text-indigo-300 px-2 border-l border-slate-700 font-semibold">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Adaptive Viewport Container (Handles both tall & wide diagrams cleanly) */}
      <div
        ref={viewportRef}
        className="w-full overflow-auto min-h-[500px] max-h-[820px] p-12 pb-24 px-16 flex justify-center items-start"
      >
        <div
          ref={contentRef}
          className="mermaid-svg-container transition-transform duration-150 ease-out origin-top"
          style={{ transform: `scale(${scale})`, display: 'inline-block', minWidth: 'max-content' }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>

      <style>{`
        .mermaid-svg-container svg {
          height: auto !important;
          max-width: none !important;
          display: block;
          margin: 0 auto;
        }

        .mermaid-svg-container .node rect,
        .mermaid-svg-container .node polygon,
        .mermaid-svg-container .node circle {
          fill: #1e293b !important;
          stroke: #475569 !important;
          stroke-width: 1.5px !important;
        }

        .mermaid-svg-container .node .label,
        .mermaid-svg-container .node foreignObject {
          color: #f8fafc !important;
          fill: #f8fafc !important;
        }

        .mermaid-svg-container .edgeLabel,
        .mermaid-svg-container .edgeLabel span,
        .mermaid-svg-container .edgeLabel div,
        .mermaid-svg-container .edgeLabel text {
          background-color: #1e293b !important;
          color: #f8fafc !important;
          fill: #f8fafc !important;
          opacity: 1 !important;
          font-size: 13px !important;
          font-weight: 600 !important;
        }

        .mermaid-svg-container .edgeLabel rect {
          fill: #1e293b !important;
          stroke: #64748b !important;
          stroke-width: 1.2px !important;
          rx: 6px !important;
          ry: 6px !important;
          opacity: 1 !important;
        }

        .mermaid-svg-container .flowchart-link,
        .mermaid-svg-container .edgePaths path {
          stroke: #818cf8 !important;
          stroke-width: 1.8px !important;
        }

        .mermaid-svg-container .cluster rect {
          fill: rgba(15, 23, 42, 0.6) !important;
          stroke: rgba(99, 102, 241, 0.4) !important;
          stroke-width: 1.5px !important;
        }
        .mermaid-svg-container .cluster text {
          fill: #a5b4fc !important;
          font-weight: bold !important;
          font-size: 14px !important;
        }
      `}</style>
    </div>
  );
};