import Service, { inject as service } from '@ember/service';
import $ from 'jquery';
import Lunr from 'lunr';
import config from 'boma/config/environment';
import { alias } from '@ember/object/computed';

export default Service.extend({
  // Tags can be associated with an event or the event's productions.
  // events can be filtered using either filter tag type, this is set in the config file.
  eventFilterTagType: config.eventFilterTagType,
  // Events can be ordered by the event name or chronologically.  Get the config from the config file.
  eventOrder: config.eventOrder,

  store: service('store'),
  filter: service('filter'),
  preferenceService: service('preference-toggle'),
  clashfinderService: service('clashfinder'),

  firstEventsByDay: alias('clashfinderService.firstEventsByDay'),

  async query(params, festival) {
    // var s = this;
    var self = this;

    var selectedExcludedTags = [];
    selectedExcludedTags = $.map(params['selectedExcludedTags'], (t) =>
      parseInt(t),
    );

    var events = await this.store.findAll('event');

    if (params['preferences']) {
      var ps = await this.preferenceService.getPreferences();
    }

    // Filter by tags
    var selectedTags = [];
    selectedTags = $.map(params['selectedTags'], (t) => parseInt(t));
    // merge tags set in the persistentSelected field to the selected tags array
    var persistentSelectedTags = $.map(params['persistentSelectedTags'], (t) =>
      parseInt(t),
    );
    selectedTags = selectedTags.concat(persistentSelectedTags);

    if (params['viewType'] != 'clashfinder') {
      events = events
        .filter(function (event) {
          var recordTags =
            self.eventFilterTagType === 'event'
              ? event.get('event_tags')
              : event.get('tags');
          var has_params_tags = self
            .get('filter')
            .manyIncludedInMany(recordTags, selectedTags);

          // Tags excluded
          var eventNotExcluded = false;
          if (selectedExcludedTags.length > 0) {
            eventNotExcluded = self
              .get('filter')
              .manyNotIncludedInMany(event.get('tags'), selectedExcludedTags);
          }

          // Freetext search...
          var includeInSearch = self
            .get('filter')
            .freeTextSearch(event.get('name'), params['searchKeyword']);

          // preferences
          if (params['preferences']) {
            var isPreferred = self
              .get('filter')
              .oneIncludedInMany(parseInt(event.id), ps.events);
          }

          // Filter by day
          // Support current and legacy filter_day format (legacy is Mon, Tue, Wed etc, current is MMDD)
          var selectedDaysArray = params['selectedDays']
            .map((day) => {
              return day.split(',');
            })
            .flat();
          var daySelected = self
            .get('filter')
            .oneIncludedInMany(event.get('filter_day'), selectedDaysArray);

          // Filter by venue
          var venues = params['selectedVenues'];
          if (venues.length > 0) {
            venues = $.map(venues, (v) => parseInt(v));
          }

          var venue_id = event.get('venue');
          var venueSelected = self
            .get('filter')
            .oneIncludedInMany(parseInt(venue_id), venues);

          if (
            event.get('event_type') !== 'community_event' &&
            (event.get('aasm_state') == 'published' ||
              event.get('aasm_state') == 'cancelled') &&
            (params['selectedVenues'].length === 0 || venueSelected) &&
            (selectedTags.length === 0 || has_params_tags) &&
            (selectedExcludedTags.length === 0 || eventNotExcluded) &&
            (params['selectedDays'].length === 0 || daySelected) &&
            (params['preferences'] === false || isPreferred === true) &&
            (params['searchKeyword'] === '' || includeInSearch)
          ) {
            return event;
          } else {
            return false;
          }
        })
        .sortBy(this.eventOrder);

      // if(params['searchKeyword']){
      //   var idx = Lunr(function () {
      //     this.ref('id')
      //     this.field('name')
      //     this.field('description')
      //     this.field('productions_names')

      //   var eventIds = idx.search(`${params['searchKeyword']}`).mapBy('ref');

      //   events = events.filter((event)=>{
      //     if(eventIds.includes(event.get('id'))){
      //       return event;
      //     }
      //   })
      // }
    } else {
      console.time('eventsByVenueForClashfinder');

      // Hide all events that are less that minimumEventDurationInMins long
      var minimumEventDurationInMins = 15;
      var minimumEventDurationinPercent =
        (100 / 60) * minimumEventDurationInMins;

      var eventsByDayAndVenue = [];
      var firstEventsByDay = {};

      var filteredEvents = events.filter((event) => {
        // preferences
        if (params['preferences']) {
          var isPreferred = self
            .get('filter')
            .oneIncludedInMany(parseInt(event.id), ps.events);
        }

        if (
          event.get('event_type') !== 'community_event' &&
          (params['preferences'] === false || isPreferred === true)
        ) {
          return event;
        } else {
          return false;
        }
      });

      filteredEvents.sortBy('start_time').forEach(function (event) {
        // disregard events that are at venues that shouldn't be included in the clashfinder view
        if (event.venue_include_in_clashfinder === true) {
          // Set firstEventsByDay if not already set.  
          // This is used for positioning the scroll at first event when navigating between days on the clashfinder view.  
          if (firstEventsByDay[event.filter_day] === undefined) {
            // supply raw start position (in minutes) to this object as the now position must be
            // calculated in pixels.
            if (event.start_position >= 0) {
              firstEventsByDay[event.filter_day] = event.start_position;
            }
          }

          var eventStartPosition = self
            .get('clashfinderService')
            .eventStartPosition(event.start_position);
          var eventWidth = self
            .get('clashfinderService')
            .eventWidth(event.event_duration_in_mins);

          if (
            (eventWidth > minimumEventDurationinPercent) &
            (eventStartPosition >= 0)
          ) {
            // append this event to EventsByDayAndVenue object
            eventsByDayAndVenue = self.setEventsByDayAndVenue(
              eventsByDayAndVenue,
              event,
              event.filter_day,
              eventStartPosition,
              eventWidth,
            );

            // If the event starts before festival.clashfinder_start_hour; and ends after festival.clashfinder_start_hour (cFStartHour)
            // take a copy of the event and create a pseudo event the next day
            var cFStartHour = festival.clashfinder_start_hour;

            if (
              // The event spans two days
              // if cFStartHour is midnight and the event spans two days
              ((cFStartHour === 0 && event.start_day != event.end_day) ||
                //or cFStartHour is not midnight and the event starts before cFStartHour and ends after
                (cFStartHour != 0 &&
                  event.start_day != event.end_day &&
                  (event.end_hour > cFStartHour ||
                    (event.end_hour === cFStartHour && event.end_mins != 0)))) &&
              // The event ends after the startHour
              event.end_hour >= cFStartHour &&
              // The event doesn't end at the startHour
              (event.end_hour != cFStartHour ||
                (event.end_hour === cFStartHour && event.end_mins != 0))
            ) {
              var minutesBetweenEventStartTimeAndMidnight;

              // reduce the length of the bar by the number of minutes before startHour
              if (cFStartHour === 0) {
                // Midnight is actually the first moment of the following day so we work from 23:59 and add one minute below
                var startDayMidnight = moment(event.start_time)
                  .tz('Europe/London')
                  .set('hours', 23)
                  .set('minutes', 59)
                  .set('seconds', 0)
                  .set('milliseconds', 0)
                  .valueOf();

                // explains minutesBetweenEventStartTimeAndMidnight ((midnight - event start_time / milliseconds) in a minute + 1 minute)
                minutesBetweenEventStartTimeAndMidnight =
                  (startDayMidnight -
                    moment(event.start_time).tz('Europe/London').valueOf()) /
                    60000 +
                  1;
              } else {
                var startDayStartHour = moment(event.start_time)
                  .tz('Europe/London')
                  .set('hours', cFStartHour)
                  .set('minutes', 0)
                  .set('seconds', 0)
                  .set('milliseconds', 0)
                  .add(1, 'day')
                  .valueOf();

                // explains minutesBetweenEventStartTimeAndMidnight ((midnight - event start_time / milliseconds) in a minute + 1 minute)
                minutesBetweenEventStartTimeAndMidnight =
                  (startDayStartHour -
                    moment(event.start_time).tz('Europe/London').valueOf()) /
                  60000;
              }

              var eventRemainingDuration =
                event.event_duration_in_mins -
                minutesBetweenEventStartTimeAndMidnight;

              // set the start time at 0 and
              eventStartPosition = 0;
              eventWidth = self
                .get('clashfinderService')
                .eventWidth(eventRemainingDuration);

              var endDayFormatted = moment(event.end_time)
                .tz('Europe/Lisbon')
                .format('MMDD');

              eventsByDayAndVenue = self.setEventsByDayAndVenue(
                eventsByDayAndVenue,
                event,
                endDayFormatted,
                eventStartPosition,
                eventWidth,
              );
            }
          }
        }
      });

      this.set('firstEventsByDay', firstEventsByDay);

      events = eventsByDayAndVenue;

      console.timeEnd('eventsByVenueForClashfinder');
    }

    return events;
  },
  setEventsByDayAndVenue(
    eventsByDayAndVenue,
    event,
    dayForClashfinder,
    eventStartPosition,
    eventWidth,
  ) {
    var eventData = {
      data: {
        event_time: `${event.date_string_start} - ${event.date_string_end}`,
        name: event.name,
        event_id: event.id,
        production_id: event.production_id,
        is_preferred: event.isPreferred,
        aasm_state: event.aasm_state,
      },
      eventStartPosition: eventStartPosition,
      eventWidth,
      filter_day: dayForClashfinder,
    };

    var day = eventsByDayAndVenue[dayForClashfinder];

    if (day) {
      var venue = day['venues'].find(
        ({ venue_name_and_subtitle }) =>
          venue_name_and_subtitle === event.venue_name_and_subtitle,
      );

      if (venue) {
        venue['events'].push(eventData);
      } else {
        day['venues'].push({
          venue_name_and_subtitle: event.venue_name_and_subtitle,
          venue_name_for_css: event.venue_name_for_css,
          events: [eventData],
          // sortBy in js sorts null before everything else so default to 1000 if null
          list_order: event.venue_list_order || 1000,
        });
      }
    } else {
      eventsByDayAndVenue[dayForClashfinder] = { venues: [] };
      day = eventsByDayAndVenue[dayForClashfinder];

      day.venues.push({
        venue_name_and_subtitle: event.venue_name_and_subtitle,
        venue_name_for_css: event.venue_name_for_css,
        events: [eventData],
        // sortBy in js sorts null before everything else so default to 1000 if null
        list_order: event.venue_list_order || 1000,
      });
    }

    return eventsByDayAndVenue;
  },
});
