#!/bin/bash
source $HOME/.nvm/nvm.sh;

PACKAGE_NAME=$(xpath -q -e 'string(//widget/@id)' res/config.xml)

echo "you must execute this script in a checked out version of the boma-client-v2 project on macos (tested m1 11.5.2)"
echo "it must have the following files in the ./res folder"
echo "1.  splash.svg (use the template at http://corber.io/examples/safe-splash-template.svg)"
echo "2.  icon.svg (square format)"
echo "3.  google_services.json"
echo "4.  cordova config.xml"
echo "5.  android-splash.png"
echo ""
echo "and the following dependencies must be met"
echo "1. nvm, node 20.9.0, ember-cli@5.4.0 cordova"
echo "2. ruby 2.7.4, cocoapods"
echo "3. sdkman, Gradle 6.5"
echo "4. android studio, tools->sdkmanager->sdk tools->show package details checkbox tick->android sdk builds tools 32.0.0"
echo "4. android studio, tools->sdkmanager->sdk platforms->show package details checkbox tick->android api 33->android sdk platform 33"
echo "5. xcode developer tools"
echo ""
echo "building for package name... $PACKAGE_NAME"
read -p "Will replace assets in the cordova project with those in ./res folder! Continue?"

# move the platforms git repo to a temporary location
mv corber/cordova/platforms/.git res/.platforms-git-backup

#(re)initialising corber
echo "Removing corber and corber-live-reload from the package.json file"

sed -i ".bak" '32,${/corber/d;}' package.json

echo "Delete corber folder"
rm -rf corber

echo "Init corber"
corber init --platform none
npm i

# copy assets to correct places

cp res/config.xml corber/cordova/config.xml

cp res/icon.svg corber/icon.svg
cp res/splash.svg corber/splash.svg

cp res/google-services.json corber/google-services.json
cp res/google-services.json corber/cordova/google-services.json

cp res/ding.caf corber/cordova/ding.caf
cp res/ding.mp3 corber/cordova/ding.mp3

printf "\n"
echo "moved assets to correct places..."

#generate splash and icons
# corber make-splashes --platform ios
corber make-icons --platform android
corber make-icons --platform ios

# Create splash images for iOS

# Create the directory to store the splash images
mkdir corber/cordova/res/screen/
mkdir corber/cordova/res/screen/ios/
# Create splash screen pngs from splash.svg and compress them
# Create splash for iphones
qlmanage -t -s 1334 -o corber/cordova/res/screen/ios/. res/splash.svg
sips -s format jpeg -s formatOptions low corber/cordova/res/screen/ios/splash.svg.png --out "corber/cordova/res/screen/ios/Default@2x~iphone~anyany.jpg"
# Create universal splash screen
qlmanage -t -s 2732 -o corber/cordova/res/screen/ios/. res/splash.svg
sips -s format jpeg -s formatOptions low corber/cordova/res/screen/ios/splash.svg.png --out "corber/cordova/res/screen/ios/Default@2x~universal~anyany.jpg"

# The splash images for iOS are required in jpeg format, the quick look image function (part of the OSX image tools) used to generate the images only generates pngs,
# these and then converted and the unrequired .png are deleted so as not to bloat the bundle size.
rm corber/cordova/res/screen/ios/splash.svg.png

# mv corber/cordova/res/screen/ios/splash.svg.png corber/cordova/res/screen/ios/Default@2x~universal~anyany.png

# Splash page for Android devices is now an icon of specific dimensions.  See https://developer.android.com/develop/ui/views/launch/splash-screen#splash_screen_dimensions for full details
mkdir corber/cordova/res/screen/android/
cp res/android-splash.png corber/cordova/res/screen/android/android-splash.png

printf "\n"
echo "generated splashes..."

