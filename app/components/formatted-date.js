import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class FormattedDateComponent extends Component {
  @tracked dateTime;

  get formattedDateTime() {
    return moment(this.args.dateTime).format(this.args.format);
  }
}
