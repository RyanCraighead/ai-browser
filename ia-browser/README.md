# AI Browser - The Ultimate Web Customization Experience

A next-generation AI-powered web browser built with React, TypeScript, and Electron that transforms how you interact with the web. Customize any page however you want, save templates, and use AI to improve your browsing experience.

## Features

### 🎨 Page Customization (NEW!)
- **Inspect Mode**: Hover over any element to see its structure and properties
- **Select Mode**: Click to select multiple elements for modification
- **Transformation Tools**: Hide, remove, highlight, or replace any element
- **AI Restructuring**: One-click improvements with Simplify, Clean, Focus, Readability, and Mobile modes
- **Template System**: Save your customizations and apply them to similar pages
- **Smart Suggestions**: AI-powered recommendations for page improvements

### 🤖 AI-Powered Features
- **Page Summarization**: Get concise summaries of any page
- **Key Facts Extraction**: Pull out the most important information
- **JSON Conversion**: Turn page content into structured JSON
- **Checklist Generation**: Convert content into actionable items
- **Action Items Detection**: Identify tasks and next steps
- **Simple Explanations**: Complex topics explained simply

### 📚 Browsing Tools
- **Bookmarks**: Save and organize your favorite pages
- **History**: Track your browsing history
- **Downloads**: Download manager with progress tracking
- **Ad Blocking**: Built-in ad blocking for cleaner browsing
- **AI Highlights**: Automatically highlight important content
- **Page Watching**: Monitor pages for changes

### 🔬 Advanced Features
- **Multi-Agent Research**: AI-powered research across multiple sources
- **Auto-fill Forms**: Smart form filling with demo data
- **Tab Management**: Multiple tabs with easy navigation
- **Search Integration**: Built-in search via DuckDuckGo

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ia-browser

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Building for Production

```bash
# Build the application
npm run build

# Package as executable
npm run build:electron
```

## Usage

### Page Customization

1. **Open the Customization Panel**: Click the 🎨 Customize button in the secondary toolbar
2. **Choose a Mode**: Select Inspect, Select, Restructure, or Style mode
3. **Analyze the Page**: Click 🔄 Analyze to see page structure
4. **Make Changes**: Use transformation tools or AI restructuring
5. **Save Templates**: Save your customizations for reuse

#### Example: Clean Reading Experience

```bash
1. Navigate to an article page
2. Click 🎨 Customize
3. Select "Simplify" to remove sidebars and ads
4. Save as "Clean Reading" template
5. Apply to all similar articles
```

### AI Features

1. **Summarize a Page**: Click 📝 Summarize in the toolbar
2. **Open AI Sidebar**: Click the AI button
3. **Choose a Feature**: Select from the available AI features
4. **Chat with AI**: Ask questions about the current page

### Bookmarks & History

1. **Bookmark a Page**: Click ★ in the toolbar
2. **View Bookmarks**: Click 📑 Bookmarks in the secondary toolbar
3. **View History**: Click 🕐 History in the secondary toolbar

## Project Structure

```
ia-browser/
├── electron/              # Electron main process
│   ├── main.ts           # Main entry point
│   └── preload.ts        # Preload scripts
├── src/
│   ├── App.tsx           # Main React component
│   ├── PageCustomizationPanel.tsx  # Customization UI
│   ├── PageCustomizationService.ts # Customization logic
│   └── types.ts          # TypeScript type definitions
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

## Technical Details

### Technologies
- **React**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Electron**: Desktop application framework
- **Electron Builder**: Application packaging

### Key Components

#### PageCustomizationService
- Element selection and highlighting
- Transformation application
- Template management
- Page analysis
- AI-powered restructuring

#### PageCustomizationPanel
- Mode selection UI
- Element selection management
- Transformation tools
- Template management interface

## Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# API keys (if needed for future AI features)
OPENAI_API_KEY=your_api_key_here
```

### Browser Settings
- User Agent: Configurable for compatibility
- Partition: `persist:ia-browser` for persistent storage
- Viewport: 1200px width for consistent rendering

## Templates

Templates are stored in `localStorage` under the key `pageTemplates`. Each template contains:

```typescript
{
  id: string;
  name: string;
  urlPattern: string;
  originalUrl: string;
  title: string;
  transformations: TransformationRule[];
  createdAt: number;
  updatedAt: number;
  isDefault: boolean;
}
```

## Development

### Adding New Features

1. Define types in `src/types.ts`
2. Implement logic in `src/PageCustomizationService.ts`
3. Create UI components as needed
4. Update `src/App.tsx` to integrate feature
5. Test thoroughly

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use functional components with hooks
- Keep components small and focused
- Add meaningful comments

## Troubleshooting

### Page Customization Issues

**Changes not applying?**
- Verify you're in the correct mode
- Check that elements are selected
- Try refreshing the page

**Templates not working?**
- Verify URL pattern matches
- Check template was saved
- Try applying manually

### General Issues

**Webview not loading?**
- Check internet connection
- Verify URL is correct
- Check browser console for errors

**Feature not working?**
- Check browser console for errors
- Verify webview is ready
- Try reloading the page

## Future Enhancements

- [ ] CSS selector-based template matching
- [ ] Export/import templates as JSON
- [ ] Template marketplace
- [ ] Visual style editor
- [ ] Undo/redo history
- [ ] Drag-and-drop repositioning
- [ ] Custom CSS editor
- [ ] Dark mode toggle for pages
- [ ] Print-optimized templates
- [ ] Template versioning
- [ ] Cloud sync for templates
- [ ] AI-powered personalization
- [ ] Voice commands for customization

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Built with React, TypeScript, and Electron
- Inspired by modern AI-powered tools
- Created for the ultimate browsing experience

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check the documentation in `/docs`
- Review the code comments

## Documentation

- [Page Customization Feature](./PAGE_CUSTOMIZATION.md) - Detailed guide for customization features
- [API Documentation](./docs/API.md) - Technical API reference
- [Development Guide](./docs/DEVELOPMENT.md) - Development setup and guide

## Changelog

### Version 1.0.0 (Current)
- ✅ Page Customization feature
- ✅ AI-powered analysis tools
- ✅ Template system
- ✅ Element selection and transformation
- ✅ Smart suggestions
- ✅ Bookmarks, History, Downloads
- ✅ Multi-agent research
- ✅ Page watching
- ✅ Auto-fill forms

---

**Built with ❤️ by the AI Browser team**

*Transform your web experience with AI-powered customization*