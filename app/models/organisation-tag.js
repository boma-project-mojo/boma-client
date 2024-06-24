/* 
 * 
 * Tags can be scoped by Organisation or Festival to allow them to be associated with either
 * a Festival's Event/Venue or Organisation's Article.  
 * 
 * Due to syncing couchdb using design docs Tags are included in both the Festival(s) and 
 * Organisation db.  
 * 
 * This implements an OrganisationTag which uses the Tag documentType but uses a specific 
 * OrganisationTag adapter ensure the Organisation pouchdb database is queried for Articles
 * and the Festival pouchdbs are queried for Festival data.  
 * 
 */

import { attr } from '@ember-data/model';
import { Model } from 'ember-pouch';

class OrganisationTag extends Model {
  @attr() rev;
  @attr() name;
  @attr() tag_type;
  @attr() aasm_state;
  @attr() description; 
  @attr() festival_id;
  @attr('string') name;
}

OrganisationTag.documentType = 'tag';

export default OrganisationTag;