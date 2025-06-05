const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

let conversationHistory = [];

function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'prompt.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent);
    } else {
      vscode.window.showErrorMessage('prompt.json not found in extension directory.');
      return {};
    }
  } catch (e) {
    vscode.window.showErrorMessage('Failed to load prompt.json: ' + e.message);
    return {};
  }
}

function activate(context) {
  const configData = loadConfig();

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

    const selection = editor.selection;
    const selectedText = selection.isEmpty ? '' : editor.document.getText(selection);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder found.');
      return;
    }

    const fileTreeHTML = buildFileTreeHTML(workspaceRoot, workspaceRoot);

    const panel = vscode.window.createWebviewPanel(
      'chatgptForm',
      'Ask ChatGPT',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    panel.webview.html = generateFormHTML(selectedText, fileTreeHTML);

    panel.webview.onDidReceiveMessage(async message => {
      if (message.command === 'submit') {
        const { question, useSelection, files } = message.content;

        const codeToUse = useSelection && selectedText.trim().length > 0 ? selectedText : '';
        let fileContents = '';

        for (const filePath of files) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            fileContents += `\n\nFile: ${path.basename(filePath)}\n${content}`;
          } catch (err) {
            vscode.window.showErrorMessage(`Error reading file ${filePath}: ${err.message}`);
          }
        }

        const userMessage = `${question}\n\n${configData.genericPrompt || ''}\n\n${codeToUse}\n\n${fileContents}`;
        conversationHistory.push({ role: 'user', content: userMessage });

        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'ChatGPT is thinking...',
          cancellable: false
        }, async () => {
          try {
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

            const responsePanel = vscode.window.createWebviewPanel(
              'chatgptResponse',
              'ChatGPT Response',
              vscode.ViewColumn.Beside,
              { enableScripts: true }
            );

            responsePanel.webview.html = getWebviewContent(reply);
          } catch (err) {
            vscode.window.showErrorMessage(`ChatGPT error: ${err.message}`);
          }
        });
      }
    });
  });

  const clearHistoryDisposable = vscode.commands.registerCommand('chatgpt.clearHistory', () => {
    conversationHistory = [];
    vscode.window.showInformationMessage('ChatGPT conversation history cleared.');
  });

  context.subscriptions.push(askDisposable, clearHistoryDisposable);
}

// Recursively scan directory and generate nested HTML list
function buildFileTreeHTML(basePath, currentPath) {
  const items = fs.readdirSync(currentPath, { withFileTypes: true });
  const entries = items
    .filter(item => item.name !== 'node_modules' && !item.name.startsWith('.'))
    .map(item => {
      const fullPath = path.join(currentPath, item.name);
      const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');
      if (item.isDirectory()) {
        const children = buildFileTreeHTML(basePath, fullPath);
        return `<li><details><summary>${item.name}</summary><ul>${children}</ul></details></li>`;
      } else {
        return `<li><label><input type="checkbox" value="${fullPath}"> ${item.name}</label></li>`;
      }
    });
  return entries.join('');
}

function generateFormHTML(selectedText, fileTreeHTML) {
  const isSelected = selectedText.trim().length > 0;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: sans-serif; padding: 20px; }
        input[type="text"] { width: 100%; padding: 8px; }
        button { margin-top: 15px; padding: 8px 16px; }
        ul { list-style-type: none; padding-left: 20px; }
        summary { cursor: pointer; font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>Ask ChatGPT</h2>
      <form id="chatgptForm">
        <label><input type="checkbox" id="useSelection" ${isSelected ? 'checked' : ''}> Use selected code from current file</label><br><br>
        <input type="text" id="question" placeholder="Enter your question" /><br>
        <label><strong>Select files to include:</strong></label>
        <ul>${fileTreeHTML}</ul>
        <button type="submit">Submit</button>
      </form>

      <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('chatgptForm').addEventListener('submit', event => {
          event.preventDefault();
          const question = document.getElementById('question').value;
          const useSelection = document.getElementById('useSelection').checked;
          const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'));
          const files = checkboxes.map(cb => cb.value);
          vscode.postMessage({ command: 'submit', content: { question, useSelection, files } });
        });
      </script>
    </body>
    </html>
  `;
}

function getWebviewContent(reply) {
  const parts = reply.split(/```([\w]*)\n([\s\S]*?)```/g);
  let html = '';

  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      const escapedText = parts[i]
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      html += `<p>${escapedText}</p>`;
    } else if (i % 3 === 1) {
      continue;
    } else if (i % 3 === 2) {
      const lang = parts[i - 1] || 'plaintext';
      const escapedCode = parts[i]
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      html += `<pre><code class="language-${lang}">${escapedCode}</code></pre>`;
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" rel="stylesheet" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
      <style>
        body { font-family: sans-serif; padding: 1em; }
        pre { background: #f5f5f5; padding: 1em; border-radius: 6px; overflow-x: auto; }
        code { font-family: monospace; font-size: 0.95em; }
        p { margin-bottom: 1em; }
      </style>
    </head>
    <body>
      <h2>ChatGPT Response</h2>
      ${html}
      <script>Prism.highlightAll();</script>
    </body>
    </html>
  `;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
