#!/bin/bash

# Function to measure the time taken to install a package
measure_install_time() {
  local package=$1
  local start_time=$(date +%s%N)
  
  # Install the package globally
  npm install -g $package > /dev/null 2>&1
  
  local end_time=$(date +%s%N)
  local duration=$(( (end_time - start_time) / 1000000 )) # Convert nanoseconds to milliseconds
  
  echo "Time taken to install $package: ${duration}ms"
}

# Package to test
PACKAGE="lodash@4.17.21"

# Install the package for the first time
echo "Installing $PACKAGE for the first time..."
measure_install_time $PACKAGE

# Install the package again to test the time taken for an already installed package
echo "Installing $PACKAGE again to test the time taken for an already installed package..."
measure_install_time $PACKAGE
