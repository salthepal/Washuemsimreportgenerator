import { useState, useEffect } from 'react';
import { FileText, Copy, CheckCircle, AlertCircle, Eye, Code } from 'lucide-react';
import { API_BASE, getApiHeaders } from '../api';
import { GEMINI_FLASH, GEMINI_FLASH_LITE, GEMINI_PRO, DEFAULT_MODEL } from '../constants/models';
import { toast } from 'sonner';

export function ViewAIPrompt() {
  const [promptTemplate, setPromptTemplate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showFormatted, setShowFormatted] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [savingModel, setSavingModel] = useState(false);

  useEffect(() => {
    fetchPromptTemplate();
    fetchModelPreference();
  }, []);

  const fetchPromptTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/prompt-template?t=${Date.now()}`, {
        headers: getApiHeaders(),
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setPromptTemplate(data.template);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch prompt template:', response.status, errorText);
        toast.error(`Failed to fetch prompt template: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error fetching prompt template:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchModelPreference = async () => {
    try {
      const response = await fetch(`${API_BASE}/model-preference?t=${Date.now()}`, {
        headers: getApiHeaders(),
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedModel(data.model);
      }
    } catch (error) {
      console.error('Error fetching model preference:', error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(promptTemplate);
    setCopied(true);
    toast.success('Prompt template copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleModelChange = async (newModel: string) => {
    setSavingModel(true);
    try {
      const response = await fetch(`${API_BASE}/model-preference`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ model: newModel }),
      });

      if (response.ok) {
        setSelectedModel(newModel);
        toast.success(`AI model changed to ${newModel}`);
      } else {
        toast.error('Failed to change AI model');
      }
    } catch (error) {
      console.error('Error changing model:', error);
      toast.error('Failed to change AI model');
    } finally {
      setSavingModel(false);
    }
  };

  const wordCount = promptTemplate.split(/\s+/).length;
  const charCount = promptTemplate.length;
  const estimatedTokens = Math.ceil(charCount / 4); // Rough estimate: 1 token ≈ 4 chars

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          AI Prompt Template
        </h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
          View the exact prompt template sent to Gemini AI for report generation. This is the instruction set that guides the AI's output.
        </p>
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {wordCount.toLocaleString()}
            </div>
            <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Words
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {charCount.toLocaleString()}
            </div>
            <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Characters
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">
              ~{estimatedTokens.toLocaleString()}
            </div>
            <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Est. Tokens
            </div>
          </div>
        </div>
      </div>

      {/* Model Selector Card */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <Code className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 text-base md:text-lg mb-2">
              Gemini AI Model Selection
            </h3>
            <p className="text-xs md:text-sm text-purple-700 dark:text-purple-300 mb-4">
              Choose the primary Gemini model for professional report synthesis. Pro models offer maximum nuance, while Flash models are prioritized for speed. 
              <span className="block mt-1 font-semibold text-purple-900 dark:text-purple-100 italic">
                Note: LST Extraction consistently uses Flash Lite for sub-second background auditing.
              </span>
            </p>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center gap-3 flex-1 p-3 bg-white dark:bg-slate-800 border-2 rounded-lg cursor-pointer transition-all hover:border-purple-400 dark:hover:border-purple-600 has-[:checked]:border-purple-600 has-[:checked]:bg-purple-50 dark:has-[:checked]:bg-purple-900/30">
                  <input
                    type="radio"
                    name="model"
                    value={GEMINI_FLASH}
                    checked={selectedModel === GEMINI_FLASH}
                    onChange={(e) => handleModelChange(e.target.value)}
                    disabled={savingModel}
                    className="w-4 h-4 text-purple-600 focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                      Gemini Flash <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full ml-1">Default</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Balanced speed and quality
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 flex-1 p-3 bg-white dark:bg-slate-800 border-2 rounded-lg cursor-pointer transition-all hover:border-purple-400 dark:hover:border-purple-600 has-[:checked]:border-purple-600 has-[:checked]:bg-purple-50 dark:has-[:checked]:bg-purple-900/30">
                  <input
                    type="radio"
                    name="model"
                    value={GEMINI_FLASH_LITE}
                    checked={selectedModel === GEMINI_FLASH_LITE}
                    onChange={(e) => handleModelChange(e.target.value)}
                    disabled={savingModel}
                    className="w-4 h-4 text-purple-600 focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                      Gemini Flash Lite
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Fastest, most efficient
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 flex-1 p-3 bg-white dark:bg-slate-800 border-2 rounded-lg cursor-pointer transition-all hover:border-purple-400 dark:hover:border-purple-600 has-[:checked]:border-purple-600 has-[:checked]:bg-purple-50 dark:has-[:checked]:bg-purple-900/30">
                  <input
                    type="radio"
                    name="model"
                    value={GEMINI_PRO}
                    checked={selectedModel === GEMINI_PRO}
                    onChange={(e) => handleModelChange(e.target.value)}
                    disabled={savingModel}
                    className="w-4 h-4 text-purple-600 focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                      Gemini Pro
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Most capable, detailed output
                    </div>
                  </div>
                </label>
              </div>
              {savingModel && (
                <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  Saving preference...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100 text-sm md:text-base mb-1">
                View-Only Template
              </h3>
              <p className="text-xs md:text-sm text-green-700 dark:text-green-300">
                This template is read-only. It shows the exact instructions sent to the AI. Variables like <code className="bg-green-200 dark:bg-green-800 px-1 rounded">{'${priorReportsContext}'}</code> are replaced with actual data at runtime.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Code className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm md:text-base mb-1">
                Output Format: Markdown
              </h3>
              <p className="text-xs md:text-sm text-blue-700 dark:text-blue-300">
                All reports use strict Markdown formatting: <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded"># H1</code>, <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">## H2</code>, <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">### H3</code>, <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">**bold**</code>, <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">*italic*</code>. Temperature: 0.7 • Max Output: 8,192 tokens.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Display */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 md:w-5 md:h-5 text-slate-600 dark:text-slate-400" />
            <span className="font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100">
              Complete Prompt Template
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFormatted(!showFormatted)}
              className="px-3 py-1.5 text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {showFormatted ? 'Show Raw' : 'Show Formatted'}
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs md:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 md:w-4 md:h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-slate-600 dark:text-slate-400">Loading prompt template...</span>
            </div>
          ) : promptTemplate ? (
            <div className="relative">
              {showFormatted ? (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="space-y-4 text-sm md:text-base text-slate-700 dark:text-slate-300">
                    {promptTemplate.split('\n\n').map((paragraph, idx) => {
                      // Detect section headers
                      if (paragraph.match(/^[A-Z\s]+:$/m) || paragraph.startsWith('===')) {
                        return (
                          <h3 key={idx} className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 mt-6 mb-2">
                            {paragraph}
                          </h3>
                        );
                      }
                      // Detect numbered lists
                      if (paragraph.match(/^\d+\./m)) {
                        return (
                          <div key={idx} className="pl-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 py-2 px-3 rounded">
                            {paragraph.split('\n').map((line, lineIdx) => (
                              <div key={lineIdx} className="mb-1">{line}</div>
                            ))}
                          </div>
                        );
                      }
                      // Detect variable placeholders
                      if (paragraph.includes('${')) {
                        return (
                          <div key={idx} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            <code className="text-xs md:text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap break-words">
                              {paragraph}
                            </code>
                          </div>
                        );
                      }
                      // Regular paragraph
                      return (
                        <p key={idx} className="leading-relaxed">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <pre className="text-xs md:text-sm font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words overflow-x-auto bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
{promptTemplate}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No prompt template available</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100 mb-3">
          How the Prompt Works
        </h3>
        <div className="space-y-3 text-xs md:text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
              1
            </div>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Style Learning:</strong> The AI analyzes your uploaded prior reports to learn their exact structure, formatting, and writing style.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
              2
            </div>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Content Synthesis:</strong> New session notes are analyzed to extract latent safety threats, learning points, and common threads mentioned by multiple observers.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
              3
            </div>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Context Integration:</strong> Case files (if provided) give the AI accurate patient details and scenario specifics to reference in the report.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
              4
            </div>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Report Generation:</strong> The AI generates a new report that matches your style exactly while incorporating all new observations and insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}