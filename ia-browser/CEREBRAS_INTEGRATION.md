This document explains how to configure and use the Cerebras API integration in the AI Browser.

## Overview

The AI Browser now uses **Cerebras API** with the **zai-glm-4.7** model for all AI-powered features:
- Page summarization
- Simple explanations
- Key fact extraction
- JSON conversion
- Checklist generation
- Action item detection
- Page chat
- Research
- Page restructuring suggestions

## Getting Started

### 1. Get Your API Key

1. Visit [cloud.cerebras.ai](https://cloud.cerebras.ai)
2. Sign up for an account (if you don't have one)
3. Navigate to the API Keys section
4. Generate a new API key
5. Copy your API key

### 2. Configure in Settings

1. Open the AI Browser
2. Click the **⚙️ Settings** button in the secondary toolbar
3. Enter your Cerebras API key in the API Key field
4. Click **💾 Save Settings**
5. Click **🧪 Test Connection** to verify your API key works

## Configuration Options

### Model
- **zai-glm-4.7** (Recommended) - High-performance model with reasoning capabilities
- **zai-glm-4.7-mini** - Faster, smaller model for simple tasks
- **gpt-4o-mini** - Alternative OpenAI model

### Temperature (0.0 - 2.0)
Controls the randomness of responses:
- **0.0 - 0.3**: Precise, deterministic responses
- **0.4 - 0.7**: Balanced responses
- **0.8 - 1.2**: Creative responses (recommended with reasoning)
- **1.3 - 2.0**: Very creative responses

**Recommended**: 1.0 (with reasoning enabled)

### Top P (0.0 - 1.0)
Controls diversity of responses:
- Lower values: More focused, deterministic
- Higher values: More diverse, creative

**Recommended**: 0.95

### Max Tokens (1000 - 40000)
Maximum length of AI responses in tokens:
- **1000**: Short responses
- **4000**: Medium responses
- **8000**: Long responses
- **40000**: Maximum supported by Cerebras

**Recommended**: 40000 (for comprehensive analysis)

### Disable Reasoning
- **Unchecked** (Default): Reasoning enabled for complex tasks
- **Checked**: Faster responses without verbose reasoning

**When to disable**: Simple tasks where speed is more important than depth
**When to enable**: Complex analysis, research, restructuring

## Using the AI Features

### 1. Page Summarization
1. Navigate to any webpage
2. Click **📝 Summarize** in the toolbar
3. AI will generate a comprehensive summary with:
   - Page title
   - Main points (numbered list)
   - Quick takeaway

### 2. Simple Explanation
1. Open the AI Sidebar (click AI button)
2. Click **🧒 Explain Like I'm 12**
3. AI will simplify complex concepts using:
   - Simple language
   - Relatable analogies
   - Clear examples

### 3. Key Facts Extraction
1. Open the AI Sidebar
2. Click **🔑 Extract Key Facts**
3. AI will identify:
   - Important facts
   - Statistics
   - Key insights

### 4. JSON Conversion
1. Open the AI Sidebar
2. Click **{ } Convert to JSON**
3. AI will convert page content to structured JSON with:
   - Metadata
   - Content sections
   - Analysis data

### 5. Checklist Generation
1. Open the AI Sidebar
2. Click **✅ Turn into Checklist**
3. AI will create actionable checklist items

### 6. Action Items Detection
1. Open the AI Sidebar
2. Click **📋 Find Action Items**
3. AI will identify tasks and next steps

### 7. Chat with Page
1. Open the AI Sidebar
2. Type your question in the chat input
3. Click **Send**
4. AI will answer using the page content

### 8. Research
1. Click **🔬 Research** in the secondary toolbar
2. Enter a research topic
3. Click **🚀 Start Research**
4. AI will conduct comprehensive research

### 9. Page Customization
1. Click **🎨 Customize** in the secondary toolbar
2. Click **🔄 Analyze** to get page insights
3. Use AI restructuring tools:
   - **🧹 Simplify**: Remove clutter
   - **✨ Clean**: Clean up decorative elements
   - **🎯 Focus**: Highlight main content
   - **📖 Readability**: Improve typography
   - **📱 Mobile Friendly**: Optimize for mobile

## Best Practices

### 1. API Key Security
- Never share your API key publicly
- Store it securely in the browser settings
- Don't commit API keys to version control
- Rotate API keys regularly

### 2. Performance Optimization
- **Disable reasoning** for simple tasks to reduce latency
- **Lower max tokens** for short responses
- **Use appropriate temperature** for your use case
- **Cache results** when possible

### 3. Cost Management
- Monitor your Cerebras API usage
- Use appropriate model versions
- Set reasonable max tokens limits
- Disable reasoning when not needed

### 4. Quality Tips
- **Front-load instructions** in your prompts
- **Use clear, direct language** (MUST, REQUIRED, STRICTLY)
- **Specify default language** (e.g., "Always respond in English")
- **Use role prompts** for better consistency
- **Break down complex tasks** into smaller steps

## Model-Specific Guidelines for zai-glm-4.7

### Prompting Style
zai-glm-4.7 follows best practices:

1. **Front-load instructions**: Place rules at the beginning of system prompts
2. **Use explicit language**: Use MUST, REQUIRED instead of "please try to"
3. **Specify language**: Add "Always respond in English" directives
4. **Use roles**: Assign clear personas for consistency
5. **Reasoning control**: Enable for complex tasks, disable for speed

### Recommended Settings
```
Model: zai-glm-4.7
Temperature: 1.0
Top P: 0.95
Max Tokens: 40000
Reasoning: Enabled (for complex tasks)
```

### Performance Characteristics
- **Context Window**: ~131,000 tokens
- **Max Completion**: 40,000 tokens
- **Speed**: Very fast inference
- **Quality**: High accuracy and reasoning

## Troubleshooting

### API Key Errors

**Error**: "Cerebras API key not configured"
- **Solution**: Open Settings and enter your API key

**Error**: "Invalid API key"
- **Solution**: Verify your API key is correct and active

**Error**: "API quota exceeded"
- **Solution**: Check your Cerebras account usage and upgrade if needed

### Connection Errors

**Error**: "Connection failed"
- **Solution**: Check your internet connection
- **Solution**: Verify Cerebras API is operational (check status page)
- **Solution**: Try the Test Connection button in Settings

### Response Issues

**Error**: "Empty response"
- **Solution**: Increase max tokens
- **Solution**: Check if page content was extracted properly
- **Solution**: Try with a different webpage

**Error**: "Response too long"
- **Solution**: Reduce max tokens
- **Solution**: Disable reasoning for faster responses

**Error**: "Response not in expected format"
- **Solution**: Try with a different temperature setting
- **Solution**: Clear conversation history and try again

### Performance Issues

**Issue**: Slow responses
- **Solution**: Disable reasoning for simple tasks
- **Solution**: Reduce max tokens
- **Solution**: Use zai-glm-4.7-mini model

**Issue**: High API costs
- **Solution**: Monitor usage in Cerebras dashboard
- **Solution**: Reduce max tokens
- **Solution**: Disable reasoning when not needed
- **Solution**: Use smaller models for simple tasks

## Advanced Usage

