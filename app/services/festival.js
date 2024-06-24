import Service from '@ember/service';

export default Service.extend({
  /* 
   * festivalDays()
   *
   * Return an array of the days a festival spans for use when displaying the festival
   * schedule data
   * 
   * @festival      Ember Data Object     The ember data object for the festival.  
   */
  festivalDays(festival) {
    var dateArray = [];

    var start_date = moment(festival.start_date);
    var end_date = moment(festival.end_date);

    // To handle the situation where festival events go into the early hours of the next day but there are no events
    // for the rest of that day include the following day in the clashfinder only if the festival end_time is later than
    // the start of a new day on the clashfinder
    var i_date = start_date.set({
      hour: festival.clashfinder_start_hour,
      minute: 0,
    });

    // Create an array of festival days with all required formats to display on clashfinder
    // filter_day:  the common format which is used for filtering events by date across the app
    // day:  mon, tues, weds etc
    // date:  date of month (shown when a festival spans more than 1 week)
    while (end_date.diff(i_date, 'hours') > festival.clashfinder_start_hour) {
      dateArray.push(
        {
          'datetime': moment(i_date).format('YYYY-MM-DD'),
          'filter_day': moment(i_date).format('MMDD'),
          'day': moment(i_date).format('ddd'),
          'date': moment(i_date).format('DD')
        }
      );
      i_date = i_date.add(1, 'days');
    }

    return dateArray;
  },
});
