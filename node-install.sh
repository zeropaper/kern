#!/bin/sh
##############################################################
#
# Author: Ruslan Khissamov, email: rrkhissamov@gmail.com
#
##############################################################
# Update System
echo 'System Update'
apt-get -y update
echo 'Update completed'
# Install help app
apt-get -y install libssl-dev git-core pkg-config build-essential curl gcc g++
# Download & Unpack Node.js - v. 0.4.12
echo 'Download Node.js - v. 0.4.12'
mkdir /tmp/node-install
cd /tmp/node-install
wget http://nodejs.org/dist/node-v0.4.12.tar.gz
tar -zxf node-v0.4.12.tar.gz
echo 'Node.js download & unpack completed'
# Install Node.js
echo 'Install Node.js'
cd node-v0.4.12
./configure && make && make install
echo 'Node.js install completed'
# Install Node Package Manager
echo 'Install Node Package Manager'
curl http://npmjs.org/install.sh | sudo sh
echo 'NPM install completed'
# Install Forever
echo 'Install Forever'
npm install forever -g
