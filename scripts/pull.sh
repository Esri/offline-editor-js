#!/bin/bash

##########################################################
# ONLY use this script after using the push script.
# This script helps sync up your local git with master
# and origin.
#
# To use: npm run pull
##########################################################

# SET VARS
VERSION=$(node --eval "console.log(require('./package.json').version);")

# Sync up local master with origin/master
echo "checkout master"
git checkout master

echo "pull upstream master"
git pull upstream master

read -p "Press [Enter] to push origin master..."
git push origin master

# Delete the version branch
echo "delete the version branch"
git branch -D $VERSION

# Sync and merge gh-pages
echo "checkout gh-pages"
git checkout gh-pages

read -p "Press [Enter] to merge gh-pages with master..."
git merge master

echo "push origin gh-pages"
read -p "Press [Enter] to push gh-pages to origin..."
git push origin gh-pages

# publish release on NPM
read -p "Press [Enter] to npm publish..."
npm publish

echo "Now create a pull request for gh-pages manually on github."
echo "This gives you a final chance to review your changes."
echo "Once pull request has been merged, don't forget to run 'git pull upstream gh-pages' and 'git push origin gh-pages'"