#install cordova plugins
# Locking to this specific version which includes fixes for this plugin to work on Android 31 which we need to target to be able to submit new builds to Google Play Store.
corber proxy plugin add git+https://github.com/havesource/cordova-plugin-push#321035440aede5bc6437e228e6067f654753fef3
corber proxy plugin add cordova-clipboard@1.3.0
corber proxy plugin add cordova-plugin-camera@7.0.0
corber proxy plugin add cordova-plugin-device@2.1.0
corber proxy plugin add cordova-plugin-file@8.0.1
corber proxy plugin add cordova-plugin-foreground-service@1.1.3
corber proxy plugin add cordova-plugin-geolocation@5.0.0
corber proxy plugin add cordova-plugin-media@7.0.0
corber proxy plugin add cordova-plugin-music-controls2@3.0.7
corber proxy plugin add cordova-plugin-safariviewcontroller@2.0.0
corber proxy plugin add cordova-plugin-splashscreen@6.0.2
corber proxy plugin add cordova-plugin-statusbar@4.0.0
# Forked and patched version of this plugin for use for Android 31 which we need to target to submit new builds to google play store.
corber proxy plugin add git+https://github.com/boma-digital/cordova-plugin-qrscanner.git#eebd09cb218fffe0f504ff89153e2ed84c42c466
# dependency for cordova-plugin-qrscanner as the plugin requires patching for androidx
corber proxy plugin add cordova-plugin-androidx-adapter@1.1.3
# Using our fork to lock commit as backup
corber proxy plugin add git+https://github.com/boma-digital/cordova-plugin-local-notification.git#141933b325d6f504756ccddb9408678f4c7e08e4
corber proxy plugin add cordova-plugin-inappbrowser@6.0.0
corber proxy plugin add cordova-plugin-wkwebview-file-xhr@3.1.0
corber proxy plugin add cordova-plugin-customurlscheme@5.0.2 --variable URL_SCHEME=${PACKAGE_NAME//[-._]/}

echo "installed cordova plugins"
printf "\n"

#install platforms
corber proxy platform add android@12
echo "installed android"
corber proxy platform add ios@7.1
echo "installed iOS"

#glue add google services to right place
cp res/google-services.json corber/cordova/platforms/android/app

#build cocoapods
cd corber/cordova/platforms/ios
pod install
cd ../../../..
echo "built cocoapods"

# DEPRECATED, seemingly no longer required
# echo "is this really needed?"
# corber proxy platform remove ios
# corber proxy platform add ios

# echo "uninstalled and re-installed ios..."
# DEPRECATED, seemingly no longer required

read -r -d '' STOP_BOUNCY <<EOC
@implementation UIScrollView (NoBounce)
- (void)didMoveToWindow {
[super didMoveToWindow];
self.bounces = NO;
}@end
EOC

echo $STOP_BOUNCY >> corber/cordova/platforms/ios/CordovaLib/Classes/Public/CDVViewController.m

echo "added stop overscroll code..."

# replace the platforms git repo from the temporary location
mv res/.platforms-git-backup corber/cordova/platforms/.git

# check the corber/cordova/platforms directory is under version control, if it is print the changes since last committing
# if it isn't initialise it and make the initial commit.
cd corber/cordova/platforms
printf "\n"
# If the platform directory is a git directory then this should return true
if test "$(pwd)" = "$(git rev-parse --show-toplevel)"; then
  echo "corber/cordova/platforms is under version control, here are the changes since the last time you ran this script";
  printf "\n"
  git status
else
	echo "corber/cordova/platforms is NOT under version control, this must be the first time you've run this script in this directory?";
	read -p "Go ahead and init a git repo in the corber/cordova/platforms directory now?"
	printf "\n"
	cd "$(pwd)"
	git init
	git add .
  git commit -m "Initial Commit"
  printf "\n"
  echo "corber/cordova/platforms is now under version control"
fi;

printf "\n"

echo "done, here are some useful commands..."

echo "corber build --platform=android"
echo "corber proxy run android --nobuild"
echo
echo "corber build --platform=ios --environment production"
echo "corber open ios"
