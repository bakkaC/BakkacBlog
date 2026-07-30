const MERMAID_LANGUAGES = new Set(['mermaid', 'mmd']);
const TEXT_LANGUAGES = new Set(['', 'plain', 'plaintext', 'text', 'txt']);
const MERMAID_DIAGRAM_STARTS = [
  /^graph\s+(?:TB|TD|BT|RL|LR)\b/i,
  /^flowchart\s+(?:TB|TD|BT|RL|LR)\b/i,
  /^sequenceDiagram\b/i,
  /^classDiagram(?:-v2)?\b/i,
  /^stateDiagram(?:-v2)?\b/i,
  /^erDiagram\b/i,
  /^journey\b/i,
  /^gantt\b/i,
  /^pie\b/i,
  /^gitGraph\b/i,
  /^mindmap\b/i,
  /^timeline\b/i,
  /^quadrantChart\b/i,
  /^xychart-beta\b/i,
  /^block-beta\b/i,
  /^packet-beta\b/i,
  /^kanban\b/i,
  /^architecture-beta\b/i,
  /^sankey-beta\b/i,
  /^requirementDiagram\b/i,
  /^C4(?:Context|Container|Component|Dynamic|Deployment)\b/i,
];

/**
 * Replace Mermaid fenced code blocks with an MDX component.
 * Keeping this at the remark stage means every content entry gets the same
 * rendering behavior without requiring authors to import the component.
 */
export function remarkMermaid() {
  return (tree) => {
    visitChildren(tree);
  };
}

function visitChildren(node) {
  if (!node || !Array.isArray(node.children)) {
    return;
  }

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];

    if (child?.type === 'code' && isMermaidCodeBlock(child)) {
      node.children[index] = {
        type: 'mdxJsxFlowElement',
        name: 'Mermaid',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'code',
            value: child.value,
          },
        ],
        children: [],
      };
      continue;
    }

    visitChildren(child);
  }
}

function isMermaidLanguage(language) {
  return typeof language === 'string' && MERMAID_LANGUAGES.has(language.toLowerCase());
}

function isMermaidCodeBlock(node) {
  if (isMermaidLanguage(node.lang)) {
    return true;
  }

  const language = typeof node.lang === 'string' ? node.lang.toLowerCase() : '';
  if (!TEXT_LANGUAGES.has(language) || typeof node.value !== 'string') {
    return false;
  }

  const firstStatement = node.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('%%'));

  return (
    typeof firstStatement === 'string' &&
    MERMAID_DIAGRAM_STARTS.some((pattern) => pattern.test(firstStatement))
  );
}
