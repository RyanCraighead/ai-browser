# Page Customization Feature

## Overview

The Page Customization feature allows you to analyze, modify, and restructure any web page in real-time. This is the ultimate web browsing experience - you can customize pages however you want, save templates for reuse, and use AI-powered tools to improve page layout and readability.

## Features

### 🔍 Inspection Mode
- **Hover to inspect**: Move your mouse over any element to see its tag type and structure
- **Real-time element highlighting**: See exactly what you're selecting with blue borders
- **Element information**: View tag names, classes, and basic styling information

### ✅ Selection Mode
- **Click to select**: Click any element to select it for modification
- **Multi-select support**: Select multiple elements by clicking on them one by one
- **Visual feedback**: Selected elements are highlighted with blue outlines
- **XPath tracking**: Get the precise XPath for each selected element

### 🎨 Transformation Tools
- **Hide**: Temporarily hide selected elements without removing them
- **Remove**: Permanently remove elements from the page
- **Highlight**: Apply visual highlighting to important elements
- **Replace**: Replace element content with custom text or HTML

### 🔄 AI-Powered Restructuring
- **Simplify**: Remove clutter like sidebars, ads, and decorative elements
- **Clean**: Clean up excessive spacing and remove decorative elements
- **Focus**: Highlight main content and dim less important sections
- **Readability**: Improve typography, line height, and font sizes
- **Mobile Friendly**: Optimize page layout for mobile viewing

### 📊 Page Analysis
- **Element count**: Total number of elements on the page
- **Image count**: Number of images
- **Link count**: Number of links
- **Form count**: Number of forms
- **Reading time**: Estimated reading time
- **Section count**: Number of main sections

### 💾 Template System
- **Save templates**: Save your customizations as reusable templates
- **Apply templates**: Quickly apply saved templates to similar pages
- **Template management**: View, apply, and delete saved templates
- **Persistent storage**: Templates are saved locally in your browser

### 🔧 Smart Suggestions
- **Navigation analysis**: Checks if navigation is overcrowded
- **Text readability**: Identifies small text issues
- **Heading structure**: Ensures proper H1, H2, H3 hierarchy
- **Whitespace analysis**: Suggests improvements for spacing
- **Accessibility**: Checks for missing alt text on images

## How to Use

### 1. Open the Customization Panel
Click the **🎨 Customize** button in the secondary toolbar to open the Page Customization panel.

### 2. Choose a Mode
Select one of the four customization modes:
- **🔍 Inspect**: Hover over elements to inspect them
- **✅ Select**: Click elements to select them for modification
- **🔄 Restructure**: Use AI tools to restructure the page
- **🎨 Style**: Select elements and apply custom styles

### 3. Analyze the Page
Click the **🔄 Analyze** button to get detailed information about the current page structure.

### 4. Make Changes

#### Using Selection Mode:
1. Switch to **Select** mode
2. Click on elements you want to modify
3. Click **📋 Get Selected** to see selected elements
4. Apply transformations (Hide, Remove, Highlight, Replace)

#### Using AI Restructuring:
1. Switch to **Restructure** mode
2. Choose from AI restructuring options:
   - **🧹 Simplify**: Remove clutter
   - **✨ Clean**: Clean up decorative elements
   - **🎯 Focus**: Highlight main content
   - **📖 Readability**: Improve typography
   - **📱 Mobile Friendly**: Optimize for mobile

### 5. Save Templates
1. Make your desired customizations to a page
2. Click **+ Save** in the Templates section
3. Enter a template name (e.g., "Clean Wikipedia")
4. Click **Save** to store your template

### 6. Apply Saved Templates
1. Navigate to a similar page
2. Find your saved template in the Templates section
3. Click **✓ Apply** to apply the customizations

### 7. Reset Page
Click **🔄 Reset Page** to reload the page and undo all changes.

## Technical Details

### PageCustomizationService
The core service that handles all customization operations:
- Element selection and highlighting
- Transformation application
- Template management
- Page analysis
- AI-powered restructuring

### PageCustomizationPanel
The React component that provides the UI for:
- Mode selection
- Element selection management
- Transformation tools
- Template management
- Displaying analysis results

### Transformation Types
- `remove`: Permanently removes elements from the DOM
- `hide`: Sets `display: none` on elements
- `highlight`: Adds visual highlighting styles
- `style`: Applies custom CSS styles
- `replace`: Replaces element content
- `move`: Moves elements to different positions

### Template Storage
Templates are stored in `localStorage` under the key `pageTemplates`. Each template contains:
- ID, name, and URL pattern
- Original URL and title
- List of transformation rules
- Creation and update timestamps

## Use Cases

### 1. Reading Articles
```markdown
1. Navigate to an article page
2. Click "🎨 Customize"
3. Select "Simplify" to remove sidebars and ads
4. Save as "Clean Reading" template
5. Apply this template to all similar articles
```

### 2. Research
```markdown
1. Open a research paper or article
2. Use "Focus" mode to highlight main content
3. Click elements to highlight key information
4. Save as "Research Notes" template
```

### 3. Mobile Viewing
```markdown
1. Open any web page
2. Apply "Mobile Friendly" restructuring
3. Page is now optimized for mobile viewing
4. Save as "Mobile Optimized" template
```

### 4. Accessibility
```markdown
1. Open a page you want to make more accessible
2. Use "Readability" mode to improve typography
3. Check AI suggestions for accessibility issues
4. Apply fixes to improve accessibility
```

### 5. Content Extraction
```markdown
1. Open a page with content you need
2. Use "Simplify" to remove unwanted elements
3. Highlight the content you want to keep
4. Save template for similar pages
```

## Keyboard Shortcuts
- **Escape**: Clear selections and exit current mode
- **Ctrl+Z**: Undo last transformation (reset page)

## Tips and Best Practices

1. **Start with Analysis**: Always analyze the page first to understand its structure
2. **Use Templates**: Save frequently used customizations as templates
3. **Test Changes**: Apply changes incrementally and test as you go
4. **Read Suggestions**: Pay attention to AI suggestions for improvement ideas
5. **Reset When Needed**: Don't be afraid to reset and start over

## Limitations

- Changes are applied to the current session only (unless saved as templates)
- Some pages with complex JavaScript may not fully support all transformations
- Template matching is based on exact URL patterns
- Changes are lost when the page is refreshed (except saved templates)

## Future Enhancements

- [ ] CSS selector-based template matching with wildcards
- [ ] Export/import templates as JSON files
- [ ] Template marketplace for sharing customizations
- [ ] Visual editor for custom styles
- [ ] Undo/redo history stack
- [ ] Element drag-and-drop repositioning
- [ ] Custom CSS editor
- [ ] Dark mode toggle for pages
- [ ] Print-optimized templates
- [ ] Template versioning

## Troubleshooting

### Changes not applying
- Make sure you're in the correct mode (Select or Restructure)
- Check that elements are actually selected
- Try refreshing the page and starting over

### Templates not working
- Verify the URL pattern matches the current page
- Check that the template was saved successfully
- Try applying the template manually

### Elements not selectable
- Some pages may have strict CSP policies
- Try using the AI restructuring tools instead
- Consider using browser developer tools for advanced cases

## Support

For issues or questions about the Page Customization feature:
1. Check this documentation
2. Review the code in `PageCustomizationService.ts` and `PageCustomizationPanel.tsx`
3. Check the browser console for error messages

## License

This feature is part of the AI Browser project.