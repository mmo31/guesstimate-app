import React, {Component, PropTypes} from 'react';
import Histogram from 'gComponents/lib/histogram';
import Dimensions from 'gComponents/utility/react-dimensions';
import './style.css'

const PT = PropTypes
class SimulationHistogram extends Component{

  static propTypes = {
    containerWidth: PT.number,
    height: PT.number,
    simulation: PT.object,
  }

  static defaultProps = {
    bins: 40,
  };

  shouldComponentUpdate(nextProps) {
    return (
      (_.get(nextProps, 'simulation.stats') !== _.get(this.props, 'simulation.stats')) ||
      (nextProps.containerWidth !== this.props.containerWidth) ||
      (nextProps.height !== this.props.height)
    )
  }
  values(){
    return _.get(this.props, 'simulation.sample.values')
  };
  histogram() {
    return (
      <Histogram data={this.values()}
          height={this.props.height}
          width={this.props.containerWidth + 5}
          bottom={20}
          bins={this.props.bins}
      />
    )
  };
  render() {
    const values = this.values()
    const hasValues =  (values && values.length >= 100)
    if (hasValues){
      return (this.histogram())
    } else {
      return false
    }
  }
}

export default Dimensions()(SimulationHistogram)
