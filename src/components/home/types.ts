export interface HomePostItem {
  title: string;
  href: string;
  dateLabel: string;
  collection: 'notes' | 'thoughts' | 'posts';
  tags: string[];
}

export interface HomeCategoryItem {
  tag: string;
  count: number;
  href: string;
}
