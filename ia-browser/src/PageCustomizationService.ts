import {
  PageElement,
  TransformationRule,
  PageTemplate,
  PageAnalysis,
  CustomizationMode
} from './types';

export class PageCustomizationService {
  private static instance: PageCustomizationService;
  private webview: any = null;
  private selectedElements: Set<string> = new Set();
  private currentMode: CustomizationMode = 'inspect';
  private transformations: TransformationRule[] = [];
  private inspectionCallback: ((element: any) => void) | null = null;

  private constructor() {}

  static getInstance(): PageCustomizationService {
    if (!PageCustomizationService.instance) {
      PageCustomizationService.instance = new PageCustomizationService();
    }
    return PageCustomizationService.instance;
  }

  setWebview(webview: any) {
    this.webview = webview;
  }

  setMode(mode: CustomizationMode) {
    this.currentMode = mode;
    this.setupInspectionMode();
  }

  getMode(): CustomizationMode {
    return this.currentMode;
  }

  private setupInspectionMode() {
    if (!this.webview) return;

    const script = `
      () => {
        // Remove existing listeners
        document.removeEventListener('mouseover', window.__aiHoverHandler);
        document.removeEventListener('mouseout', window.__aiOutHandler);
        document.removeEventListener('click', window.__aiClickHandler);
        document.getElementById('ai-customization-overlay')?.remove();

        if ('${this.currentMode}' === 'inspect') {
          // Create overlay for element highlighting
          const overlay = document.createElement('div');
          overlay.id = 'ai-customization-overlay';
          overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';
          document.body.appendChild(overlay);

          window.__aiHoverHandler = (e) => {
            const target = e.target;
            const rect = target.getBoundingClientRect();
            const xpath = window.__aiGetXPath(target);
            
            // Highlight element
            const highlight = document.createElement('div');
            highlight.id = 'ai-hover-highlight';
            highlight.style.cssText = \`
              position:fixed;
              left:\${rect.left + window.scrollX}px;
              top:\${rect.top + window.scrollY}px;
              width:\${rect.width}px;
              height:\${rect.height}px;
              border:2px solid #2563eb;
              background:rgba(37,99,235,0.1);
              pointer-events:none;
              z-index:2147483647;
            \`;
            document.getElementById('ai-customization-overlay').appendChild(highlight);
            
            // Show tooltip
            const tooltip = document.createElement('div');
            tooltip.id = 'ai-hover-tooltip';
            tooltip.style.cssText = \`
              position:fixed;
              left:\${rect.left + window.scrollX}px;
              top:\${rect.top + window.scrollY - 30}px;
              padding:4px 8px;
              background:#2563eb;
              color:white;
              border-radius:4px;
              font-size:12px;
              font-weight:bold;
              white-space:nowrap;
              z-index:2147483647;
              pointer-events:none;
            \`;
            tooltip.textContent = \`\${target.tagName.toLowerCase()}\`;
            document.getElementById('ai-customization-overlay').appendChild(tooltip);
          };

          window.__aiOutHandler = () => {
            document.getElementById('ai-hover-highlight')?.remove();
            document.getElementById('ai-hover-tooltip')?.remove();
          };

          window.addEventListener('mouseover', window.__aiHoverHandler);
          window.addEventListener('mouseout', window.__aiOutHandler);
        } else if ('${this.currentMode}' === 'select' || '${this.currentMode}' === 'style') {
          // Multi-select mode
          const overlay = document.createElement('div');
          overlay.id = 'ai-customization-overlay';
          overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';
          document.body.appendChild(overlay);

          window.__aiClickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const target = e.target;
            const xpath = window.__aiGetXPath(target);
            const rect = target.getBoundingClientRect();
            
            // Toggle selection
            if (target.dataset.aiSelected === 'true') {
              target.dataset.aiSelected = 'false';
              target.style.outline = '';
            } else {
              target.dataset.aiSelected = 'true';
              target.style.outline = '2px solid #2563eb';
            }
            
            // Notify parent
            window.__aiNotifySelection(xpath, target.tagName.toLowerCase(), target.textContent?.substring(0, 50));
          };

          document.addEventListener('click', window.__aiClickHandler, true);
        }
      }
    `;

    this.webview.executeJavaScript(script);
  }

