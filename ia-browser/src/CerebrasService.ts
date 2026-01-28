import { PageAnalysis } from './types';

export interface CerebrasConfig {
  apiKey: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  disableReasoning: boolean;
}

export class CerebrasService {
  private static instance: CerebrasService;
  private config: CerebrasConfig = {
    apiKey: '',
    model: 'zai-glm-4.7',
    temperature: 1,
    topP: 0.95,
    maxTokens: 40000,
    disableReasoning: false
  };

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): CerebrasService {
    if (!CerebrasService.instance) {
      CerebrasService.instance = new CerebrasService();
    }
    return CerebrasService.instance;
  }

  loadConfig(): void {
    const saved = localStorage.getItem('cerebrasConfig');
    if (saved) {
      try {
        this.config = { ...this.config, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to load Cerebras config:', e);
      }
    }
  }

  saveConfig(config: Partial<CerebrasConfig>): void {
    this.config = { ...this.config, ...config };
    localStorage.setItem('cerebrasConfig', JSON.stringify(this.config));
  }

  getConfig(): CerebrasConfig {
    return { ...this.config };
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.apiKey.length > 0);
  }

  async chat(
    message: string,
    systemPrompt?: string,
    context?: string
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Cerebras API key not configured. Please set it in Settings.');
    }

    const messages: Array<{ role: string; content: string }> = [];

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Add context if provided
    if (context) {
      messages.push({
        role: 'system',
        content: `You are analyzing the following web page content. Use this context to answer the user's question.\n\nPage content:\n${context.substring(0, 50000)}`
      });
    }

    // Add user message
    messages.push({ role: 'user', content: message });

    try {
      const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          top_p: this.config.topP,
          max_completion_tokens: this.config.maxTokens,
          clear_thinking: !this.config.disableReasoning,
          disable_reasoning: this.config.disableReasoning
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cerebras API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('Cerebras API call failed:', error);
      throw error;
    }
  }

  async summarizePage(content: string, url: string, title: string): Promise<string> {
    const systemPrompt = `You are an expert at summarizing web pages. 
You MUST provide concise, accurate summaries that capture the main points.
Your response should be in English and use Markdown formatting.
Include the page title, main points (as a numbered list), and a brief conclusion.`;

    const message = `Summarize this web page:

Title: ${title}
URL: ${url}

Content:
${content.substring(0, 80000)}`;

    return await this.chat(message, systemPrompt);
  }

  async explainLike12(content: string, title: string): Promise<string> {
    const systemPrompt = `You are an expert at explaining complex topics to a 12-year-old.
You MUST use simple language, relatable analogies, and clear examples.
Your response should be in English and use Markdown formatting.
Break down concepts into easy-to-understand parts.`;

    const message = `Explain this content like I'm 12 years old:

Title: ${title}

Content:
${content.substring(0, 60000)}`;

    return await this.chat(message, systemPrompt);
  }

  async extractKeyFacts(content: string, title: string): Promise<string> {
    const systemPrompt = `You are an expert at extracting key information from text.
You MUST identify the most important facts, statistics, and insights.
Your response should be in English and use Markdown formatting with bullet points.
Prioritize factual information over opinions.`;

    const message = `Extract the key facts from this content:

Title: ${title}

Content:
${content.substring(0, 60000)}`;

    return await this.chat(message, systemPrompt);
  }

  async convertToJson(content: string, title: string, url: string): Promise<string> {
    const systemPrompt = `You are an expert at structuring unstructured data.
You MUST convert the content into valid JSON format.
Your response should ONLY be valid JSON, no other text.
Include metadata, content sections, and analysis.`;

    const message = `Convert this web page content to structured JSON:

Title: ${title}
URL: ${url}

Content:
${content.substring(0, 60000)}`;

    try {
      const response = await this.chat(message, systemPrompt);
      // Validate JSON
      const parsed = JSON.parse(response);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      throw new Error('Failed to generate valid JSON. Please try again.');
    }
  }

  async turnIntoChecklist(content: string, title: string): Promise<string> {
    const systemPrompt = `You are an expert at creating actionable checklists.
You MUST convert content into clear, actionable checklist items.
Your response should be in English and use Markdown checkbox format.
Each item should be specific and actionable.`;

    const message = `Turn this content into a checklist:

Title: ${title}

Content:
${content.substring(0, 60000)}`;

    return await this.chat(message, systemPrompt);
  }

  async findActionItems(content: string, title: string): Promise<string> {
    const systemPrompt = `You are an expert at identifying action items in text.
You MUST find tasks, to-dos, and actionable steps.
Your response should be in English and use Markdown formatting.
Group related actions together and prioritize them.`;

    const message = `Find all action items in this content:

Title: ${title}

Content:
${content.substring(0, 60000)}`;

    return await this.chat(message, systemPrompt);
  }

  async getRestructuringSuggestions(analysis: PageAnalysis): Promise<string[]> {
    const systemPrompt = `You are an expert web designer and UX specialist.
You MUST provide specific, actionable suggestions for improving web pages.
Your response should be in English and use bullet points.
Focus on readability, accessibility, and user experience.`;

    const message = `Analyze this web page and provide restructuring suggestions:

Page Title: ${analysis.title}
URL: ${analysis.url}

Statistics:
- Total elements: ${analysis.elementCount}
- Images: ${analysis.imageCount}
- Links: ${analysis.linkCount}
- Forms: ${analysis.formCount}
- Reading time: ${analysis.estimatedReadingTime} minutes
- Sections: ${analysis.structure.sections.length}

Headings: ${analysis.structure.headings.slice(0, 10).map(h => `H${h.level}: ${h.text}`).join(', ')}

Provide 5-7 specific suggestions for improving this page.`;

    const response = await this.chat(message, systemPrompt);
    // Parse bullet points
    return response.split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*') || line.trim().startsWith('•'))
      .map(line => '🔹 ' + line.replace(/^[-*•]\s*/, '').trim());
  }

  async chatWithPage(question: string, content: string, title: string): Promise<string> {
    const systemPrompt = `You are a helpful AI assistant answering questions about web pages.
You MUST provide accurate, helpful responses based on the page content.
Your response should be in English and use Markdown formatting.
If the information isn't in the content, say so clearly.`;

    const message = `Question: ${question}

Page: ${title}

Content:
${content.substring(0, 60000)}`;

    return await this.chat(message, systemPrompt);
  }

  async chatWithPageAndSchema(
    question: string,
    content: string,
    title: string,
    pageSchema?: string,
    domSnapshot?: any,
    userContext?: string
  ): Promise<string> {
    const systemPrompt = `You are a helpful AI assistant answering questions about web pages.
You MUST provide accurate, helpful responses based on the page content.
Your response should be in English and use Markdown formatting.
If the information isn't in the content, say so clearly.
If a page schema is provided, use it to ground your understanding of the page structure.`;

    const domText = domSnapshot ? JSON.stringify(domSnapshot).substring(0, 60000) : '';

    const message = `Question: ${question}

Page: ${title}

Content:
${content.substring(0, 60000)}

${pageSchema ? `Page Schema (JSON):\n${pageSchema.substring(0, 60000)}` : ''}

${domText ? `DOM Snapshot (truncated):\n${domText}` : ''}

${userContext ? `User Context Notes:\n${userContext.substring(0, 8000)}` : ''}`;

    return await this.chat(message, systemPrompt);
  }

  async buildPageSchema(domSnapshot: any): Promise<string> {
    const systemPrompt = `You are a web automation schema builder.
You MUST convert the provided DOM snapshot into a compact JSON schema describing the page's interactive elements.
Return ONLY valid JSON with this shape:
{
  "version": "1.0",
  "page": { "title": "...", "url": "..." },
  "elements": [
    { "id": "unique_id", "role": "input|button|link|select|textarea|form", "label": "...", "selector": "...", "type": "...", "attributes": { } }
  ],
  "forms": [
    { "label": "...", "selector": "...", "fields": [ { "label": "...", "selector": "...", "type": "..." } ] }
  ],
  "notes": "short summary"
}
Keep it compact and prioritize elements a user is likely to interact with.`;

    const snapshotText = JSON.stringify(domSnapshot).substring(0, 80000);
    const message = `Build a page schema from this DOM snapshot JSON:

${snapshotText}`;

    return await this.chat(message, systemPrompt);
  }

  async planPageActions(userRequest: string, pageSchema: string): Promise<string> {
    const systemPrompt = `You are a web automation planner.
Given a user request and a page schema JSON, output ONLY valid JSON in this shape:
{
  "actions": [
    { "type": "click|type|select|press|focus|scroll", "selector": "...", "text": "...", "value": "...", "key": "Enter", "by": 300, "to": 1200 }
  ],
  "notes": "short explanation"
}
Rules:
- Use selectors from the schema whenever possible.
- Only include actions you are confident about.
- If unsure, return {"actions":[],"notes":"Not enough confidence"} with no extra text.`;

    const message = `User request:
${userRequest}

Page schema JSON:
${pageSchema.substring(0, 60000)}`;

    return await this.chat(message, systemPrompt);
  }

  async planChatBrowsing(
    userRequest: string,
    context: {
      currentUrl: string;
      currentTitle: string;
      memorySummary: string;
      frequentSites: Array<{
        title: string;
        host: string;
        baseUrl: string;
        count: number;
        lastVisited: number;
        recentUrls: string[];
        score: number;
      }>;
      pageSchema?: string | null;
      contextNotesSummary?: string;
    }
  ): Promise<string> {
    const systemPrompt = `You are an AI browsing copilot.
You can suggest navigation actions and simple page actions.
Return ONLY valid JSON with this shape:
{
  "response": "Assistant response to show the user",
  "actions": [
    { "type": "open_url", "url": "https://example.com", "inNewTab": false },
    { "type": "search", "query": "search terms" },
    { "type": "suggest_sites", "suggestions": ["https://..."] },
    { "type": "create_site", "prompt": "short creation brief", "creationType": "webpage|app|game" },
    {
      "type": "page_actions",
      "plan": {
        "actions": [
          { "type": "click|type|select|press|focus|scroll", "selector": "...", "text": "...", "value": "...", "key": "Enter", "by": 300, "to": 1200 }
        ],
        "notes": "short explanation"
      }
    }
  ],
  "notes": "optional short notes"
}
Rules:
- Prefer frequent sites when the user's intent matches them.
- Use open_url for direct navigation.
- Use search when the user wants to find something but no site is obvious.
- Use create_site when the user wants something that doesn't exist or is best served by a custom page/app.
- Only include page_actions when confident.
- If no action is needed, return an empty actions array.`;

    const trimmedSites = context.frequentSites.slice(0, 10).map(site => ({
      ...site,
      recentUrls: site.recentUrls.slice(0, 4)
    }));

    const message = `User request:
${userRequest}

Current page:
- Title: ${context.currentTitle}
- URL: ${context.currentUrl}

Frequent sites (JSON):
${JSON.stringify(trimmedSites).substring(0, 20000)}

Frequent sites summary:
${context.memorySummary}

    ${context.pageSchema ? `Page schema (JSON):\n${context.pageSchema.substring(0, 30000)}` : ''}

${context.contextNotesSummary ? `User context notes:\n${context.contextNotesSummary.substring(0, 8000)}` : ''}`;

    return await this.chat(message, systemPrompt);
  }

  async generateExtension(request: string, domSnapshot: any): Promise<string> {
    const systemPrompt = `You are an expert browser extension generator.
You MUST output ONLY valid JSON with this shape:
{
  "name": "Short name",
  "description": "One sentence summary",
  "match": "optional substring to match current URL",
  "code": "JavaScript code to run in the page context"
}
Rules:
- The "code" field must be plain JavaScript without backticks or markdown.
- Keep code concise and focused on the request.
- If selectors are needed, derive them from the provided DOM snapshot.
- Do not include explanations outside JSON.`;

    const snapshotText = JSON.stringify(domSnapshot).substring(0, 60000);
    const message = `Generate an extension based on this request:
${request}

DOM snapshot:
${snapshotText}`;

    return await this.chat(message, systemPrompt);
  }

  async generateCreation(prompt: string, type: 'webpage' | 'game' | 'app'): Promise<string> {
    const systemPrompt = `You are an expert creative web developer.
You MUST output ONLY valid JSON with this shape:
{
  "title": "Short descriptive title",
  "type": "webpage|game|app",
  "description": "One sentence summary",
  "html": "Complete single-file HTML with inline CSS and JS"
}
Rules:
- The "html" field must be a JSON string with escaped newlines and quotes.
- Use a single HTML file (no external assets, no CDNs, no frameworks).
- Include all CSS in a <style> tag and all JS in a <script> tag.
- The output must run offline in a browser.
- Do not wrap the JSON in markdown or backticks.`;

    const message = `Create a ${type} based on this prompt:
${prompt}

Constraints:
- Keep it lightweight and self-contained.
- Prefer semantic HTML and accessible UI.
- Include brief in-app instructions if it's a game or interactive app.`;

    return await this.chat(message, systemPrompt);
  }

  async researchTopic(topic: string): Promise<string> {
    const systemPrompt = `You are a research AI with access to comprehensive knowledge.
You MUST provide thorough, well-structured research on the given topic.
Your response should be in English and use Markdown formatting with sections.
Include key points, examples, and references where relevant.`;

    const message = `Conduct research on: ${topic}

Provide a comprehensive overview including:
- Introduction and definition
- Key concepts and principles
- Applications and use cases
- Benefits and limitations
- Current state and future trends`;

    return await this.chat(message, systemPrompt);
  }

  async getPageRestructuringPlan(analysis: PageAnalysis): Promise<string> {
    const systemPrompt = `You are an expert at web page restructuring and optimization.
You MUST provide a detailed, step-by-step restructuring plan.
Your response should be in English and use numbered steps.
Focus on improving readability, removing clutter, and enhancing user experience.`;

    const message = `Create a restructuring plan for this page:

Title: ${analysis.title}
URL: ${analysis.url}

Analysis:
- Element count: ${analysis.elementCount}
- Main sections: ${analysis.mainSections.length}
- Images: ${analysis.imageCount}
- Links: ${analysis.linkCount}

Provide a step-by-step plan to optimize this page.`;

    return await this.chat(message, systemPrompt);
  }
}
