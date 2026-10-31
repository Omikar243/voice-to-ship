import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type SignalGeometry = {
  width: number;
  height: number;
  path: string;
  labBranches: { typed: string; dictated: string };
  projectBranches: Array<{ id: string; path: string }>;
  chapterNodes: Array<{ id: string; label: string; y: number }>;
  projectNodes: Array<{ id: string; y: number }>;
};

type SignalBranch = 'typed' | 'dictated' | null;

type EvolvingSignalProps = {
  activeChapter: string;
  activeProject: string | null;
  activeBranch: SignalBranch;
};

const CHAPTERS = [
  ['hero', 'The Signal'],
  ['story', 'The Direction'],
  ['work', 'The Connections'],
  ['lab', 'The Exploration'],
  ['lessons', 'The Interruption'],
  ['wispr', 'The Convergence'],
  ['contact', 'The Loop'],
] as const;

function measureSignal(): SignalGeometry {
  const width = document.documentElement.clientWidth;
  const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  const rail = width < 760 ? 13 : Math.min(82, Math.max(58, width * 0.058));
  const scrollY = window.scrollY;
  const section = (id: string) => document.getElementById(id);
  const pageY = (element: HTMLElement | null, ratio = 0.5, fallback = 0) =>
    element ? element.getBoundingClientRect().top + scrollY + element.getBoundingClientRect().height * ratio : fallback;

  const chapterNodes = CHAPTERS.map(([id, label]) => ({
    id,
    label,
    y: pageY(section(id), id === 'hero' ? 0.52 : 0.22, 0),
  }));
  const projectNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-project-node]')).map((node) => ({
    id: node.dataset.projectNode ?? '',
    y: node.getBoundingClientRect().top + scrollY + node.getBoundingClientRect().height * 0.5,
  }));
  const projectBranchX = rail + (width < 760 ? 14 : 39);
  const projectBranches = projectNodes.map((node) => ({
    id: node.id,
    path: `M ${rail} ${(node.y - 22).toFixed(1)} C ${rail + 15} ${(node.y - 20).toFixed(1)} ${projectBranchX} ${(node.y - 18).toFixed(1)} ${projectBranchX} ${node.y.toFixed(1)} C ${projectBranchX} ${(node.y + 16).toFixed(1)} ${rail + 14} ${(node.y + 31).toFixed(1)} ${rail} ${(node.y + 34).toFixed(1)}`,
  }));

  const yFor = (id: string, ratio = 0.3) => pageY(section(id), ratio, 0);
  const storyY = yFor('story', 0.26);
  const workY = yFor('work', 0.12);
  const labY = yFor('lab', 0.2);
  const lessonY = yFor('lessons', 0.3);
  const wisprY = yFor('wispr', 0.2);
  const contactY = yFor('contact', 0.5);
  const labBranches = {
    typed: `M ${rail} ${(labY + 18).toFixed(1)} C ${rail + 29} ${(labY + 42).toFixed(1)} ${rail + 30} ${(labY + 82).toFixed(1)} ${rail + 4} ${(labY + 96).toFixed(1)} C ${rail - 5} ${(labY + 75).toFixed(1)} ${rail - 15} ${(labY + 53).toFixed(1)} ${rail - 4} ${(labY + 34).toFixed(1)}`,
    dictated: `M ${rail} ${(labY + 18).toFixed(1)} C ${rail - 23} ${(labY + 46).toFixed(1)} ${rail - 25} ${(labY + 72).toFixed(1)} ${rail - 4} ${(labY + 92).toFixed(1)}`,
  };

  let path = `M ${rail} -24`;
  const waveEnd = Math.max(70, storyY - 35);
  const waveStep = 30;
  for (let y = 4; y < waveEnd; y += waveStep) {
    const amplitude = y < storyY ? (width < 760 ? 4.5 : 10) : 1;
    const nextY = Math.min(y + waveStep, waveEnd);
    const x1 = rail + Math.sin(y * 0.115) * amplitude;
    const x2 = rail + Math.sin((y + waveStep) * 0.115) * amplitude * 0.8;
    path += ` C ${x1.toFixed(1)} ${(y + 8).toFixed(1)} ${x2.toFixed(1)} ${(nextY - 8).toFixed(1)} ${x2.toFixed(1)} ${nextY.toFixed(1)}`;
  }

  path += ` C ${rail + 20} ${(storyY + 52).toFixed(1)} ${rail - 12} ${(workY - 55).toFixed(1)} ${rail} ${workY.toFixed(1)}`;

  projectNodes.forEach((node) => {
    const branchX = rail + (width < 760 ? 14 : 39);
    path += ` C ${rail + 15} ${(node.y - 20).toFixed(1)} ${branchX} ${(node.y - 18).toFixed(1)} ${branchX} ${node.y.toFixed(1)}`;
    path += ` C ${branchX} ${(node.y + 16).toFixed(1)} ${rail + 14} ${(node.y + 31).toFixed(1)} ${rail} ${(node.y + 34).toFixed(1)}`;
  });

  path += ` C ${rail + 18} ${(labY - 22).toFixed(1)} ${rail + 18} ${(labY + 4).toFixed(1)} ${rail} ${(labY + 18).toFixed(1)}`;
  path += ` C ${rail + 29} ${(labY + 42).toFixed(1)} ${rail + 30} ${(labY + 82).toFixed(1)} ${rail + 4} ${(labY + 96).toFixed(1)}`;
  path += ` C ${rail - 5} ${(labY + 75).toFixed(1)} ${rail - 15} ${(labY + 53).toFixed(1)} ${rail - 4} ${(labY + 34).toFixed(1)} M ${rail} ${(labY + 18).toFixed(1)}`;
  path += ` C ${rail - 23} ${(labY + 46).toFixed(1)} ${rail - 25} ${(labY + 72).toFixed(1)} ${rail - 4} ${(labY + 92).toFixed(1)} C ${rail + 5} ${(labY + 100).toFixed(1)} ${rail + 1} ${(labY + 112).toFixed(1)} ${rail} ${(lessonY - 32).toFixed(1)}`;

  // A deliberate gap marks the interruption; the next subpath reconnects a little farther down.
  path += ` M ${rail + 3} ${(lessonY + 22).toFixed(1)} C ${rail + 24} ${(lessonY + 43).toFixed(1)} ${rail - 20} ${(lessonY + 63).toFixed(1)} ${rail} ${(lessonY + 82).toFixed(1)}`;
  path += ` C ${rail + 11} ${(wisprY - 90).toFixed(1)} ${rail - 10} ${(wisprY - 35).toFixed(1)} ${rail} ${wisprY.toFixed(1)}`;
  path += ` C ${rail + 24} ${(wisprY + 30).toFixed(1)} ${rail - 24} ${(wisprY + 66).toFixed(1)} ${rail} ${(wisprY + 93).toFixed(1)}`;
  path += ` C ${rail + 19} ${(contactY - 84).toFixed(1)} ${rail + 8} ${(contactY - 27).toFixed(1)} ${rail} ${contactY.toFixed(1)}`;
  path += ` C ${rail + 58} ${(contactY - 53).toFixed(1)} ${rail + 75} ${(contactY + 34).toFixed(1)} ${rail + 29} ${(contactY + 47).toFixed(1)}`;
  path += ` C ${rail - 6} ${(contactY + 57).toFixed(1)} ${rail - 18} ${(contactY + 12).toFixed(1)} ${rail} ${contactY.toFixed(1)}`;
  path += ` C ${rail + 14} ${(contactY + 82).toFixed(1)} ${rail + 8} ${(height + 20).toFixed(1)} ${rail} ${(height + 60).toFixed(1)}`;

  return { width, height: height + 90, path, labBranches, projectBranches, chapterNodes, projectNodes };
}

