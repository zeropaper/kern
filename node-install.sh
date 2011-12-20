#!/bin/sh

if [ "$2" ]
then
  # Update System
  echo 'System Update'
  sudo apt-get -y update
  echo 'Update completed'
  # Install help app
  sudo apt-get -y install libssl-dev git-core pkg-config build-essential curl gcc g++
fi


VERSION="v0.6.4"

if [ "$1" ]
then
  VERSION=$1
fi

# Download & Unpack Node.js
echo "Download Node.js - $VERSION"

if [ ! -d "/tmp/node-install" ]
then
  mkdir /tmp/node-install
fi

cd /tmp/node-install

if [ ! -f "node-$VERSION.tar.gz" ]
then
  wget http://nodejs.org/dist/node-$VERSION.tar.gz
  echo "Node.js $VERSION download completed"
fi

tar -v -zxf "node-$VERSION.tar.gz"
echo "Node.js $VERSION unpacked"

tree -L 2
# exit

# Install Node.js
echo 'Install Node.js'
cd node-$VERSION
./configure && make && sudo make install

sudo ln -s /usr/local/bin/node /usr/bin/node

echo 'Node.js install completed'
# Install Node Package Manager
echo 'Install Node Package Manager'
curl http://npmjs.org/install.sh | sudo sh
echo 'NPM install completed'
## Install Forever
#echo 'Install Forever'
#npm install forever -g


ls -ashl /usr/bin/no*

exit 0;


#sudo npm -g install nodemon
#sudo npm -g install jsdom jQuery
npm install jsdom jQuery sax
cd node_modules/
git clone git@github.com:zeropaper/node-fluent-ffmpeg.git
cd ..
mkdir content
mkdir cache
chmod 777 cache