  async analyzePage(url: string): Promise<PageAnalysis> {
    if (!this.webview) throw new Error('Webview not set');

    const analysis = await this.webview.executeJavaScript(`
      (async () => {
        // Helper to get XPath
        window.__aiGetXPath = (element) => {
          if (element.id) {
            return '//*[@id="' + element.id + '"]';
          }
          if (element === document.body) {
            return '/html/body';
          }
          
          let ix = Array.from(element.parentNode?.children || []).indexOf(element) + 1;
          let path = element.tagName.toLowerCase() + '[' + ix + ']';
          return window.__aiGetXPath(element.parentNode) + '/' + path;
        };

        const bodyText = document.body?.innerText || '';
        const words = bodyText.split(/\\s+/).filter(w => w.length > 0);
        
        // Extract structure
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h, i) => ({
          level: parseInt(h.tagName[1]),
          text: h.textContent?.trim() || ''
        }));

        const mainSections = Array.from(document.querySelectorAll('main, section, article')).map(s => 
          s.textContent?.trim().substring(0, 100) || ''
        ).filter(Boolean);

        const navigation = Array.from(document.querySelectorAll('nav a, [role="navigation"] a')).map(a => ({
          xpath: window.__aiGetXPath(a),
          text: a.textContent?.trim() || ''
        }));

        return {
          url: '${url}',
          title: document.title || '',
          elementCount: document.querySelectorAll('*').length,
          mainSections: mainSections,
          imageCount: document.querySelectorAll('img').length,
          linkCount: document.querySelectorAll('a').length,
          formCount: document.querySelectorAll('form').length,
          estimatedReadingTime: Math.ceil(words.length / 200),
          structure: {
            headings,
            sections: mainSections.map((s, i) => ({ xpath: \`/html/body/*[\${i+1}]\`, text: s })),
            navigation: navigation.slice(0, 20)
          }
        };
      })()
    `);

    return analysis;
  }

  async getElementsBySelector(selector: string): Promise<PageElement[]> {
    if (!this.webview) throw new Error('Webview not set');

    return await this.webview.executeJavaScript(`
      (() => {
        const elements = document.querySelectorAll('${selector}');
        window.__aiGetXPath = (element) => {
          if (element.id) return '//*[@id="' + element.id + '"]';
          if (element === document.body) return '/html/body';
          let ix = Array.from(element.parentNode?.children || []).indexOf(element) + 1;
          let path = element.tagName.toLowerCase() + '[' + ix + ']';
          return window.__aiGetXPath(element.parentNode) + '/' + path;
        };

        return Array.from(elements).map((el, i) => ({
          id: 'el-' + i,
          xpath: window.__aiGetXPath(el),
          tagName: el.tagName.toLowerCase(),
          text: el.textContent?.substring(0, 500) || '',
          className: el.className,
          styles: {
            display: getComputedStyle(el).display,
            color: getComputedStyle(el).color,
            fontSize: getComputedStyle(el).fontSize,
            padding: getComputedStyle(el).padding,
            margin: getComputedStyle(el).margin
          },
          attributes: Array.from(el.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {}),
          children: []
        }));
      })()
    `);
  }

  async applyTransformation(rule: TransformationRule): Promise<void> {
    if (!this.webview) throw new Error('Webview not set');

    const script = `
      (() => {
        const selector = '${rule.selector}';
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
          switch ('${rule.type}') {
            case 'remove':
              element.remove();
              break;
            case 'hide':
              element.style.display = 'none';
              break;
            case 'highlight':
              element.style.outline = '3px solid #f59e0b';
              element.style.backgroundColor = 'rgba(245,158,11,0.1)';
              break;
            case 'style':
              ${rule.styles ? Object.entries(rule.styles).map(([key, value]) => 
                `element.style.${key} = '${value}';`
              ).join('\n') : ''}
              break;
            case 'replace':
              element.innerHTML = '${rule.content || ''}';
              break;
            case 'move':
              const target = document.querySelector('${rule.targetSelector || ''}');
              if (target) {
                const position = '${rule.insertPosition || 'append'}';
                if (position === 'before') target.before(element);
                else if (position === 'after') target.after(element);
                else if (position === 'replace') target.replaceWith(element);
                else if (position === 'append') target.appendChild(element);
                else if (position === 'prepend') target.prepend(element);
              }
              break;
          }
        });
        
        return 'Applied ' + elements.length + ' transformations';
      })()
    `;

    await this.webview.executeJavaScript(script);
    this.transformations.push(rule);
  }

