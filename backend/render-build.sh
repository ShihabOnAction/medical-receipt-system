#!/usr/bin/env bash
# Exit on error
set -o errexit

npm install

# Ensure Puppeteer downloads Chrome binary on Render
npx puppeteer browsers install chrome
