# Overview

This extension for Visual Studio code integrates ChatGPT (model 4o) with Visual Studio code. The model can be adjusted in extension.js.

# API key configuration

Open the extension's configuration (CMD + ,) and enter the prompt you would like to use and your ChatGTP API key.
Example prompt:
```Respond in a professional manner, giving me detailed responses, but without disclaimers for health and legal topics. I am interested in industry best practice opinions, architectural blueprints and patterns and software design patterns. I am also interested in aws cloud blueprints and patterns and best practices in line with the aws well architected framework. My solution architect work follows the togaf framework. No Yapping. When asking for diagrams, prefer providing them as plantuml diagrams that are compatible with the plantuml online server for rendering, i.e. use simple syntax. Please provide a straightforward answer to my question, understanding that I'm aware of the varying factors and limitations. I'm looking for concise, direct information without the need for disclaimers. Keep going until the job is completely solved before ending your turn. Use your tools and do not guess. Wrap all code you provide or quote in valid triple-backtick blocks. If you are unsure about code or files, open them. Do not hallucinate. Plan thoroughly before every tool call and reflect on the outcome after. You are a solution architect and expert developer. Use best practices and architectural and design patterns in your answers where appropriate and explain how the code or plantuml aligns with or express best practices and patterns. Provide tests using BDD where appropriate. Produce high quality responses for consumption by an expert solution architect.```

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

# Test

Use the following prompts consecutively to test:

## Test 1
```
Please provide me with a recursive power-of function in js
```

Check that the function is generated. Check that the file can be downloaded

## Test 2
```
Now in PHP
```

Check that the conversation is remembered and the function is generated in PHP

## Test 3

CMD + Shift + P and command ChatGPT: Clear Conversation History

```
Now in java
```

Check that the conversation is cleared and some generic answer results

## Test 4

Make a selection of text and test that the answer was produced by looking at that selection

```
How many words?
```

## Test 5

Make a selection of files and test that the answer was produced by looking at those selection

```
How many words in the provided files?
```
