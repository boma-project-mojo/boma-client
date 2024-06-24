#!/bin/bash  
source $HOME/.nvm/nvm.sh;

# Use the correct version of node
nvm install v20.9.0
nvm use v20.9.0

# Build dependencies
npm i

# Install corber
npm install -g corber@1.4.3

# Install ember cli
npm install -g ember-cli@5.4

# Install Cordova 
npm install -g cordova@12