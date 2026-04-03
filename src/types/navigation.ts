export type NavigationLink = {
  id: string;
  label: string;
  href: string;
};

export type NavigationCategoryItem = NavigationLink & {
  cmsKey?: string;
};

export type NavigationCategory = NavigationLink & {
  cmsKey?: string;
  items: NavigationCategoryItem[];
};

export type StorefrontNavigation = {
  announcement: string;
  primary: NavigationLink[];
  categories: NavigationCategory[];
  utility: NavigationLink[];
};