  async applyTemplate(template: PageTemplate): Promise<void> {
    for (const rule of template.transformations) {
      await this.applyTransformation(rule);
    }
  }

  async createTemplate(
    name: string,
    urlPattern: string,
    originalUrl: string,
    title: string
  ): Promise<PageTemplate> {
    const template: PageTemplate = {
      id: crypto.randomUUID(),
      name,
      urlPattern,
      originalUrl,
      title,
      transformations: [...this.transformations],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: false
    };

    return template;
  }

  async getAllElements(): Promise<PageElement[]> {
    if (!this.webview) throw new Error('Webview not set');

    return await this.webview.executeJavaScript(`
      (() => {
        // Get all major structural elements
        const selectors = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer', 
                          'h1', 'h2', 'h3', 'div', 'span', 'a', 'button', 'img'];
        
        window.__aiGetXPath = (element) => {
          if (element.id) return '//*[@id="' + element.id + '"]';
          if (element === document.body) return '/html/body';
          let ix = Array.from(element.parentNode?.children || []).indexOf(element) + 1;
          let path = element.tagName.toLowerCase() + '[' + ix + ']';
          return window.__aiGetXPath(element.parentNode) + '/' + path;
        };

        const elements = [];
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach((el, i) => {
            elements.push({
              id: selector + '-' + i,
              xpath: window.__aiGetXPath(el),
              tagName: el.tagName.toLowerCase(),
              text: el.textContent?.trim().substring(0, 200) || '',
              className: el.className || undefined,
              styles: {
                display: getComputedStyle(el).display,
                color: getComputedStyle(el).color,
                fontSize: getComputedStyle(el).fontSize,
                padding: getComputedStyle(el).padding,
                margin: getComputedStyle(el).margin,
                width: getComputedStyle(el).width,
                height: getComputedStyle(el).height
              },
              attributes: Array.from(el.attributes).reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
              }, {}),
              children: []
            });
          });
        });

        return elements.slice(0, 100); // Limit to 100 elements
      })()
    `);
  }

  async getSelectedElements(): Promise<string[]> {
    if (!this.webview) return [];

    return await this.webview.executeJavaScript(`
      (() => {
        const selected = document.querySelectorAll('[data-ai-selected="true"]');
        return Array.from(selected).map(el => {
          window.__aiGetXPath = (element) => {
            if (element.id) return '//*[@id="' + element.id + '"]';
            if (element === document.body) return '/html/body';
            let ix = Array.from(element.parentNode?.children || []).indexOf(element) + 1;
            let path = element.tagName.toLowerCase() + '[' + ix + ']';
            return window.__aiGetXPath(element.parentNode) + '/' + path;
          };
          return window.__aiGetXPath(el);
        });
      })()
    `);
  }

  async highlightElements(xpaths: string[], color: string = '#2563eb'): Promise<void> {
    if (!this.webview) throw new Error('Webview not set');

    await this.webview.executeJavaScript(`
      (async () => {
        function getElementByXPath(xpath) {
          return document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue;
        }

        const xpaths = ${JSON.stringify(xpaths)};
        xpaths.forEach(xpath => {
          const element = getElementByXPath(xpath);
          if (element) {
            element.style.outline = '3px solid ${color}';
            element.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
          }
        });
        
        return 'Highlighted ' + xpaths.length + ' elements';
      })()
    `);
  }

  async clearHighlights(): Promise<void> {
    if (!this.webview) throw new Error('Webview not set');

    await this.webview.executeJavaScript(`
      (() => {
        document.querySelectorAll('[data-ai-selected]').forEach(el => {
          el.style.outline = '';
          el.style.backgroundColor = '';
          delete el.dataset.aiSelected;
        });
        document.getElementById('ai-customization-overlay')?.remove();
        return 'Highlights cleared';
      })()
    `);
  }

  async resetPage(): Promise<void> {
    if (!this.webview) throw new Error('Webview not set');

    await this.webview.executeJavaScript(`
      (() => {
        location.reload();
      })()
    `);
    this.transformations = [];
  }

  getTransformations(): TransformationRule[] {
    return [...this.transformations];
  }

  setInspectionCallback(callback: (element: any) => void) {
    this.inspectionCallback = callback;
  }

