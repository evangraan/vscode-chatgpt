mv .vscode/settings.json ../
vsce package --allow-missing-repository
mv ../settings.json .vscode/
code --install-extension path/to/your-extension.vsix

