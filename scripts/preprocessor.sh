#!/bin/bash

# For the log
echo "$(date)"
echo "$NAME"
echo "v$VERSION"
echo ""

# Lint the dist files
echo "run lint"
npm run lint || exit 1

# Concat the dist files
echo "concat files"
npm run concat || exit 1

# Uglify the dist files
echo "uglify dist"
npm run uglify || exit 1