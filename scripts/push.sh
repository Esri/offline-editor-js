#!/bin/bash

##########################################################
# This script provides final build automation for the repo.
# It's responsible for pushing the build. Once your
* branch has been merged by master then use the pull script
* to finalize syncing up your git and github repos.
#
# PRE-REQS:
# 1. Make sure you have node, npm and grunt installed
# 2. Before you can use this repo: npm init
#
#
# INSTRUCTIONS:
#
# 0. MAKE SURE you look thru the steps here and that everything is in order before you hit the button.
# 1. Make sure in package.json to name your releases after the version number, such as v2.0.0, v2.0.1, v2.1.1, etc.
# 2. To submit changes to your github branch: npm run push. You can still make changes on this branch if you need to.
# 3. After those changes have been merged on esri/master then sync up gh-pages: npm run pull
# 4. After those changes have been merged on esri/gh-pages: 'git pull upstream gh-pages' then 'git push origin gh-pages'
#
##########################################################

# SET VARS
VERSION=$(node --eval "console.log(require('./package.json').version);")
NAME=$(node --eval "console.log(require('./package.json').name);")

# Checkout temp branch for release
git checkout v$VERSION

# Add files, get ready to commit
git add CHANGELOG.md
git add dist

# Create the release zip file
zip -r $NAME-v$VERSION.zip dist

# Run gh-release to create the tag and push release to github
gh-release --assets $NAME-v$VERSION.zip

# Remove the temp zip file
rm $NAME-v$VERSION.zip

# Commit changes + commit message
git commit -m "$VERSION"

# Push to origin
git push origin v$VERSION

echo "zip file deleted"
echo "push script: done"

# publish release on NPM
echo "npm publish"
npm publish

echo "Go to your github branch $VERSION, review changes then create pull request to esri/master"
echo "Once the PR is accepted and merged then run the pull script"