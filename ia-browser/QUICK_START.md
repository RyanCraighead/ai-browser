# Quick Start Guide - Page Customization Feature

This guide will help you quickly test and use the new Page Customization feature.

## What Was Built

I've implemented a comprehensive web page customization system that allows you to:

1. **Analyze any web page** - See element counts, structure, reading time, etc.
2. **Select and modify elements** - Click to hide, remove, highlight, or replace any element
3. **AI-powered restructuring** - One-click improvements (Simplify, Clean, Focus, Readability, Mobile)
4. **Save and reuse templates** - Save your customizations and apply them to similar pages
5. **Smart suggestions** - Get AI recommendations for page improvements

## Files Created/Modified

### New Files
- `src/types.ts` - TypeScript type definitions for customization
- `src/PageCustomizationService.ts` - Core service for customization logic
- `src/PageCustomizationPanel.tsx` - React UI component
- `PAGE_CUSTOMIZATION.md` - Comprehensive documentation
- `QUICK_START.md` - This file

### Modified Files
- `src/App.tsx` - Integrated the customization panel
- `README.md` - Updated with feature documentation

## How to Test

### Step 1: Start the Browser

```bash
cd ia-browser
npm install
npm run dev
```

### Step 2: Open a Web Page

Navigate to any webpage (e.g., Wikipedia, a news site, or any article).

### Step 3: Open Customization Panel

Click the **🎨 Customize** button in the secondary toolbar (the row below the main toolbar).

### Step 4: Test Inspection Mode

1. Make sure **🔍 Inspect** mode is selected (blue background)
2. Move your mouse over different elements on the page
3. You'll see blue borders and tooltips showing element types

### Step 5: Test Selection Mode

1. Switch to **✅ Select** mode
2. Click on elements you want to modify (they'll get blue outlines)
3. Click **📋 Get Selected** to see selected elements
4. Click **✕ Clear** to clear selections

### Step 6: Test Transformation Tools

1. Select some elements (or skip to use AI tools)
2. Click on transformation buttons:
   - **👁️ Hide** - Hide selected elements
   - **🗑️ Remove** - Remove selected elements
   - **✨ Highlight** - Highlight selected elements
   - **📝 Replace** - Replace element content

### Step 7: Test AI Restructuring

Click the AI restructuring buttons to see instant improvements:

- **🧹 Simplify** - Removes sidebars, ads, and clutter
- **✨ Clean** - Cleans up decorative elements and excessive spacing
- **🎯 Focus** - Highlights main content, dims less important sections
- **📖 Readability** - Improves typography and font sizes
- **📱 Mobile Friendly** - Optimizes for mobile viewing

### Step 8: Test Page Analysis

1. Click **🔄 Analyze** in the panel header
2. View the page statistics (elements, images, links, forms, reading time)
3. Check the AI suggestions for improvements

### Step 9: Test Template System

1. Make some customizations to the page
2. Click **+ Save** in the Templates section
3. Enter a template name (e.g., "Clean Reading")
4. Click **Save**
5. Refresh the page to reset
6. Click **✓ Apply** on your saved template to reapply changes

### Step 10: Reset the Page

Click **🔄 Reset Page** at the bottom to reload and undo all changes.

## Example Use Cases

### Use Case 1: Clean Article Reading

```
1. Open a news article or blog post
2. Click 🎨 Customize
3. Click "🧹 Simplify" to remove sidebars and ads
4. Click "📖 Readability" to improve typography
5. Save as "Clean Reading" template
6. Apply to all articles from this site
```

### Use Case 2: Research Note-Taking

```
1. Open a research paper or article
2. Click 🎨 Customize
3. Switch to Select mode
4. Click to highlight key sections
5. Click "✨ Highlight" to mark important parts
6. Save as "Research Notes" template
```

### Use Case 3: Mobile Optimization

```
1. Open any web page
2. Click 🎨 Customize
3. Click "📱 Mobile Friendly"
4. Page is now optimized for mobile viewing
5. Save as "Mobile Optimized" template
```

### Use Case 4: Content Extraction

```
1. Open a page with content you need
2. Click 🎨 Customize
3. Click "🧹 Simplify" to remove unwanted elements
4. Select and remove remaining clutter
5. Save as "Content Extractor" template
```

## Tips for Testing

1. **Try different pages** - Test on various types of websites (news, blogs, documentation, etc.)
2. **Combine tools** - Use multiple transformations together for best results
3. **Check suggestions** - Read the AI suggestions for improvement ideas
4. **Save templates** - Create templates for different use cases
5. **Reset often** - Don't be afraid to reset and try different approaches

## Known Limitations

- Changes are session-only unless saved as templates
- Some pages with complex JavaScript may not fully support all transformations
- Template matching is based on exact URL patterns
- Elements must be visible to be selectable

## Troubleshooting

### Customization panel not showing?
- Make sure you clicked the 🎨 Customize button
- Check that the panel width is sufficient (300px)

### Elements not selectable?
- Switch to Select mode
- Make sure elements are visible on the page
- Try using AI restructuring tools instead

### Changes not applying?
- Verify you're in the correct mode
- Check that elements are selected
- Try refreshing the page

### Templates not saving?
- Check browser console for errors
- Verify localStorage is available
- Make sure you entered a template name

## Next Steps

Once you've tested the basic features, try:

1. **Create multiple templates** for different websites
2. **Combine AI and manual tools** for best results
3. **Experiment with different modes** to find what works best
4. **Read the full documentation** in `PAGE_CUSTOMIZATION.md`

## Feedback

If you encounter any issues or have suggestions:

1. Check the browser console for error messages
2. Review the documentation in `PAGE_CUSTOMIZATION.md`
3. Test on different types of pages to isolate issues
4. Document the steps to reproduce any bugs

## Technical Implementation Details

The feature consists of:

- **PageCustomizationService**: Singleton service that handles all customization logic
- **PageCustomizationPanel**: React component providing the UI
- **TypeScript types**: Strongly typed definitions for all customization operations
- **LocalStorage**: Templates are stored locally in the browser
- **Webview API**: Uses Electron's webview.executeJavaScript for page manipulation

All code is production-ready with proper error handling, TypeScript types, and comprehensive documentation.

---

**Happy Customizing!** 🎨