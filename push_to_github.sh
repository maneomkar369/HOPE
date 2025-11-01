#!/bin/bash

# HOPE NGO GitHub Push Script
echo "🚀 Pushing HOPE Project to GitHub..."
echo "===================================="
echo ""

cd /home/vishal/Desktop/HOPE

# Try to push
echo "Attempting to push to GitHub..."
echo "Repository: https://github.com/maneomkar369/HOPE"
echo ""

git push -u origin main

echo ""
echo "===================================="
echo "If push was successful, your project is now live at:"
echo "https://github.com/maneomkar369/HOPE"
echo ""
echo "If authentication failed, you need a Personal Access Token:"
echo "1. Go to: https://github.com/settings/tokens"
echo "2. Generate new token (classic)"
echo "3. Select 'repo' scope"
echo "4. Use token as password when prompted"
