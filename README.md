# Overview

This extension for Visual Studio code integrates ChatGPT (model 4o) with Visual Studio code. The model can be adjusted in extension.js.

# API key configuration

Create ```.vscode/settings.json``` with content:

```
{
    "chatgpt.apiKey": "your-api-key"
}
```

# Development and installation

# Environment
This code base was built on MacOS.

```
brew install npm
npm init
npm install axios
npm install -g @vscode/vsce
```

## Building
In order to build the extension, run ```./build.sh``` in the root directory. This moves the ```.vscode/settings.json``` file to ```../```, then builds the package, then moves the ```settings.json``` back to the ```.vscode``` directory. This avoids adding the secret to the package, but enables VSIX installation to include the secret.

## Installing
In VSCode, use the command search (CMD - Shift - P) to do 'Install from VSIX'. Select the package ```.vsix``` produced by ```build.sh```. Then use the command search (CMD - Shift - P) to do 'Developer: Reload Window'.

## Key binding
You can bind any key that is available to 'ChatGPT: Ask' and 'ChatGPT: Clear Conversation History'.

# Conversation context
The extension replays previous conversation history until cleared, providing a seamless conversational experience.

The current file open in VSCode is used for context. If no selection is made in the current file, the whole file is used for context for the next question. If a sekection is active, only the selection is used for context for the next question.

# Code formatting
The extention uses Prism to do code formatting.
