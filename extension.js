// File: extension.js
// VS Code extension to ask ChatGPT with context-aware conversation memory

const vscode = require('vscode');
const axios = require('axios');

let conversationHistory = [];

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const askDisposable = vscode.commands.registerCommand('chatgpt.ask', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('Open a file to use ChatGPT.');
      return;
    }

    const config = vscode.workspace.getConfiguration('chatgpt');
    const apiKey = config.get('apiKey');

    if (!apiKey) {
      vscode.window.showErrorMessage('ChatGPT API key not set. Please configure chatgpt.apiKey in your settings.');
      return;
    }

    const document = editor.document;
    const selection = editor.selection;
    const selectedText = selection.isEmpty ? '' : document.getText(selection);
    const fullText = document.getText();
    const codeToUse = selectedText && selectedText.trim().length > 0 ? selectedText : fullText;

    const prompt = await vscode.window.showInputBox({
      prompt: 'What do you want to ask ChatGPT?',
      placeHolder: 'e.g. Explain this code...'
    });

    if (!prompt) return;

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'ChatGPT is thinking...',
      cancellable: false
    }, async () => {
      try {
        const userMessage = `${prompt}\n\nDetail:\n\n${codeToUse}`;

        conversationHistory.push({ role: 'user', content: userMessage });

        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o',
            messages: conversationHistory
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const reply = response.data.choices[0].message.content;

        conversationHistory.push({ role: 'assistant', content: reply });

        const panel = vscode.window.createWebviewPanel(
          'chatgptResponse',
          'ChatGPT Response',
          vscode.ViewColumn.Beside,
          { enableScripts: true }
        );

        panel.webview.html = getWebviewContent(reply);
      } catch (err) {
        vscode.window.showErrorMessage(`ChatGPT error: ${err.message}`);
      }
    });
  });

  const clearHistoryDisposable = vscode.commands.registerCommand('chatgpt.clearHistory', () => {
    conversationHistory = [];
    vscode.window.showInformationMessage('ChatGPT conversation history cleared.');
  });

  context.subscriptions.push(askDisposable, clearHistoryDisposable);
}

function getWebviewContent(reply) {
  // Escape outer content, but not code blocks yet
  const raw = reply;

  // Match ```lang\ncode``` blocks
  const highlighted = raw.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'plaintext';
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    return `<pre><code class="language-${language}">${escapedCode}</code></pre>`;
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" rel="stylesheet" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
      <style>
        body { font-family: sans-serif; padding: 1em; }
        pre { background: #f5f5f5; padding: 1em; border-radius: 6px; overflow: auto; }
        code { font-family: monospace; }
      </style>
    </head>
    <body>
      <h2>ChatGPT Response</h2>
      ${highlighted}
    </body>
    </html>
  `;
}


function deactivate() {}

module.exports = {
  activate,
  deactivate
};
