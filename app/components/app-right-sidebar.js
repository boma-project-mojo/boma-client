import { scheduleOnce } from '@ember/runloop';
import Component from '@ember/component';
import { inject as service } from '@ember/service';
import $ from 'jquery';
import { computed } from '@ember/object';

export default Component.extend({
  filterService: service('filter'),

  classNames: ['right-sidebar'],
  isOpen: false,
  sidebar: null,
  isCommunityEvents: computed('context', function () {
    const context = this.context;
    return context === 'community-events';
  }),
  didInsertElement() {
    this._super(...arguments);
    var self = this;
    // eslint-disable-next-line ember/no-incorrect-calls-with-inline-anonymous-functions
    scheduleOnce('afterRender', this, function () {
      var rightSidebar = new Slideout({
        panel: $('#main')[0],
        menu: $('.right-sidebar')[0],
        padding: 280,
        tolerance: 10,
        side: 'right',
        touch: false,
      });

      function close(eve) {
        eve.preventDefault();
        rightSidebar.close();
      }

      rightSidebar
        .on('beforeopen', function () {
          this.panel.classList.add('panel-open');
          self.get('applicationController').set('rightSidebarShown', true);
        })
        .on('open', function () {
          this.panel.addEventListener('click', close);
        })
        .on('beforeclose', function () {
          this.panel.classList.remove('panel-open');
          this.panel.removeEventListener('click', close);
        })
        .on('close', function () {
          self.get('applicationController').set('rightSidebarShown', false);
          // $('html').removeClass('right-slideout-open');
        });

      this.set('sidebar', rightSidebar);
      window.rightSidebar = rightSidebar;

      let panel = document.getElementById('main');

      panel.addEventListener(
        'touchstart',
        function (eve) {
          let offset = eve.touches[0].pageX;

          if (rightSidebar._orientation !== 1) {
            offset = window.innerWidth - offset;
          }

          rightSidebar._preventOpen =
            rightSidebar._preventOpen ||
            (offset > rightSidebar._tolerance && !rightSidebar.isOpen());
        },
        { passive: true },
      );

      $('body').on('click', '#toggle-right-sidebar', function () {
        rightSidebar.toggle();
      });
    });
  },
  didDestroyElement() {
    this._super(...arguments);
    this.sidebar.destroy();
  },
  actions: {
    /* 
     * updateSelected()
     *
     * Update the selected filter with the value provided
     * 
     * modelName      str     The name of the filter to be updated
     * modelId        int     The value to add
     */
    updateSelected: function (modelName, value) {
      this.filterService.updateSelected(modelName, value);
    },
    /* 
     * updateSelectedRadio()
     *
     * Update the selected radio button value for the filter selected
     * 
     * modelName      str     The name of the filter to be updated
     * modelId        int     The value of the radio button to add
     */
    updateSelectedRadio: function (modelName, modelId) {
      this.filterService.updateSelectedRadio(modelName, modelId);
    },
    /* 
     * updateSelectedBoolean()
     *
     * Update the selected boolean value for the filter selected
     * 
     * label      str     The name of the filter to be updated
     * value      str     The value to update the filter to
     */
    updateSelectedBoolean: function (label, value) {
      this.filterService.updateSelectedBoolean(label, !value);
    },
    /* 
     * close()
     *
     * Close the right hand sidebar
     */
    close() {
      this.sidebar.close();
    },
  },
});