export function EvolvingSignal({ activeChapter, activeProject, activeBranch }: EvolvingSignalProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [geometry, setGeometry] = useState<SignalGeometry | null>(null);

  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setGeometry(measureSignal()));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure, { once: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    const path = pathRef.current;
    const svg = svgRef.current;
    if (!path || !svg || !geometry) return;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let length = 0;
    try {
      length = path.getTotalLength();
    } catch {
      return;
    }
    path.style.strokeDasharray = `${length}`;

    const draw = () => {
      const pageHeight = Math.max(1, geometry.height - 90);
      const end = motionPreference.matches ? 1 : Math.min(1, (window.scrollY + window.innerHeight * 0.72) / pageHeight);
      path.style.strokeDashoffset = `${length * (1 - end)}`;
    };

    draw();
    window.addEventListener('scroll', draw, { passive: true });
    window.addEventListener('resize', draw);
    motionPreference.addEventListener('change', draw);
    return () => {
      window.removeEventListener('scroll', draw);
      window.removeEventListener('resize', draw);
      motionPreference.removeEventListener('change', draw);
    };
  }, [geometry]);

  if (!geometry) return null;

  const rail = geometry.width < 760 ? 13 : Math.min(82, Math.max(58, geometry.width * 0.058));
  const activeNode = geometry.chapterNodes.find((node) => node.id === activeChapter);

  return (
    <svg
      ref={svgRef}
      className="signal-layer"
      width={geometry.width}
      height={geometry.height}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path className="signal-track" d={geometry.path} />
      <path ref={pathRef} className="signal-ink" d={geometry.path} />
      {geometry.projectBranches.map((branch) => (
        <path key={branch.id} className={`signal-project-branch ${branch.id === activeProject ? 'is-active' : ''}`} d={branch.path} />
      ))}
      {activeBranch && <path className="signal-lab-branch is-active" d={geometry.labBranches[activeBranch]} />}
      {geometry.chapterNodes.map((node) => (
        <g key={node.id} className={`signal-node ${node.id === activeChapter ? 'is-current' : ''}`}>
          <circle cx={rail} cy={node.y} r={node.id === activeChapter ? 4 : 2.25} />
        </g>
      ))}
      {geometry.projectNodes.map((node) => (
        <circle
          key={node.id}
          className={`project-signal-node ${node.id === activeProject ? 'is-active' : ''}`}
          cx={rail + (geometry.width < 760 ? 14 : 39)}
          cy={node.y}
          r={node.id === activeProject ? 4 : 2.5}
        />
      ))}
      {activeNode && <circle className="signal-cursor" cx={rail} cy={activeNode.y} r="7" />}
    </svg>
  );
}
