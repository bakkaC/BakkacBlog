export interface HomePostItem {
  title: string;
  href: string;
  dateLabel: string;
  collection: 'notes' | 'thoughts' | 'posts';
  tags: string[];
}

/** Latest entry teaser for one homepage accordion panel. */
export interface HomeAccordionLatest {
  title: string;
  href: string;
  dateLabel: string;
  tags: string[];
}

export type HomeAccordionLatestByCollection = Record<
  HomePostItem['collection'],
  HomeAccordionLatest | null
>;

export interface HomeCategoryItem {
  tag: string;
  count: number;
  href: string;
}
