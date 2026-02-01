'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { ChevronRight, File, Folder } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '../../lib/utils';

type Node = {
  name: string;
  nodes?: Node[];
  label?: ReactNode;
  index?: string;
  title?: string;
  meta?: ReactNode;
  description?: ReactNode;
  href?: string;
};

interface FilesystemItemProps {
  node: Node;
  animated?: boolean;
  showIcons?: boolean;
  showToggles?: boolean;
  itemClassName?: string;
  linkClassName?: string;
}

export function FilesystemItem({
  node,
  animated = false,
  showIcons = true,
  showToggles = true,
  itemClassName,
  linkClassName,
}: FilesystemItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = Boolean(node.nodes && node.nodes.length > 0);
  let label: ReactNode;
  if (node.label) {
    label = node.label;
  } else if (node.index || node.title) {
    label = (
      <span className="inline-flex items-center gap-4">
        {node.index ? (
          <span className="text-xs font-semibold">
            {node.index}
          </span>
        ) : null}
        <span className="text-base font-medium tracking-tight group-hover:text-accent">
          {node.title ?? node.name}
        </span>
      </span>
    );
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
    const children = node.nodes?.map((child) => (
      <FilesystemItem
        node={child}
        key={child.name}
        animated={animated}
        showIcons={showIcons}
        itemClassName={itemClassName}
        linkClassName={linkClassName}
      />
    ));

    if (animated) {
      return (
        <AnimatePresence>
          {isOpen && (
            <motion.ul
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="pl-6 overflow-hidden flex flex-col justify-end"
            >
              {children}
            </motion.ul>
          )}
        </AnimatePresence>
      );
    }

    return isOpen && <ul className="pl-6">{children}</ul>;
  };

  const body = (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center justify-between gap-6">
        <div className="flex items-center gap-4">{label}</div>
        {node.meta ? (
          <span className="text-xs">{node.meta}</span>
        ) : null}
      </div>
      {node.description ? (
        <div className="text-sm ">{node.description}</div>
      ) : null}
    </div>
  );

  const content = node.href ? (
    <a href={node.href} className={cn('flex w-full', linkClassName)}>
      {body}
    </a>
  ) : hasChildren && showToggles ? (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={cn('flex w-full text-left', linkClassName)}
    >
      {body}
    </button>
  ) : (
    body
  );

  return (
    <li className={cn('list-none', itemClassName)}>
      <div className="flex items-start gap-2">
        {showToggles && hasChildren ? (
          <button onClick={() => setIsOpen(!isOpen)} className="p-1">
            <ChevronIcon />
          </button>
        ) : null}

        {showIcons ? (
          node.nodes ? (
            <Folder
              className={cn(
                'size-6 text-sky-500 fill-sky-500',
                !hasChildren && 'ml-6'
              )}
            />
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
