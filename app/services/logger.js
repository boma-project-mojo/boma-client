/*
 * ------- LOGGER -------
 *
 * This service provides a consistent API for use when logging in the app.
 * it provides four levels of logging as detailed below.
 *
 * The logging level displayed can be configured in the config/environment.js
 * by setting the `logLevel` variable to DEBUG, INFO, WARNING or ERROR.
 *
 * DEBUG:
 * Messages in this level are mostly used for problem diagnosis.
 * Information on this Level are for Developers.
 *
 * INFO:
 * These messages contain some contextual information to help trace
 * execution (at a coarse-grained level) in a production environment.
 *
 * WARNING:
 * A warning message indicates a potential problem in the system.
 * the System is able to handle the problem by itself or to proceed with this problem anyway.
 *
 * ERROR:
 * An error message indicates a serious problem in the system.
 * The problem is usually non-recoverable and requires manual intervention.
 */

import Service from '@ember/service';
import config from '../config/environment';

export default Service.extend({
  /*
   * Print a console log if the app is configured to print messages for the logLevel provided.
   *
   * message    The log message                           (string)
   * logLevel   A string representation of the log level  (string)
   * style      CSS styling for the console log           (string)
   */
  log(message, logLevel, style) {
    let thisMessageLogLevel = this.logNameToCode(logLevel);
    if (config.logLevel >= thisMessageLogLevel) {
      if (style) {
        console.log(`%c ${message}`, style);
      } else {
        console.log(message);
      }
    }
  },

  /*
   * Start a console timer if the app is configured to print messages for the logLevel provided.
   *
   * message    The log message                           (string)
   * logLevel   A string representation of the log level  (string)
   */
  time(message, logLevel) {
    let thisMessageLogLevel = this.logNameToCode(logLevel);

    if (config.logLevel >= thisMessageLogLevel) {
      console.time(message);
    }
  },

  /*
   * Finish a console timer and print to console if the app is configured to print messages for the logLevel provided.
   *
   * message    The log message                           (string)
   * logLevel   A string representation of the log level  (string)
   */
  timeEnd(message, logLevel) {
    let thisMessageLogLevel = this.logNameToCode(logLevel);

    if (config.logLevel >= thisMessageLogLevel) {
      console.timeEnd(message);
    }
  },

  /*
   * Convert logLevel strings to codes
   *
   * logLevel     A string representation of the log level  (string)
   */
  logNameToCode(logLevel) {
    var logCode;
    switch (true) {
      case logLevel === 'DEBUG':
        logCode = 3;
        break;
      case logLevel === 'INFO':
        logCode = 2;
        break;
      case logLevel === 'WARNING':
        logCode = 1;
        break;
      case logLevel === 'ERROR':
        logCode = 0;
        break;
    }
    return logCode;
  },
});