  // AI-powered restructuring suggestions
  async getRestructuringSuggestions(): Promise<string[]> {
    if (!this.webview) throw new Error('Webview not set');

    return await this.webview.executeJavaScript(`
      (() => {
        const suggestions = [];
        
        // Check for overcrowded navigation
        const navLinks = document.querySelectorAll('nav a').length;
        if (navLinks > 10) {
          suggestions.push('🔹 Navigation has ' + navLinks + ' links. Consider grouping into categories.');
        }
        
        // Check for small text
        const smallText = document.querySelectorAll('*').filter(el => {
          const style = getComputedStyle(el);
          return parseFloat(style.fontSize) < 12 && el.textContent?.trim().length > 50;
        });
        if (smallText.length > 5) {
          suggestions.push('🔹 Multiple elements with small text. Consider increasing font size for better readability.');
        }
        
        // Check for missing headings
        const headings = document.querySelectorAll('h1, h2, h3').length;
        if (headings === 0) {
          suggestions.push('🔹 Page lacks heading structure. Add H1, H2, H3 tags for better accessibility.');
        }
        
        // Check for lack of whitespace
        const elements = document.querySelectorAll('*');
        const cramped = Array.from(elements).filter(el => {
          const style = getComputedStyle(el);
          return parseFloat(style.padding) < 8 && parseFloat(style.margin) < 8 && el.textContent?.trim().length > 100;
        });
        if (cramped.length > 10) {
          suggestions.push('🔹 Many elements lack padding/margin. Add whitespace for better visual hierarchy.');
        }
        
        // Check for image accessibility
        const images = document.querySelectorAll('img');
        const missingAlt = Array.from(images).filter(img => !img.alt).length;
        if (missingAlt > 0) {
          suggestions.push('🔹 ' + missingAlt + ' images missing alt text. Add for accessibility.');
        }
        
        return suggestions.slice(0, 10);
      })()
    `);
  }

  async smartRestructure(type: 'simplify' | 'clean' | 'focus' | 'readability' | 'mobile'): Promise<void> {
    if (!this.webview) throw new Error('Webview not set');

    const script = `
      (() => {
        const type = '${type}';
        let changes = 0;

        switch(type) {
          case 'simplify':
            // Remove clutter
            document.querySelectorAll('aside, .sidebar, .advertisement, .ad, [class*="ad"], ads, sidebar').forEach(el => {
              el.style.display = 'none';
              changes++;
            });
            break;

          case 'clean':
            // Remove decorative elements
            document.querySelectorAll('.decorative, .ornament, .decoration, marquee, blink').forEach(el => {
              el.style.display = 'none';
              changes++;
            });
            // Clean up excessive spacing
            document.querySelectorAll('*').forEach(el => {
              const style = getComputedStyle(el);
              if (parseFloat(style.padding) > 100 || parseFloat(style.margin) > 100) {
                el.style.padding = '20px';
                el.style.margin = '20px';
                changes++;
              }
            });
            break;

          case 'focus':
            // Highlight main content areas
            document.querySelectorAll('main, article, .content, .post, article').forEach(el => {
              el.style.border = '2px solid #2563eb';
              el.style.borderRadius = '8px';
              el.style.padding = '20px';
              changes++;
            });
            // Dim less important content
            document.querySelectorAll('footer, .footer, aside, .sidebar, .comments').forEach(el => {
              el.style.opacity = '0.5';
              changes++;
            });
            break;

          case 'readability':
            // Improve typography
            document.querySelectorAll('p, li').forEach(el => {
              const style = getComputedStyle(el);
              if (parseFloat(style.lineHeight) < 1.5) {
                el.style.lineHeight = '1.6';
                changes++;
              }
            });
            document.querySelectorAll('*').forEach(el => {
              const style = getComputedStyle(el);
              if (parseFloat(style.fontSize) < 14 && el.textContent?.trim().length > 50) {
                el.style.fontSize = '16px';
                changes++;
              }
            });
            break;

          case 'mobile':
            // Make content more mobile-friendly
            document.querySelectorAll('*').forEach(el => {
              el.style.maxWidth = '100%';
              el.style.boxSizing = 'border-box';
              changes++;
            });
            document.querySelectorAll('img, video, iframe').forEach(el => {
              el.style.maxWidth = '100%';
              el.style.height = 'auto';
              changes++;
            });
            break;
        }

        return 'Applied ' + changes + ' changes for ' + type + ' mode';
      })()
    `;

    await this.webview.executeJavaScript(script);
  }
}