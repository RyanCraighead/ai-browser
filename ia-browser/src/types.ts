// Web Page Customization Types

export type PageElement = {
  id: string;
  xpath: string;
  tagName: string;
  text: string;
  className?: string;
  styles: Record<string, string>;
  attributes: Record<string, string>;
  children: PageElement[];
};

export type TransformationRule = {
  id: string;
  type: 'remove' | 'hide' | 'highlight' | 'style' | 'restructure' | 'replace' | 'move';
  selector: string;
  xpath?: string;
  styles?: Record<string, string>;
  content?: string;
  targetSelector?: string;
  insertPosition?: 'before' | 'after' | 'replace' | 'append' | 'prepend';
};

export type PageTemplate = {
  id: string;
  name: string;
  urlPattern: string; // Can include wildcards like "https://example.com/*"
  originalUrl: string;
  title: string;
  thumbnail?: string;
  transformations: TransformationRule[];
  createdAt: number;
  updatedAt: number;
  isDefault: boolean;
};

export type CustomizationMode = 'inspect' | 'select' | 'restructure' | 'style';
export type SelectedElement = {
  xpath: string;
  tagName: string;
  text: string;
  styles: Record<string, string>;
};

export type PageAnalysis = {
  url: string;
  title: string;
  elementCount: number;
  mainSections: string[];
  imageCount: number;
  linkCount: number;
  formCount: number;
  estimatedReadingTime: number;
  structure: {
    headings: Array<{ level: number; text: string }>;
    sections: Array<{ xpath: string; text: string }>;
    navigation: Array<{ xpath: string; text: string }>;
  };
};