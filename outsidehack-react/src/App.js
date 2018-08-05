import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

const context = new AudioContext();

class App extends Component {
  constructor(props) {
    super(props);
    this.handleNoteClick = this.handleNoteClick.bind(this);
    this.handleSampleClick = this.handleSampleClick.bind(this);

    this.state = {
      currentBeat: 0,
      noteGrid: [
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
      ]
    };

    const sampleURLs = [
      "samples/hello.wav",
      "samples/hello.wav",
      "samples/hello.wav",
      "samples/hello.wav"
    ];
    this.sampleBuffers = [];
    for(let sampleURL of sampleURLs) {
      fetch(sampleURL)
      .then(response => response.arrayBuffer())
      .then(buffer => {
        console.log("buffer: ", buffer);
        console.log("context: ", context);
        context.decodeAudioData(buffer, decoded => {
          console.log("decoded: ", decoded);
          this.sampleBuffers.push(decoded);
        }).catch(e => {
          console.log("error: ", e);
        });
      })
      .catch(e => {
        console.log("error: ", e);
      });
    }
  }
  componentDidMount() {
    this.timerID = setInterval(
      () => this.tick(),
      1000
    );
  }
  tick() {
    this.setState({
      currentBeat: (this.state.currentBeat + 1) % 16
    });
    console.log(this.state.noteGrid);
    for (var sampleIndex = 0; sampleIndex < this.state.noteGrid.length; sampleIndex++) {
      if (this.state.noteGrid[sampleIndex][this.state.currentBeat]) {
        console.log("play note");
        var source = context.createBufferSource();
        source.buffer = this.sampleBuffers[sampleIndex];
        source.connect(context.destination);
        source.start();
      }
    }
  }

  handleNoteClick(sampleIndex, currentBeat){

    var newNoteGrid = this.state.noteGrid;
    newNoteGrid[sampleIndex][currentBeat] = !newNoteGrid[sampleIndex][currentBeat];
    this.setState({
      noteGrid: newNoteGrid
    });
  }

  handleSampleClick(sampleIndex){
    console.log("click sample buffers: ", this.sampleBuffers);
    var source = context.createBufferSource();
    source.buffer = this.sampleBuffers[sampleIndex];
    source.connect(context.destination);
    source.start();

  }

  render() {
    return (
      <div>
        <SampleSequence name="A" sequence={this.state.noteGrid[0]} sampleIndex={0} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick} />
        <SampleSequence name="B" sequence={this.state.noteGrid[1]} sampleIndex={1} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="C" sequence={this.state.noteGrid[2]} sampleIndex={2} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="D" sequence={this.state.noteGrid[3]} sampleIndex={3} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>

      </div>
    );
  }
}

class SampleSequence extends React.Component {
  constructor() {
    super();
    this.handleNoteClick = this.handleNoteClick.bind(this);
    this.handleSampleClick = this.handleSampleClick.bind(this);

    this.buffer = null;
  }

  handleNoteClick(currentBeat){
    this.props.onNoteClick(this.props.sampleIndex, currentBeat);
  }
  handleSampleClick(e) {
    console.log("sample click!");
    this.props.onSampleClick(this.props.sampleIndex);
  }
  render() {
    const counts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    var sampleSequenceJSX = [];
    for(var i = 0; i < this.props.sequence.length; i++) {
        var row = [];
        var count = counts[i];
        var isPlaying = false;
        if (this.props.currentBeat == count){
          var isPlaying = true;
        }
        row.push(<Note key={count.toString()} isPlaying={isPlaying} isOn={this.props.sequence[i]} onNoteClick={this.handleNoteClick} count={count}>
          {count}
        </Note>);
        sampleSequenceJSX.push(row);
    }
    return (
      <div>
        <button type="button" onClick={() => {this.handleSampleClick(this.props.sampleIndex)}}> {this.props.name} </button>
        {sampleSequenceJSX}
      </div>
    );
  }
}

class Note extends React.Component {

  constructor(props) {
    super(props);
    this.handleNoteClick = this.handleNoteClick.bind(this);

  }
  handleNoteClick(e) {
    this.props.onNoteClick(this.props.count);
  }
  render() {
    var style = {}
    if (this.props.isPlaying) {
      style["color"] = "red";
    } else {
      style["color"] = "black";
    }
    if (this.props.isOn) {
      style['backgroundColor'] = "blue"
    } else {
      style['backgroundColor'] = "white"
    }
    return (
      <button type="button" onClick={this.handleNoteClick} style={style}>{this.props.count + 1}</button>
    );

  }

}

export default App;
