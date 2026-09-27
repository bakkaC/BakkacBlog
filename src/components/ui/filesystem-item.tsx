'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { ChevronRight, File, Folder } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '../../lib/utils';

type Node = {
  id?: string;
  name: string;
  nodes?: Node[];
  label?: ReactNode;
  index?: string;
  title?: string;
  meta?: ReactNode;
  href?: string;
};

interface FilesystemItemProps {
  node: Node;
  animated?: boolean;
  showIcons?: boolean;
  showToggles?: boolean;
  toggleTrigger?: 'chevron' | 'folder' | 'both';
  defaultOpen?: boolean;
  itemClassName?: string;
  linkClassName?: string;
  hoverTextClassName?: string;
}

export function FilesystemItem({
  node,
  animated = false,
  showIcons = true,
  showToggles = true,
  toggleTrigger = 'chevron',
  defaultOpen = false,
  itemClassName,
  linkClassName,
  hoverTextClassName = 'group-hover:text-accent',
}: FilesystemItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasChildren = Boolean(node.nodes && node.nodes.length > 0);
  // A node with children should look like a folder even when it also links
  // to an entry at the same path (for example, Vite/Vite.mdx).
  const isFolderRow = hasChildren && !node.href;
  const isFolderLikeRow = hasChildren;
  const isParentEntryRow = hasChildren && Boolean(node.href);
  const canToggle = hasChildren && showToggles;
  const showChevronToggle = canToggle && (toggleTrigger === 'chevron' || toggleTrigger === 'both');
  const showFolderToggle = canToggle && (toggleTrigger === 'folder' || toggleTrigger === 'both');
  const toggleOpen = () => setIsOpen((open) => !open);
  let label: ReactNode;
  if (node.label) {
    label = node.label;
  } else {
    label = node.name;
  }

  const ChevronIcon = () =>
    animated ? (
      <motion.span
        animate={{ rotate: isOpen ? 90 : 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className="flex"
      >
        <ChevronRight className="size-4 text-gray-500" />
      </motion.span>
    ) : (
      <ChevronRight
        className={cn(
          'size-4 text-gray-500 transition-transform',
          isOpen && 'rotate-90'
        )}
      />
    );

  const ChildrenList = () => {
    if (!hasChildren) {
      return null;
    }

    const children = node.nodes?.map((child) => (
      <FilesystemItem
        node={child}
        key={child.id ?? child.name}
        animated={animated}
        showIcons={showIcons}
        showToggles={showToggles}
        toggleTrigger={toggleTrigger}
        defaultOpen={defaultOpen}
        itemClassName={itemClassName}
        linkClassName={linkClassName}
        hoverTextClassName={hoverTextClassName}
      />
    ));

    if (animated) {
      return (
        <AnimatePresence>
          {isOpen && (
            <motion.ul
              initial={{ height: 0, opacity: 0, y: -4 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -4 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="mt-3 pl-8 overflow-hidden flex flex-col justify-end"
            >
              {children}
            </motion.ul>
          )}
        </AnimatePresence>
      );
    }

    return isOpen && <ul className="mt-3 pl-8">{children}</ul>;
  };

  const titleText = node.title ?? node.name;
  const titleClassName = cn(
    'block min-w-0 truncate text-base font-medium tracking-tight sm:overflow-visible sm:text-clip sm:whitespace-normal',
    hoverTextClassName
  );
  const titleNode = isParentEntryRow ? (
    <a href={node.href} onClick={(event) => event.stopPropagation()} className={titleClassName}>
      {titleText}
    </a>
  ) : (
    <span className={titleClassName}>{titleText}</span>
  );

  const contentStack = node.label ? (
    <div className="flex min-w-0 items-center gap-4">{label}</div>
  ) : isFolderLikeRow ? (
    <span className="flex min-w-0 items-center gap-3.5">
      <Folder className={cn('size-3.5 shrink-0', hoverTextClassName)} aria-hidden="true" />
      {titleNode}
    </span>
  ) : node.index ? (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2">
      <span className={cn('text-xs font-semibold', hoverTextClassName)}>{node.index}</span>
      {titleNode}
    </div>
  ) : (
    titleNode
  );

  const body = (
    <div className="flex w-full items-start justify-between gap-6">
      <div className="flex min-w-0 items-start gap-4">{contentStack}</div>
      {node.meta ? (
        <span className={cn('shrink-0 text-xs', hoverTextClassName)}>{node.meta}</span>
      ) : null}
    </div>
  );

  const content = isFolderRow ? (
    <button
      type="button"
      onClick={toggleOpen}
      className={cn('flex min-w-0 w-full cursor-pointer text-left', linkClassName)}
      aria-expanded={isOpen}
      aria-label={isOpen ? `收起 ${titleText}` : `展开 ${titleText}`}
    >
      {body}
    </button>
  ) : isParentEntryRow ? (
    <div
      role="button"
      tabIndex={0}
      onClick={toggleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleOpen();
        }
      }}
      className={cn('flex min-w-0 w-full cursor-pointer text-left', linkClassName)}
      aria-expanded={isOpen}
      aria-label={isOpen ? `收起 ${titleText}` : `展开 ${titleText}`}
    >
      {body}
    </div>
  ) : node.href ? (
    <a href={node.href} className={cn('flex min-w-0 w-full', linkClassName)}>
      {body}
    </a>
  ) : (
    body
  );

  return (
    <li className={cn('list-none', itemClassName)}>
      <div className="flex items-start gap-2">
        {showChevronToggle ? (
          <button type="button" onClick={toggleOpen} className="p-1" aria-label={isOpen ? 'Collapse folder' : 'Expand folder'} aria-expanded={isOpen}>
            <ChevronIcon />
          </button>
        ) : null}

        {showIcons ? (
          node.nodes ? (
            showFolderToggle ? (
              <button
                type="button"
                onClick={toggleOpen}
                className={cn(
                  'shrink-0',
                  toggleTrigger === 'folder' && 'ml-6 -mr-[1.5px]'
                )}
                aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}
                aria-expanded={isOpen}
              >
                <Folder
                  className="size-6 text-sky-500 fill-sky-500"
                />
              </button>
            ) : (
              <Folder
                className={cn(
                  'size-6 text-sky-500 fill-sky-500',
                  !hasChildren && 'ml-6'
                )}
              />
            )
          ) : (
            <File className="ml-6 size-6 text-gray-900" />
          )
        ) : null}

        {content}
      </div>

      <ChildrenList />
    </li>
  );
}
