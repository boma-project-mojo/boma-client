import { Promise, all } from 'rsvp';
import Service, { inject as service } from '@ember/service';
import config from '../config/environment';
import PouchDB from 'pouchdb-core';
import { later } from '@ember/runloop';
import { getOwner } from '@ember/application';

export default Service.extend({
  store: service(),
  router: service(),
  token: service(),
  preferenceToggle: service('preference-toggle'),
  flashService: service('flash'),
  tokenService: service('token'),
  activity: service('activity'),

  localDb: null,
  remoteDb: null,
  articlesLocalPouchdb: null,
  articlesRemotePouchdb: null,
  sync: null,
  hasLoadedDump: false,
  bundleIsUpdating: false,
  currentFestivalID: null,
  currentFestivalDbName: null,
  initialisationComplete: false,

  /* * * * * * * * * * * * * * * * * * *
   * COUCHDB/POUCHDB DATA STRUCTURE    *
   * * * * * * * * * * * * * * * * * * */

  /* 
   * Couchdb is configured to have one database per Organisation.  This approach
   * allows: 
   *  1. data to span multiple 'festivals' (e.g News Articles) without duplication of 
   *     couchdb records.
   *  2. the app to be configured to show all 'festivals' for an organisation.     
   * 
   * Data is segmented into multiple PouchDb database, one for data scoped at the 'Organisation'
   * level (Articles, Community Events, People's Gallery etc) and one per Festival for
   * all data for that festival.  
   * 
   * This methodology was chosen because when benchmarking the time required to load model routes 
   * with all data in one pouchdb was too much and degraded the UX.  
   * 
   */

  /* * * * * * * * * * * * * * * * * * *
   *           LOADING DATA            *
   * * * * * * * * * * * * * * * * * * */

  /* 
   * Data loading is ordered based on the priority we expect users to need to access it.  
   * This differs depending on the 'mode' the app is configured for.  
   * 
   *  - in 'community' mode the app is optimised to load data related to news, community
   *    events and community notices (People's Gallery) first
   *  - in 'festival' mode the app is optimised to load the festival schedule data first.  
   * 
   * The app can also be used to navigate show the data for festivals.  
   */

  /* 
   * initialise()
   *
   * Called from the application controller to initialise pouchdb
   */
  async initialise() {
    // Set currentFestivalDbName used in application.hbs to set a class for styling multiple festivals
    this.set('currentFestivalDbName', localStorage.getItem('currentDb')); 

    // Store the currently selected festival id in memory on this service, it is required by the 
    // Clashfinder and for Activity reporting
    let currentFestivalID = localStorage.getItem('currentFestivalID');
    this.set('currentFestivalID', currentFestivalID); 

    // Load the festival Docs
    let festival = await this.loadFestivalDocs();

    // Start loading data.  
    if (config.multiFestivalApp === true) {
      if (config.logLevel === 'DEBUG') {
        console.log(
          `%c MULTI FESTIVAL APP MODE ENABLED `,
          'background-color: black; color: white;',
        );
      }
      await this.loadMultiFestival();
    } else {
      let festivalMode = this.calculateFestivalMode(festival);
      if (festivalMode === 'festival') {
        if (config.logLevel === 'DEBUG') {
          console.log(
            `%c FESTIVAL APP MODE ENABLED `,
            'background-color: black; color: white;',
          );
        }
        await this.loadFestivalData(festival);
      } else if (festivalMode === 'community') {
        if (config.logLevel === 'DEBUG') {
          console.log(
            `%c COMMUNITY APP MODE ENABLED `,
            'background-color: black; color: white;',
          );
        }
        await this.loadCommunityData(festival);
      }
    }

    // Attempt to load token types from a bundle and then replicate.  
    try {
      await this.loadDump('tokens.json', 'by_model_name_erlang/all_tokentypes');
      this.loadView('by_model_name_erlang/all_tokentypes', null);
    } catch (err) {
      if (config.logLevel === 'DEBUG') {
        console.log('tt error', err);
      }
    }

    // Initialise public tokens
    this.tokenService.initialisePublicTokens();
  },

  /* 
   * calculateFestivalMode()
   *
   * festival     Ember Data Object   The festival you need to calculate the mode of
   *
   * Calculate whether the app is in festival mode or community mode.  
   * This affects what data is loaded or preloaded and the routes that users are shown first.   
   */
  calculateFestivalMode(festival) {
    let now = moment();
    
    // If there is a festival and the festival has dates set when the app should be in 'festival' mode
      // If the current time is after the enable_at time and before the disabled_at 
        // return 'festival'
      // else
        // return 'community'
    // else
      // default to 'community'
    if (
      festival &&
      festival.enable_festival_mode_at &&
      festival.disable_festival_mode_at
    ) {
      if (
        now.diff(moment(festival.enable_festival_mode_at), 'minutes') > 0 &&
        now.diff(moment(festival.disable_festival_mode_at), 'minutes') < 0
      ) {
        return 'festival';
      } else {
        return 'community';
      }
    } else {
      return 'community';
    }
  },

  /* 
   * loadFestivalDocs() 
   * 
   * Load the docs related to a festival from couchdb and if a 'festivalId' is set 
   * in config/environment.js find and return the ember data record for that festival.  
   */
  async loadFestivalDocs() {
    // if multi festival
      // Load all the festival docs from couchdb
    // else
      // try and load a festival.json config file then load all the festival docs from couchdb
    if (config.multiFestivalApp === true) {
      await this.loadView('by_model_name_erlang/all_festivals', null);
    } else {
      // Load the festival from the dump
      try {
        await this.loadDump('festival.json', 'by_model_name_erlang/all_festivals');
      } catch (err) {
        if (config.logLevel === 'DEBUG') {
          console.log(err);
        }
      }
      // Get all festivals
      try {
        await this.loadView('by_model_name_erlang/all_festivals', null);
      } catch (err) {
        if (config.logLevel === 'DEBUG') {
          console.log(err);
        }
      }
    }

    // If there is a default festival set in the config then get the festival doc from ember data and return it
    if (config.festivalId) {
      if (config.logLevel === 'DEBUG') {
        console.log(`
          this.store.findRecord('festival', config.festivalId); returns a long running Promise if the record is not found. 

          If the festival record set in config.festivalId isn't available in the 
          pouchdb and couchdb database or in the festival dump the app will stall here.  
        `);
      }

      // findRecord returns a long running Promise if the record is not found. 
      // It only rejects the promise if a deletion of the record is found. 
      // Otherwise this promise will wait for eternity to resolve. 
      // 
      // If the festival record set in config.festivalId isn't available in the 
      // couchdb or in the festival dump the app will stall here.  
      let festival = await this.store.findRecord('festival', config.festivalId);

      return festival;
    }
  },

  /* 
   * loadFestivalData()
   *
   * festival     Ember Data Object   The festival you want to load
   * 
   * Load data when the app is in 'festival' mode.  
   */
  async loadFestivalData(festival) {
    // Change the currently selected festival.  
    await this.changeFestival(festival, true, false);
    // Load the festival docs from Bundle
    try {
      await this.loadDump('dump.json', `${localStorage.getItem(
        'currentDb',
      )}_by_model_name_erlang/festival_dump`, festival);
    } catch (err) {
      if (config.logLevel === 'DEBUG') {
        console.log(err);
      }
    }
    // Trigger initialisationComplete actions
    this.set('initialisationComplete', true);
    // Transition will now be triggered, the dataset update action will be triggered by the
    // loading of the events route.
    // In the background...
    // Preload for all article types (one couchdb request for multiple article_types is far more performant)
    try {
      await this.loadView(
        'by_model_name_erlang/preload_all_boma_articles',
        null,
        false,
      );
    } catch (err) {
      if (config.logLevel === 'DEBUG') {
        console.log(err);
      }
    }
    // Preload Community Articles
    try {
      if (config.communityArticlesEnabled) {
        await this.loadView(
          'by_model_name_erlang/preload_community_articles',
          null,
        );
      }
    } catch (err) {
      if (config.logLevel === 'DEBUG') {
        console.log(err);
      }
    }
  },

  /* 
   * loadCommunityData()
   *
   * festival     Ember Data Object   The festival you want to load
   * 
   * Load data when the app is in 'community' mode.  
   */
  async loadCommunityData(festival) {
    // Preload the data for all enabled sections of the app
    // Preload for all article types (one couchdb request for multiple article_types is far more performant)
    try {
      await this.loadView(
        'by_model_name_erlang/preload_all_boma_articles',
        null,
        false,
      );
    } catch (err) {
      if (config.logLevel === 'DEBUG') {
        console.log(err);
      }
    }
    // Trigger initialisationComplete actions
    this.set('initialisationComplete', true);
    // Transition will now be triggered, the dataset update action will be triggered by the
    // loading of the events route.
    // Preload Community Articles
    try {
      if (config.communityArticlesEnabled) {
        await this.loadView(
          'by_model_name_erlang/preload_community_articles',
          null,
        );
      }
    } catch (err) {
      if (config.logLevel === 'DEBUG') {
        console.log(err);
      }
    }
    // Preload Community Events
    try {
      if (config.communityEventsEnabled) {
        await this.loadView(
          'by_model_name_erlang/community_events_by_start_date',
          null,
        );
      }
    } catch (err) {
      if (config.logLevel === 'DEBUG') {
        console.log(err);
      }
    }
    // In the background...
    // Load the festival docs from Bundle.  
    // If a bundle isn't available the preload the festival.  
    await this.changeFestival(festival, true, false);
    try {
      await this.loadDump('dump.json', `${localStorage.getItem(
        'currentDb',
      )}_by_model_name_erlang/festival_dump`, festival);
    } catch (err) {
      console.log(err)
      this.preloadFestival(festival);
    }
  },

  /* 
   * loadMultiFestival()
   * 
   * Load data when the app is being used as a multi festival app.  
   */
  async loadMultiFestival() {
    // NB: Currently only available whilst the client is online
    // Load festival docs from couchdb
    await this.loadView('by_model_name_erlang/all_festivals', null);
    // Reload application route to ensure all festivals are loaded into left sidebar menu
    this.reloadRoute('application');
    // If there is a default festival load it
    if (config.festivalId) {
      if (this.currentFestivalID === null && config.festivalId) {
        let festival = await this.store.findRecord(
          'festival',
          config.festivalId,
        );
        await this.changeFestival(festival, true, false);
        await this.preloadFestival(festival);
        this.set('initialisationComplete', true);
        // Transition will now be triggered, the dataset update action will be triggered by the
        // loading of the events route.
        // Preload for all article types (one couchdb request for multiple article_types is far more performant)
        try {
          await this.loadView(
            'by_model_name_erlang/preload_all_boma_articles',
            null,
            false,
          );
        } catch (err) {
          if (config.logLevel === 'DEBUG') {
            console.log(err);
          }
        }
      }
    } else {
      // Otherwise allow progression to the festivals index view
      this.set('initialisationComplete', true);
      // Preload for all article types (one couchdb request for multiple article_types is far more performant)
      try {
        await this.loadView(
          'by_model_name_erlang/preload_all_boma_articles',
          null,
          false,
        );
      } catch (err) {
        if (config.logLevel === 'DEBUG') {
          console.log(err);
        }
      }
    }
  },

  /* 
   * preloadFestival()
   *
   * Preload the data for a festival using the relevant couchdb view.  
   * 
   * festival     Ember Data Object   The festival you want to preload
   */
  async preloadFestival(festival) {
    // If a festival has been previously preloaded this localstorage item will be set.  
    let isPreloaded = localStorage.getItem(
      `${festival.couchdb_design_doc_name}_preloaded`,
    );
    // If a festival hasn't been preloaded
      // Preload it then get the latest data from couchdb.
    // else
      // Get the latest data from couchdb.

    if (isPreloaded === null) {
      // If not preload the festival
      try {
        // Set isLoadingModel on the events controller 
        let controller = getOwner(this).lookup(`controller:events`);
        controller.set('isLoadingModel', true);
 
        // Load the data.  
        let preloaderViewName = `${festival.couchdb_design_doc_name}_by_model_name_erlang/preload_festival`;
        await this.loadView(
          preloaderViewName,
          festival.couchdb_design_doc_name,
          false,
        );

        // Once complete set a flag in localstorage to say so 
        localStorage.setItem(
          `${festival.couchdb_design_doc_name}_preloaded`,
          true,
        );

        // Set isLoadingModel on the events controller to false.  
        controller.set('isLoadingModel', false);
        
        // Reload the route.  
        this.reloadRoute('events');
      } catch (err) {
        if (config.logLevel === 'DEBUG') {
          console.log(err);
        }
      }
    } else {
      // Load the data from couchdb
      let fullFestivalViewName = `${festival.couchdb_design_doc_name}_by_model_name_erlang/festival_dump`;
      this.loadView(
        fullFestivalViewName,
        festival.couchdb_design_doc_name,
        false,
      );
    }
  },

  /* 
   * changeFestival()
   *
   * Change the currently selected festival pouchdb database.  
   * 
   * festival     Ember Data Object   The festival you want to change to
   * changeDb     boolean             Set to true to change the database being used
   * reloadRoute  boolean             Set to true to reload the route once the database change has completed
   */
  changeFestival(festival, changeDb = true, reloadRoute = true) {
    return new Promise((resolve) => {
      // Change to relevant couchdb database
      if (changeDb == true) {
        let currentDb = localStorage.getItem('currentDb');

        // Only change the database if it's different to the current one
        if (currentDb === festival.couchdb_design_doc_name) {
          resolve();
          return false;
        }
    
        if (config.logLevel === 'DEBUG') {
          console.log(`Changing db to ${festival.couchdb_design_doc_name}`);
        }
    
        // Use ember pouch's changeDb() method to change the database used by the 
        // application adapter.   
        let localDb = festival.couchdb_design_doc_name || config.emberPouch.localDb;
        this.localDb = new PouchDB(localDb);
        let adapter = this.store.adapterFor('application');
        adapter.changeDb(this.localDb);
    
        if (changeDb === true) {
          localStorage.setItem('currentDb', localDb);
          if (reloadRoute === true) {
            this.reloadRoute('events');
          }
        }
      }

      // Set localstorage records and the attributes on this service
      // used for clashfinder view and festival styling.  
      // Used for Clashfinder View
      localStorage.setItem('currentFestivalID', festival.id);
      this.set('currentFestivalID', festival.id);

      // Used for choosing festival styling
      this.set('currentFestivalDbName', festival.couchdb_design_doc_name);

      // Reinitialise activity to report activity about this festival
      // this.activity.initActivity();

      resolve();
    });
  },

  /* 
   * createDb()
   *
   * dbName     string      The name of the pouchdb to create.  (optional)
   * 
   * Create a pouchdb database
   */
  createDb(dbName) {
    // If no dbName is supplied then use that defined in the config/environment.js
    let localDb = dbName || config.emberPouch.localDb;

    this.localDb = new PouchDB(localDb, {
      revs_limit: 1,
      auto_compaction: true,
      adapter: 'idb',
    });
    this.remoteDb = new PouchDB(config.emberPouch.remoteDb);

    return this.localDb;
  },

  /*
   * loadView()
   *
   * viewName       str    The name of the view to be loaded (as defined in the couchdb design doc)
   * dbName         str    The database name for this view. If null config.emberPouch.localDb will be used
   * resolveEarly   str    If true, cancel after the first batch is complete.  
   * 
   * Load a couchdb view into the local pouchdb
   */
  loadView(viewName, dbName = null, resolveEarly = false) {
    if (config.logLevel === 'DEBUG') {
      console.time(viewName);
    }

    this.createDb(dbName);

    var self = this;

    return new Promise((resolve, reject) => {
      try {
        let changes;
        changes = PouchDB.replicate(this.remoteDb, this.localDb, {
          live: false,
          filter: '_view',
          view: viewName,
          batch_size: 500,
          batches_limit: 1,
          checkpoint: 'target',
          timeout: 30000,
        })
          .on('change', (info) => {
            info.docs.forEach((doc) => {
              // If the change relates to an event and is a preference then update the notification
              if (self.getModelNamefromDocID(doc._id) === 'event') {
                // 1 second delay to allow for changes to propagate.
                let eventId = self.getIDfromDocID(doc._id);
                self.store.findRecord('event', eventId).then((event) => {
                  if (event.isPreferred) {
                    later(() => {
                      self.preferenceToggle.refreshPreference(event);
                    }, 1000);
                  }
                });
              }
            });

            if (resolveEarly === true) {
              changes.cancel();
              if (config.logLevel === 'DEBUG') {
                console.timeEnd(viewName);
              }
              resolve();
            }
          })
          .on('complete', () => {
            if (config.logLevel === 'DEBUG') {
              console.timeEnd(viewName);
            }
            // Set the dataLastUpdatedAt item in localstorage, this is displayed to the user
            // at the bottom of the settings page.  
            localStorage.setItem('dataLastUpdatedAt', new Date());
            resolve();
          })
          .on('error', function (err) {
            if (self.get('initialisationComplete') === false) {
              self.set('canSkipInitialisation', true);
            }

            if (config.logLevel === 'DEBUG') {
              console.log(err);
            }
            reject();
          });
      } catch (err) {
        console.log(err);
        reject();
      }
    });
  },

  /* 
   * reloadRoute()
   *
   * routeName      string      The name of the route to be reloaded
   * 
   * Reload a route (and crucially it's model) so that new records are shown.  
   */
  reloadRoute(routeName) {
    try {
      // If the current route and the route that this data is required for match then reload
      // the model once loadView is complete
      var currentRoute = this.router.currentRouteName;
      if (currentRoute != undefined) {
        if (routeName === currentRoute) {
          getOwner(this)
            .lookup('route:' + currentRoute)
            .send('reloadModel');
          getOwner(this)
            .lookup('route:' + currentRoute)
            .send('reActivate');
        } else if (routeName === 'application') {
          getOwner(this).lookup('route:application').send('reloadModel');
        }
      }
    } catch (e) {
      if (config.logLevel === 'DEBUG') {
        console.log(e);
      }
    }
  },

  /* * * * * * * * * * * * * * * * * * *
   *     LOADING DATA FROM DUMP        *
   * * * * * * * * * * * * * * * * * * */

  /* 
   * Loading data from data dumps enables the app to be used offline even if the user has no access to an internet 
   * connection on the first opening of the app.  
   * 
   * It also reduces load on the couchdb servers as replication is picked up from the last change rather than from 
   * the start again.  
   * 
   * iOS and Android/Browser use two different method for reading the dump files ready for loading into pouchdb.  
   * 
   * Data dumps are part of a package (called bundles) which include a dump file and all the images for tha app.  
   * 
   * Dumps are created using https://gitlab.com/boma-hq/pouch-dump.  
   */

  /* 
   * loadDump()
   * 
   * filename     str                         
   * viewName     str                             The name of the view the dump was taken using, this is required so 
   *                                              that the correct checkpoint can be written (see https://github.com/pouchdb-community/pouchdb-load?tab=readme-ov-file#handoff-to-regular-replication)
   * festival     Ember data festival object      The festival this data dump relates to
   * 
   * Load data from a dump file.  
   */
  async loadDump(filename, viewName, festival = null) {
    // If the data being imported relates to a festival create the pouchdb database for this festival.  
    if (festival) {
      this.createDb(festival.couchdb_design_doc_name);
    }

    // Load the dump file.  
    // iOS and Android require different methods to load the dump file.  
    var promise;
    if (window.device !== undefined && window.device.manufacturer == 'Apple') {
      promise = this.loadFromDumpForIOS(filename, viewName);
    } else {
      promise = this.loadFromDump(filename, viewName);
    }
    await promise;

    // If the data relates to a festival
    if (festival) {
      // Set the festival as preloaded
      localStorage.setItem(
        `${festival.couchdb_design_doc_name}_preloaded`,
        true,
      );
      // Change the festival so that this is now the active festival.  
      this.changeFestival(festival, true, false);
    }
  },

  /* 
   * loadFromDump()
   *
   * dumpName     str     The filename of the dump to be loaded
   * viewName     str     The name of the view the dump was taken using
   * 
   * Load data from a dump for Android and Browser version of the app.  
   */
  loadFromDump(dumpName, viewName) {
    return new Promise((resolve, reject) => {
      // If the latest bundle has not been loaded yet.  
      if (this.checkBundleUpToDate(dumpName) === false) {
        if (config.logLevel === 'DEBUG') {
          console.time(`Loaded data bundle by ajax`);
        }
        // Load the data into the pouchdb database and then handoff to replication.  
        this.localDb
          .load(`assets/${dumpName}`, {
            proxy: config.emberPouch.remoteDb,
            filter: '_view',
            view: viewName,
          })
          .then(() => {
            if (config.logLevel === 'DEBUG') {
              console.timeEnd('Loaded data bundle by ajax');
            }

            // Update the localstorage records to record the latest bundle id.   
            // This is used when calculating whether the app should load from a bundle or not on initialisation.  
            this.setBundleUpdated(dumpName);

            resolve(true);
          })
          .catch((e) => {
            console.log(e)
            reject(e);
          });
      } else {
        resolve(false);
      }
    });
  },

  /* 
   * loadFromDumpForIOS()
   *
   * dumpName     str     The filename of the dump to be loaded
   * viewName     str     The name of the view the dump was taken using
   * 
   * Load data from a dump for iOS versions of the app.  
   */ 
  loadFromDumpForIOS(dumpName, viewName) {
    return new Promise((resolve, reject) => {
      // If the latest bundle has not been loaded yet.  
      if (this.checkBundleUpToDate(dumpName) === false) {
        if (config.logLevel === 'DEBUG') {
          console.time('Loaded data bundle from file');
        }
        // Read the data into local 
        this.readDumpFile(dumpName)
          .then((result) => {
            // Load the data into the pouchdb database and then handoff to replication.  
            this.localDb
              .load(result, {
                proxy: config.emberPouch.remoteDb,
                filter: '_view',
                view: viewName,
              })
              .then(() => {
                if (config.logLevel === 'DEBUG') {
                  console.timeEnd('Loaded data bundle from file');
                }

                // Update the localstorage records to record the latest bundle id.   
                // This is used when calculating whether the app should load from a bundle or not on initialisation.  
                this.setBundleUpdated(dumpName);

                resolve(true);
              })
              .catch(() => {
                reject(false);
              });
          })
          .catch(() => {
            reject(false);
          });
      } else {
        resolve(false);
      }
    });
  },

  /* 
   * readDumpFile()
   *
   * dumpName     str     The filename of the dump to be loaded
   * 
   * Read the dump file using cordova-plugin-file
   */   
  readDumpFile(dumpName) {
    var self = this;
    return new Promise(function (resolve, reject) {
      function gotFile(fileEntry) {
        fileEntry.file(function (file) {
          var reader = new FileReader();

          reader.onloadend = function () {
            resolve(self.decodeArrayBuffer(this.result));
          };

          reader.readAsArrayBuffer(file);
        });
      }
      // Use cordova-plugin-file to load the file contents.  
      window.resolveLocalFileSystemURL(
        cordova.file.applicationDirectory + 'www/assets/' + dumpName,
        gotFile,
        () => reject(),
      );
    });
  },

  /* 
   * decodeArrayBuffer()
   *
   * data     The file data.  
   * 
   * Decode the array buffer into utf-8 to avoid issues with character sets.  
   */   
  decodeArrayBuffer(data) {
    var enc = new TextDecoder('utf-8');
    return enc.decode(data);
  },

  /*  
   * checkBundleUpToDate()
   * 
   * dumpName     str     The filename of the dump to be loaded
   * 
   * Check if the bundle to be loaded has been updated since the app last imported a bundle.  
   */
  checkBundleUpToDate(dumpName) {
    // Get the latest bundle id stored in local storage for this dumpName.  
    let storedBundleVersion = localStorage.getItem(
      `bundleVersion-${dumpName.replace('.', '_')}`,
    );

    // If we have a stored bundle version and the stored version is more recent or the same as the
    // bundle version stored in config
      // Return true and don't trigger the loading of the bundle
    // else
      // Return false and trigger the loading of the bundle
    if (
      storedBundleVersion !== undefined &&
      storedBundleVersion !== null &&
      storedBundleVersion >= config.bundleVersion
    ) {
      if (config.logLevel === 'DEBUG') {
        console.log(
          `%c ${dumpName} Data Bundle UP-TO-DATE `,
          'background: green; color: white',
        );
      }
      return true;
    } else {
      if (config.logLevel === 'DEBUG') {
        console.log(
          `%c ${dumpName} Data Bundle OUT OF DATE -> Loading new data `,
          'background: red; color: white',
        );
      }
      return false;
    }
  },

  /*  
   * setBundleUpdated()
   * 
   * dumpName     str     The filename of the dump to be loaded
   * 
   * Set the bundle version in local storage after a bundle has been updated.  
   */
  setBundleUpdated(dumpName) {
    localStorage.setItem(
      `bundleVersion-${dumpName.replace('.', '_')}`,
      config.bundleVersion,
    );
  },

  /*  
   * getIDfromDocID()
   * 
   * docID     str     The id of the pouchdb document
   * 
   * Return the ember data record ID from pouchdb document ID.  
   */
  getIDfromDocID(docID) {
    return parseInt(docID.match(/\d+$/)[0]);
  },

  /*  
   * getModelNamefromDocID()
   * 
   * docID     str     The id of the pouchdb document
   * 
   * Return the model name from pouchdb document ID.  
   */ 
  getModelNamefromDocID(docID) {
    return docID.split('_')[0];
  },

  loadDoc(doc_id) {
    var self = this;
    return new Promise(function (resolve) {
      self.remoteDb
        .get(doc_id)
        .then((result) => {
          // var doc = result;
          self.localDb.put(result, { force: true }).then(() => {
            // if(doc.data.image_name){
            //   self.cacheImages(doc).then(()=>{
            //     resolve(true);
            //   }).catch((err)=>{
            //     console.log(err)
            //   })
            // }else{
            resolve(true);
            // }
          });
        })
        .catch((e) => {
          self.flashService.showFlash(
            "Sorry, Network Error. We're unable to update.",
          );
          console.log(e);
        });
    });
  },


  /* * * * * * * * * * * * * * * * * * *
   *        RESETTING APP DATA         *
   * * * * * * * * * * * * * * * * * * */

  /* 
   *  App data can be reset by users in the settings page.  
   */

  /* 
   * dumpData()
   *
   * Reset app data.  
   */
  dumpData() {
    localStorage.setItem('bundleVersion', undefined);

    this.dumpLocalDatabase().then(() => {
      alert(
        'Data Reset Successfully.  Please close the app completely and reopen it.  ',
      );
    });
  },

  /* 
   * dumpLocalDatabase()
   *
   * Dump all pouchdb databases  
   */
  dumpLocalDatabase() {
    // Reset initialisationComplete
    this.set('initialisationComplete', false);

    // Get all pouchdb databases and destroy all.  
    var promises = [];
    return new Promise((resolve, reject) => {
      // Get all the names of the pouchdb databases from local storage.  
      let dbs = Object.keys(localStorage).filter((item) => {
        if (item.startsWith('_pouch_') && item != '_pouch_check_localstorage') {
          return item;
        }
      });

      // Loop through each database, remove the associated localStorage records
      // and destroy the databases.  
      for (const db of dbs) {
        try {
          var dbName = `${db.replace('_pouch_', '')}`;
          localStorage.removeItem(`${dbName}_preloaded`);
          var promise = new PouchDB(dbName).destroy();
          promises.push(promise);
        } catch (err) {
          if (config.logLevel === 'DEBUG') {
            console.log(err);
          }
        }
      }

      // When all databases have been destroyed resolve the promise.  
      // on error reject the promise.
      all(promises)
        .then(() => {
          localStorage.clear();
          resolve();
        })
        .catch(() => {
          reject();
        });
    });
  },
});
