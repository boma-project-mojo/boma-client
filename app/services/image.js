/* 
 * Image Service
 * 
 * This service handles
 *  - caching images
 *  - logic related to which image should be rendered
 */

import Service from '@ember/service';
import { htmlSafe } from '@ember/template';
import DS from 'ember-data';
import ENV from 'boma/config/environment';
import { Promise } from 'rsvp';

export default Service.extend({

  /* 
   * image_bundled()
   *
   * Checks whether the image for this model is included in the images bundled with the app.  
   */
  image_bundled(model) {
    // If the image has a bundled at time and this is greater than the time the image was last
    // updated on the bundle then return true
    return (
      model.image_bundled_at &&
      model.image_bundled_at > model.image_last_updated_at
    );
  },
  /* 
   * getImageBackgroundImageCSS()
   *
   * Returns the background image CSS for the supplied model and imageName including
   * calculating whether the image is in the current bundle, already cached in localstorage
   * and falling back to loading from the CDN
   * @model             Ember Data Object     The ember data object for the model the image belongs to
   * @modelName         string                The name of this model type (e.g event)
   * @modelId           int                   The id for this model
   * @imageName         string                The name of the attribute on the model containing the image path.  
   */
  getImageBackgroundImageCSS(model, modelName, modelId, imageName) {
    var request = new Promise((resolve) => {
      try {
        if (this.image_bundled(model)) {
          // Image is included in the bundle
          resolve(
            htmlSafe(
              `background-image: url('assets/images/bundled/${modelName}-${modelId}-thumb.jpg');`,
            ),
          );
        } else {
          // Image is not included in the bundle
          ImgCache.isCached(model.get(imageName), (path, success) => {
            // Check if the image has been cached already
            if (success) {
              // If cached get the base64 for the cached image and resolve the promise returning the base64 for the image.
              ImgCache.getCachedFileBase64Data(
                model.get(imageName),
                (url, filePath) => {
                  resolve(
                    htmlSafe(
                      "background-image: url('" +
                        filePath +
                        "'), url('data:image/jpeg;base64," +
                        model.get('image_loader') +
                        "');",
                    ),
                  );
                },
              );
            } else {
              // If it's not already cached, try to cache it.
              ImgCache.cacheFile(
                model.get(imageName),
                () => {
                  // If cache is a success return the base64 and resolve the promise returning the base64 for the image.
                  ImgCache.getCachedFileBase64Data(
                    model.get(imageName),
                    (url, base64) => {
                      resolve(
                        htmlSafe(
                          `background-image:url('${base64}'), url('data:image/jpeg;base64,${model.get(
                            'image_loader',
                          )}');`,
                        ),
                      );
                    },
                  );
                },
                () => {
                  // If cache fails fallback to previously bundled image, image at s3 or if nothing else is possible, the loading image.
                  if (
                    model.get('image_bundled_at') &&
                    model.get('image_bundled_at').getTime() === 0
                  ) {
                    // There is no previously bundled image to fall back on
                    resolve(
                      htmlSafe(
                        `background-image:url('assets/images/${ENV['fallbackImageFileName']}')`,
                      ),
                    );
                  } else {
                    // Fall back to previously bundled image
                    resolve(
                      htmlSafe(
                        `background-image:url('assets/images/bundled/${modelName}-${modelId}-thumb.jpg'),url('${model.get(
                          imageName,
                        )}'), url('data:image/jpeg;base64,${model.get(
                          'image_loader',
                        )}');`,
                      ),
                    );
                  }
                },
              );
            }
          });
        }
      } catch (e) {
        console.log(
          'Error with image - probably no image available for this model.',
        );
      }
    });

    return DS.PromiseObject.create({ promise: request });
  },
});
