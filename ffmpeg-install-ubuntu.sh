BUILDDIR=$1
mkdir -p $BUILDDIR

# INSTALL - 0
sudo apt-get remove ffmpeg x264 libx264-dev


# INSTALL - 1 - Install the Dependencies
sudo apt-get update
sudo apt-get install build-essential checkinstall git libfaac-dev libjack-jackd2-dev \
  libmp3lame-dev libopencore-amrnb-dev libopencore-amrwb-dev libsdl1.2-dev libtheora-dev \
  libva-dev libvdpau-dev libvorbis-dev libx11-dev libxfixes-dev texi2html yasm zlib1g-dev


# INSTALL - 2 - Install x264
cd
git clone git://git.videolan.org/x264
cd x264
./configure --enable-static
make
sudo checkinstall --pkgname=x264 --pkgversion="3:$(./version.sh | \
    awk -F'[" ]' '/POINT/{print $4"+git"$5}')" --backup=no --deldoc=yes \
    --fstrans=no --default
sudo apt-get remove libvpx-dev

# INSTALL - 3 - Install libvpx
cd
git clone http://git.chromium.org/webm/libvpx.git
cd libvpx
./configure
make
sudo checkinstall --pkgname=libvpx --pkgversion="1:$(date +%Y%m%d%H%M)-git" --backup=no \
    --deldoc=yes --fstrans=no --default


# INSTALL - 4 - Install FFmpeg
cd
git clone --depth 1 git://git.videolan.org/ffmpeg
cd ffmpeg
./configure --enable-gpl --enable-libfaac --enable-libmp3lame --enable-libopencore-amrnb \
    --enable-libopencore-amrwb --enable-libtheora --enable-libvorbis --enable-libx264 \
    --enable-nonfree --enable-postproc --enable-version3 --enable-x11grab --enable-libvpx
make
sudo checkinstall --pkgname=ffmpeg --pkgversion="5:$(date +%Y%m%d%H%M)-git" --backup=no \
  --deldoc=yes --fstrans=no --default
hash x264 ffmpeg ffplay ffprobe


# INSTALL - 5 - Install qt-faststart (optional)
cd ~/x264
make distclean
./configure --enable-static
make
sudo checkinstall --pkgname=x264 --pkgversion="3:$(./version.sh | \
    awk -F'[" ]' '/POINT/{print $4"+git"$5}')" --backup=no --deldoc=yes \
    --fstrans=no --default


exit


# updating
sudo apt-get remove ffmpeg x264 libx264-dev libvpx-dev
sudo apt-get update
sudo apt-get install build-essential git checkinstall yasm texi2html \
  libfaac-dev libjack-jackd2-dev libmp3lame-dev libopencore-amrnb-dev \
  libopencore-amrwb-dev libsdl1.2-dev libtheora-dev libva-dev libvdpau-dev \
  libvorbis-dev libx11-dev libxfixes-dev zlib1g-dev
cd ~/x264
make distclean
git pull

cd ~/libvpx
make clean
git pull

cd ~/ffmpeg
make distclean
git pull

exit

# remove changes made by this script
sudo apt-get autoremove x264 ffmpeg qt-faststart build-essential git checkinstall \
  yasm texi2html libfaac-dev libjack-jackd2-dev libmp3lame-dev libsdl1.2-dev libtheora-dev \
  libva-dev libvdpau-dev libvorbis-dev libvpx libx11-dev libxfixes-dev zlib1g-dev
