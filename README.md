*This project contains the core software used to deploy Boma apps to the iOS and Android store.  It comprises an ember project wrapped with cordova.* 

[[_TOC_]]

# Setup Ember Web Browser Development Environment

## Build Dependencies

Run the following script to build the various dependencies required for the web browser development environment.  

`sh environment.sh && nvm use`

## Run ember project 

`> ember s`

# Configure and Build the Corber/Cordova Project

To setup the project for cordova you have to complete the following steps. 

1.  [Install the dependencies for iOS and Android builds on your local development environment](#install-dependencies-for-ios-and-android-builds)
2.  [Configure the app and add the assets required for a successful build](#add-all-config-and-relevant-assets)
3.  [Setup push notifications](#setup-push-notifications)
4.  [Build Dependencies](#build-dependencies)
5.  [Build the app and deploy to a a device.  ](#build-the-app-and-deploy-to-a-device)

## Install dependencies for iOS and Android Builds

### For iOS

iOS builds to submit to the stores are generated using xCode.  Follow these steps to install xCode and relevant command line tools and the Transporter app which is used for submitting builds.  

1.  Get the latest version of xCode from the mac OS app store
2.  Open the app and follow the prompts to install the command line tools
3.  Download the transporter app from the mac OS app store to deliver builds

### For Android

For Android builds use Android Studio to manage the SDKs installed on your computer.  Follow these steps to install all the required software.  

1.  Download and install Android Studio from https://developer.android.com/studio
2.  Open the app and from the home screen click the 'More Actions' link and select SDK manager from the dropdown
3.  Check the box for 'Show Package Details' (bottom right)
4.  In SDK platforms check 'SDK Platform 33' and 'Source for Android 33'
5.  In SDK tools check '33.0.1' from the 'Android SDK build tools' menu and 'SDK command line tools latest' (8.0 currently) from 'Android SDK Command line Tools'.  
6.  Include the path to android build tools in your PATH.  
7.  Install JDK 11.0.16.1 following the instructions here https://docs.oracle.com/en/java/javase/15/install/installation-jdk-macos.html#GUID-F575EB4A-70D3-4AB4-A20E-DBE95171AB5F
8.  Set JAVA_HOME in your path to the JDK location (similar to `/Library/Java/JavaVirtualMachines/jdk-11.0.16.1.jdk/Contents/Home`)
9.  You may have to reboot your computer :-)

## Add all config and relevant assets

To successfully build the app you mus set an app ID in the config.xml and include the following assets in `/res` folder.  

### Add app ID to cordova configuration

1.  Open res/config.xml
2.  Update `<widget id=''>` to reflect app ID for current project in the format com.{festival_name}.boma

### Create Icons and Splashes

The XD templates for designers include instructions on how to provide the assets at the right size.  

Export icon and splash as `.svg` and android-splash as `.png`.  

Place the exported files in the /res directory
1.  icon.svg
2.  splash.svg
3.  android-splash.png

Additionally export the splash image as a jpg and place it in `public/assets/images` directory.  This is for the 'client side' loading screen.  

`icon.svg` is used for the app icon for all platforms.  
`splash.svg` is used when the app is opening on iOS.   
`android-splash.png` is used for android only, it renders in the centre of the screen and a static background colour can be set in config.xml `AndroidWindowSplashScreenBackground`.  

Reference http://corber.io/pages/workflow/icon_splash_management.html for icon.svg and splash.svg sizes and https://developer.android.com/develop/ui/views/launch/splash-screen for android-splash.png.  

## Setup Push Notifications

### Android - Setup Firebase

1.  Login to firebase and add project for android using app ID defined above.  
2.  Download the google-services.json file and place it in the /res directory

### iOS - Generate p8 cert

1.  Create the p8 cert file
  - Go to the Apple Developer Member center, then go to the "Keys" menu and add a new key.
  - Give a name to your key, tick the "Apple Push Notifications Service" box and download the .p8 file.

NB:  You will have to create a new gorush server per p8 cert.  Instructions on how to achieve this can be found in the https://gitlab.com/boma-hq/gorush-with-basic-http-auth readme.  

## Build dependencies 

run `sh build.sh` to recreate the cordova project including adding relevant plugins and platforms.  

## Build the App and Deploy to a Device

Convenient build commands have been implemented using npm scripts.  

### All Platforms

To build for al platforms and deploy to all devices 
> npm run build:all

To build for all platoforms in production and deploy for all devices 
> npm run build:all:production

### For iOS

To build for iOS and open xCode
> npm run build:ios

To build and iOS and open xCode in production
> npm run build:ios:production

### For Android

To build for android and flash on to the attached phone
> npm run build:android

To build for android in production and flash on to the attached phone
> npm run build:android:production

# Styling the App

A comprehensive list of CSS variables have been defined to signifcantly reduce the amount of CSS required for to apply a festival's skin to the app.  

The list of CSS variables along with documentation can be found in `params-overlay.css`.  When in doubt use the web inspector to inspect the element, the appropriate variable is shown in the styling section of the inspect window.  

To style the apps:-

1.  Create a new CSS file for this app and save it in `app/styles/`
2.  Copy the CSS variables from `params-overlay.css` into the file.  
3.  Import the new CSS file in app.css using the `@import "path-to-css-file.css"` syntax
4.  Amend the CSS variables to reflect the styling of the app.  
5.  Add any additional CSS required to achieve the desired styling below the CSS variables.  

# Configuring the App

Configuration for the app currently spans:

* the ember configuration file found in `config/environments.js`
* The `Festival` and `Organisation` models in the postgres db (and syndicated to the app via couch/pouch db).  
* Attributes on the `events` and `articles` controllers in the ember project.  

## Config in environments.js

| Param                    |      Type     |  purpose    | example   |  
|--------------------------|-------------:|----------|----------|
| *emberPouch.localDb       | string        | the local pouchdb database name | kambe_events_1 |
| *emberPouch.remoteDb      | string        | the remote couchdb database name | kambe_events_1 |
| multiFestivalApp         | bool          | enables multi festival mode | true |
| clashfinderEnabled       | bool          | enables the clashfinder view | true |
| fallbackImageFileName    | string        | fallback image when img cache fails and network isn't available | "splash.jpg" |
| organisationId           | int           | the id of the organisation  | 1 |
| festivalId               | int           | the id of the festival (default festival if multi festival app mode is enabled) | 1 |
| articleAudioTagId        | int           | the tag id for the article tag 'audio' (legacy) | 254 |
| bundleVersion            | int           | the version of the image and data bundle included in this release | 1 |
| communityArticlesEnabled | bool          | enables/disables community articles | true |
| communityEventsEnabled   | bool          | enables/disables community events | true |
| festivalHome             | object        | the route the app opens up to inside festival time* | `{routeName: 'events', params: {}}` |
| communityHome            | object        | the route the app opens up to outside festival time* | `{routeName: 'articles', params: {}}` |
| eventFilterTagType       | string        | use event tags or production tags for filters | 'event' or 'production' |
| subtleWallet             | bool          | show wallet in left sidebar menu or not | true |
| enableLessWordyCopy      | bool          | allow users to opt to see short descriptions for productions | true |
| subtleWallet             | bool          | This removes the link to the wallet from the left sidebar and puts a reference to it in the Settings page instead | true |
| mapConfig                | object        | see [Configuring the Map](#configuring-the-map) |  |
 
\* You can find these by checking in the `/_utils` of the couchdb in question or using the following command in the rails console `Festival.find(FESTIVAL_ID).couchdb_name`

## Config on the Organisation model

| Param                    |      Type     |  purpose                          | example   |  
|--------------------------|:-------------:|----------------------------------|----------|
| app_bundle_id            | string        | used for the app update nag links | "com.boom.boma" |
| current_app_version      | string        | used for the app update nag links | "40.0.1" |
| apple_app_id             | string        | used for the app update nag links | "1255976495" |

## Config on the Festival model

| Param                    |      Type     |  purpose                    | example   |  
|------------------------------------|:-------------:|----------------------------|----------|
| enable_festival_mode_at            | datetime      | enable festival mode at | Mon, 01 Aug 2022 11:00:00.992000000 UTC +00:00, |
| disable_festival_mode_at           | datetime      | disable festival mode at | Thu, 01 Sep 2022 11:00:00.019000000 UTC +00:00 |
| clashfinder_start_hour             | int           | the time the day starts on the clashfinder view | 5 |
| schedule_modal_type                | string        | whether to show the event or production modals when clicking on an event | 'event\|production' |
| use_production_name_for_event_name | boolean       | choose to use either the production name or set an individual event name | true |
| data_structure_version             | string        | v1 or v2 or data structure (v1 one couchdb per Festival, v2 one couchdb per Organisation) (legacy) | 'v1\|v2' |
| short_time_format                  | string        | the format used when printing the short time format, use https://apidock.com/ruby/DateTime/strftime for reference | "%a %H:%M" |
| require_production_images          | boolean       | validate for prescense of images when creating/editing productions | true |
| require_venue_images               | boolean       | validate for prescense of images when creating/editing venues | true |

## Configuring Events

### List and modal

The following configurations are available for the events lists

| Param                    |      Type     |  purpose                    | example   |  
|--------------------------|:-------------|----------------------------|----------|
| displayFormat            | string        | whether to display the events in a list or grid | "list|grid" |
| modalType                | string        | type of modal to open when clicking on an event | "productionModal|eventModal" |
| hideImage                | bool          | whether the image should be hidden on the modal view | true |
| venueNameAsThumbnail     | bool          | whether the venue name should be included instead of the image thumbnail | true |
| linkOnly                 | bool          | open a link in inappbrowser instead of opening modal | true |

### Query Params

Configuration of what is rendered in the events templates is done through query parameters.  

The following query parameters are available. 

 * `selectedTags` (an array of tag ids to include, NB:  these tags removed when filters are reset, to retain them use persistentSelectedTags)
 * `selectedExcludedTags` (an array of tag ids to exclude)
 * `preferences` (boolean, if true show preferred events)
 * `selectedVenues` (an array of venue ids to include)
 * `selectedDays` (an array of days to include)
 * `persistentSelectedTags` (an array of tag ids to include, these are not removed when filters are reset)

Any one or combination of these query params can be used to refine the list of events.  

You can also provide the following query_params to customise the template

 * `viewType` (set to clashfinder to show clashfinder view)
 * `pageName` (the name to be shown in the header at the top of the articles template)

## Configuring Articles

Configuration of what is rendered in the articles templates is done through query parameters.  

The following query parameters are available. 

 * `articleType` (matches the article_type attribute on the Article model)
 * `selectedTags` (an array of tag ids to include)
 * `selectedExcludedTags` (an array of tag ids to exclude)
 * `selectedCreator` (boolean, if true show articles created by current wallet address)
 * `preferences` (boolean, if true show preferred articles)

Any one or combination of these query params can be used to refine the list of articles.  

You can also provide the following query_params to customise the template

 * `pageName` (the name to be shown in the header at the top of the articles template)
 * `tagType` (refines the list of tags showed in the filters, matches the tag_type attribute on the Tag model)

### Show articles by article_type

There is an attribute on the article_type model passing this as a query_param in an ember route will return a list of articles by that article_type.  

```

<a {{action "goToRoute" 'articles' 
  (query-params 
    articleType='boma_news_article' 
  )
}}>News</a>

Would return all articles with article_type with boma_news_article.

```

### Show articles that include tag(s)

Passing an array of tag ids as query parameters returns a list of articles that are tagged with one or both of those tags

```
<a {{action "goToRoute" 'articles' 
  (query-params 
    articleType='boma_news_article' 
    selectedTags=[1] 
    selectedExcludedTags='' 
    pageName='Tag 1' 
  )
}}>News</a>
```

\*Tag ids are currently set in the config/enviroment.js file and converted to the appropriate format in app/components/app-left-sidebar.js 
 
### Show articles that DON'T include tag(s) 

```
<a {{action "goToRoute" 'articles' 
  (query-params 
    articleType='boma_news_article' 
    selectedTags=''
    selectedExcludedTags=[1] 
    pageName='Not Tag 1' 
    tagType='news_tag'
  )
}}>News</a>
```

\*Tag ids are currently set in the config/enviroment.js file and converted to the appropriate format in app/components/app-left-sidebar.js 

## Including Tags by tag_type in Right Hand Sidebar Filter

Populate the tagType query_params with the matching tag_type to include a list of these tags in the right hand sidebar filters list.   

```
<a {{action "goToRoute" 'articles' 
  (query-params 
    articleType='boma_news_article' 
    selectedTags=''
    selectedExcludedTags=[1] 
    pageName='Not Tag 1' 
    tagType='news_tag'
  )
}}>News</a>
```
## Configuring Forms

### Controller Elements

NB this needs improvment, for now, the controller needs to include the following elements

The controller needs

1. registerFormElement, next, prev and goTo actions (all linking to actions in the form.js service)
2. resetForm (to reset all form elements to their original state)
3. Validations (A list of validations for form elements)
4. formPanes array listing all ids in form (list of ids for form-panes)
5. currentPaneIndex: alias('formService.currentPaneIndex') 
6. formService: service('form')
7. apiEndpoint: ENV['apiEndpoint']
8. loading: false,

### Form Navigation and Breadcrumb

Form navigation and breadcrumb is handled by a set of components which can be configured to have as many steps are neccesary.  

To configure a form create a wrapping `{{form-wrap}}` component and nest `{{form-pane}}` components inside it including the following attributes:

* `id` *required* - (a unique id for this form-pane)
* `registerFormElement` *required* - (an action which triggers the `registerFormElement` method on the form service)
* `formPanes` *required* - (the array of all the form pane ids)
* `currentPaneIndex` *required* - (the index of the currentPane, handled by the form service)

* `next` *optional* - (the action to complete when a user clicks next, leave blank to exclude a next action)
• `nextButtonText` *optional* - (the text of the next button)
* `loading` *optional* -
* `prev` *optional* - (the action to complete when a user clicks prev, leave blank to exclude a prev action)

Example...

```
{{#form-pane
  id="image"
  registerFormElement=(action "registerFormElement")
  next=(action imageNextAction)
  nextButtonText=imageNextButtonText
  prev=(action "prev")
  formPanes=formPanes
  currentPaneIndex=currentPaneIndex
}}
```

### Validation

Form validations are handled with custom next and previous actions and use the ember-cp-validations library.  

## Configuring the Map

1.  Convert the map image supplied by the client into four equal slices, export as jpg for web
2.  Place the images in the public/assets/images/ folder of the project 
Note the filenames, they should end with a number as shown below e.g `map_01.jpg`

|   |   |
|---|---|
| 1 | 2 |
| 3 | 4 |

3.  Set the following config in config/environment.js 
- `imageFilenameBase` should be the part of the map filename before the numbers.  E.g map_0
- `imageFilenameExt` should be the file extension.  E.g jpg
- `xtop` should be the latitude of the top of the image
- `xright` should be the longitude of the right of the image
- `xbottom` should be the latitude of the bottom of the image
- `xleft` should be the longitude of the left of the image
4.  Test the map config is correct following the instructions in [here](#testing-gps-maps)


# Production deployment

## Preparing the data

### Create the image bundle and update the couchdb records
1.  Update your local postgres database following the instructions https://gitlab.com/boma-hq/boma-api#install-heroku-cli-and-get-and-restore-the-latest-production-database
2.  Run the following rake command using your local copy of the boma-api project to download the bundle of images.  Once complete the images will be stored in `/images/{festival_id}` of the api project location.  
`> bundle exec rake bundle:images\[festival_id\]`
3.  Wait for the couchdb cache to be renewed (or manually dump the cache).  
4.  Run the following rake command using the heroku cli.  This will set the `bundled_at` attribute on the relevant couchdb record.  This is used by the client when deciding whether to use the bundled image or to cache a new one from the CDN.  
`> heroku run rake bundle:touch\[festival_id\] -a boma-production`

### Export the pouchdb dumps

You will need pouchdb dumps for the `Festival` records (festival.json), for the festival schedule (`Production`, `Event`, `Venue` and `Tag`) (dump.json) and if token functionality is in use by this festival for `TokenTypes` (tokens.json).  

1.  Using the pouch-dump project (https://gitlab.com/boma-hq/pouch-dump) make the dumps
 - festival data -> `node pouch-dump.js --db {URL_TO_POUCHDB_DATABASE} --view {FESTIVAL_DESIGN_DOC_NAME}/this_festival --filename festival.json`
 - festival schedule -> `node pouch-dump.js --db {URL_TO_POUCHDB_DATABASE} --view {FESTIVAL_DESIGN_DOC_NAME}/festival_dump --filename dump.json`
 - token_types -> `node pouch-dump.js --db {URL_TO_POUCHDB_DATABASE} --view {FESTIVAL_DESIGN_DOC_NAME}/all_tokentypes --filename tokens.json`
2.  Place the dumps in the /public/assets/ directory of the client project for this festival.

Use the couchdb interface at `/_utils` to determine the value of `FESTIVAL_DESIGN_DOC_NAME`.  

## Testing

Test the app using this script on both iOS and Android

https://docs.google.com/spreadsheets/d/1Ssd6d3a17k8zKBYz1e9MHOY-w6hW_UR-i8CHW2McOkU/edit#gid=0

### Testing GPS Maps

#### Testing the map alignment using open street map tiles

Test the map alignment is correct using open street map tiles and a geograhpical feature (e.g a lake) set the ‘testOverlayWithVectorTilesEnabled‘ variable im app-maplbre.js to true.  You should see an opaque version of your designed map overlaid on top of the open street map tiles for the same location.  

#### Testing the map alignment using a device's location services

To test overlaid GPS Maps on iOS devices.   

1.  Create a .gpx file in the following format.  

```
<gpx>
  <wpt lat="39.97312319514796" lon="-7.186479420799401"></wpt>
</gpx>
```

Add one <wpt/> node for each point, adding multiple points will simulate movement.  

2.  Flash the build you want to test onto a iOS device
3.  Click the 'simulate location' icon in the toolbar above the logs in XCode and upload the .gpx file.  
4.  Click the 'simulate locaiton' icon again and select the location.  You should now be able to use the phones location services to verify that the lat/long coordinates you've provided in the gpx file are correct.  

NB:  There is currently no known method of mocking the GPS location on Android devices.  

### Testing time 

The app behaves differently during the period whilst the festival is taking place.  

To test this functionality set the Date, Time and Timezone appropriatly on the device you are using the test.  

### Testing local notifications

To test local notifications set the `fakeTime` attribute in the preference-toggle.js service.  This creates notifications that are fired two minutes after clicking on the heart to add the event to a schedule.  

### Testing Push Notifications

Refer to https://gitlab.com/boma-hq/boma-api#testing-push-notifications when testing push notifications.   

### Testing upgrade path from production version

It is not possible to flash a new release built locally to a device running a build downloaded from the app stores.  

To make it possible to test the upgrade path the simplest way is to:-

#### For iOS

1.  Install the production release from the app store. 
2.  Use the TestFlight app to install the upgrade.  

#### For Android

1.  If your Google account is already enrolled on the internal beta testing programme use the link provided in the Google Play developer console to 'Leave the Programme'
2.  Uninstall the app on your device and clear the Google Play app cache.  
3.  Install the production release from Google Play app on your device.  
4.  Use the link provided in Google Play developer console to enroll onto the internal beta testing programme.  
3.  Use the Google Play app to install the upgrade.  

NB:  It is also possible to test this by maintaining a local build of the production version of the app, flashing this to both devices and then flashing the updated release over it.  

### Testing Unpublished Festivals on Multi Festival Apps

To allow beta testing of unpublished festivals the app has the functionality to show festivals that have a `aasm_state` of `preview` to users who have any token that has the word 'testers' in the name.  

Use the rails console to set the `aasm_state` to `preview` for the festival you want users to test.  

## Deploying to the App Stores

### Creating Store Profiles.  

#### Create iOS App Store Profile.

3.  Login to https://appstoreconnect.apple.com and create a new app.  
```
  a) Set platform at iOS
  b) Add a name
  c) Set primary language to UK English
  d) Use the bundle id you've just setup
  e) Set SKU to be a unique value for this app (e.g gb-2023-1)
  f) Click create.  
```
5.  Populate marketing details
6.  Select 'Manually Release this Version'.  

#### Create Google Play Store profile

1.  Create a Google Play Developer Account and Login at https://play.google.com/console/u/0/developers/?pli=1
3.  Click 'Create' in the top right hand corner to create a new app.  
4.  Follow the steps shown to create an app profile.  

### Increment the build number

Increment the version number in both

1.  corber/cordova/config.xml and
2.  package.json

### Create Screenshots and Upload

#### For iOS

1.  Open up the app using the iPhone 14 Plus emulator to get 6.7" screenshots and the iPhone 8 Plus emulator to get 5.5" screenshots
2.  Use the Apple shortcut ⌘ + S to save the screenshots to your desktop

#### For Android

1.  Create screenshots that are 16:9 (I've found it simplest to do this using the screenshots created for iOS above and cropping them manually in Photoshop.)

### For iOS

1. `npm run build:ios:production`
2. Use XCode to create and archive (Product->Archive) and export the package (ipa file) 
![Packaging iOS Releases](docs/videos/packaging-ios.mp4)
3. Upload using the transporter app (https://apps.apple.com/us/app/transporter/id1450874784?mt=12)
4. Wait for the build to process
5. Create the release on appstore connect and submit for review
6. Tag the release and push to the remote repo 
```
> git tag -a {ORGANISATION_NAME}-{APP_VERSION} -m "{ORGANISATION_NAME}-{APP_VERSION}" 
> git push origin {ORGANISATION_NAME}-{APP_VERSION}
```
7. [Now commit and tag the changes in the cordova platforms sub repo](#cordova-platforms-sub-repo)

### For Android

#### When creating a new android app

Google Play requires that new apps are uploaded using the .aab bundle format.  The apps aren't required to be zipaligned just signed with jarsigner.  

1.  Generate a keystore

```
Run the following command replacing KEYSTORE_NAME with the name of the file (e.g greenbelt2024.keystore) and ALIAS_NAME with an alias which refers to this app (e.g greenbelt2024).  

You will be asked the following questions.  
 - What is your first and last name?
 - What is the name of your organizational unit?
 - What is the name of your organization?
 - What is the name of your City or Locality?
 - What is the name of your State or Province?
 - What is the two-letter country code for this unit? (Ususally UK)

*** Carefully store the file, your KEYSTORE_NAME and ALIAS_NAME and the associated passwords as without them an update to the app cannot be deployed.  ****

> keytool -genkey -v -keystore KEYSTORE_NAME -alias ALIAS_NAME -keyalg RSA -keysize 2048 -validity 10000
```

Useful Resource -> https://stackoverflow.com/questions/33026847/how-is-one-supposed-to-answer-java-keystore-questions-that-keytool-asks

2. Build the package 
```
Run the following command to create a package.

> npm run build:android:production:release:aab

The command create a file called app-release.aab at `/corber/cordova/platforms/android/app/build/outputs/bundle/release/app-release.aab`. 
```

3. Sign the aab.  

```
Run the following command to sign the package with jarsigner 

> jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore {PATH_TO_KEYSTORE} -signedjar {APK_NAME}.aab {PATH_TO_APK} {KEYSTORE_ALIAS}

Replace PATH_TO_KEYSTORE with the absolute path to the keystore file on your computer
Replace APK_NANE with the filename you'd like the signed apk to have
Replace PATH_TO_APK with the path to the `app-release.aab` file as detailed above
Replace KEYSTORE_ALIAS with the alias you set when creating the keystore file.  
```

4. Upload to google play store, create the release and submit for review.  

#### When updating legacy android apps (which still use the old signing system)

1. `npm run build:android:production:release:apk`
2. zipalign with `~/Library/Android/sdk/build-tools/31.0.0/zipalign -v 4 {PATH_TO_app-release-unsigned.apk} {APK_NAME}.apk`
3. sign the apk with `~/Library/Android/sdk/build-tools/31.0.0/apksigner sign --ks {PATH_TO_KEYSTORE} --ks-pass pass:{KEYSTORE_PASS} --v1-signing-enabled true --v2-signing-enabled true {PATH_TO_APK}`
4. Upload to google play store, create the release and submit for review.  
5. Tag the release and push to the remote repo 
```
> git tag -a {ORGANISATION_NAME}-{APP_VERSION} -m "{ORGANISATION_NAME}-{APP_VERSION}" 
> git push origin {ORGANISATION_NAME}-{APP_VERSION}
```
6. [Now commit and tag the changes in the cordova platforms sub repo](#cordova-platforms-sub-repo)

## Cordova Platforms Sub Repo

To allow developers to watch changes to the cordova project between releases there is a sub repo for files located in the `corber/cordova/platforms`directory.  

The git repo is initialised when [building-dependencies](#build-dependencies).  

When completing the deployment of a new release it's important to check the changes, commit them and tag them with the release version.  This allows a developer to review the diff to ensure confidence in the release that is being deployed.  

1. Commit the changes in the cordova platforms sub repo 
```
> cd corber/cordova/platforms
> git add .
> git commit -m "{MEANINGFUL COMMIT MESSAGE}"
> git push origin {BRANCH_NAME}
```
2. Tag the changes in the cordova platorms sub repo and push to the remote repo 
```
> git tag -a {ORGANISATION_NAME}-{APP_VERSION} -m "{ORGANISATION_NAME}-{APP_VERSION}"
> git push origin {ORGANISATION_NAME}-{APP_VERSION}
```

# App Manifest

A manifest of all apps can be found at [here](APP-MANIFEST.md)

# Maintaining this project

## Node Update

Make sure node is up to date with at least the LTS (long term support) release.  

LTS -> https://github.com/nodejs/Release
Stable -> https://github.com/nodejs/Release

To update node:

1.  Open `./environment.sh`
2.  Amend the version of node in both the `nvm use` and `nvm install` commands and save.  
3.  Run `sh environment.sh` to install the latest version of node and build the dependencies.  

## Ember Update

Ember has a very fast release cycle, it's best practise to keep this project up to date with at least the LTS (Long term support) release of ember-cli but ideally the current stable release.  

LTS -> https://emberjs.com/releases/lts/
Stable -> https://emberjs.com/releases/release/

There is an ember tool to update the project, including any changes to config / core files any changes in syntax 

To run an update:

1.  Clear all deprecation warning both in the browser console and in the ember server output
2.  Commit all changes (`ember-cli-update` only works if your git stage is completely empty)
3.  Run `ember-cli-update --to version-number` to upgrade to a specific release.  Upgrade by moving up the minor versions (or at least by working through LTS).
4.  Update all other dependencies.  Find them using `npm outdated` and update one by one user `npm update PACKAGE_NAME`.  
5.  Check all `boma-digital` mirrored packages are as up to date as possible with the master branches of the repo the mirror was forked from (search the package.json for dependencies with `github:` or `git+`).  
6.  Judiciously test the release following the steps outlined in [Testing](#testing)
7.  Update the `ember-cli` global dependency in `./environment.sh`

## Cordova Update

### Cordova CLI

New releases of cordova-cli are announced at https://github.com/apache/cordova-cli/blob/master/RELEASENOTES.md

To upgrade:

1.  Update the cordova-cli version to the desired release in environemnt.sh 
2.  Run `sh environment.sh` from the root for each project you want to upgrade

### Platforms

New releases of cordova-android are documented at https://github.com/apache/cordova-android/blob/master/RELEASENOTES.md
New releases of cordova-ios are documented at https://github.com/apache/cordova-ios

To upgrade:

1.  Update the cordova-android or cordova-ios version in the commands to add the platforms in build.sh 
```
> corber proxy platform add android@12
> corber proxy platform add ios@12
```
2.  Run `sh build.sh` from the root for each project you want to upgrade

### Plugins

Check each of the individual github repos to check for new releases of the plugins used for this project.  

Where plugins are being installed from a internal fork (on boma-digital github) check the changes against the parent repository since the fork and make any appropriate actions.  

To upgrade:

1.  Update the plugin version in the commands to add the plugins in build.sh 
```
e.g:
> corber proxy plugin add cordova-plugin-statusbar@4.0.0
```
2.  Run `sh build.sh` from the root for each project you want to upgrade

!IMPORTANT  Update one plugin at a time and test the project builds (for both platforms) and that there aren't any regression bugs.  Not doing this makes debugging issues very challenging.  