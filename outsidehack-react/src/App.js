import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

const context = new AudioContext();

class App extends Component {
  constructor(props) {
    super(props);
    this.handleNoteClick = this.handleNoteClick.bind(this);
    this.handleSampleClick = this.handleSampleClick.bind(this);
    this.handleStopClick = this.handleStopClick.bind(this);
    this.handlePlayClick = this.handlePlayClick.bind(this);
    this.handleBPMChange = this.handleBPMChange.bind(this);
    this.state = {
      currentBeat: 0,
      noteGrid: [
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true],
        [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true ]
      ],
      bpm: 120,
      isPlaying: false
    };

    const sampleURLs = [
      "samples/hello.wav",
      "samples/hat.wav",
      "samples/snare.wav",
      "samples/kick.wav"
    ];
    this.sampleBuffers = ["", "", "", ""];

    fetch(sampleURLs[0])
    .then(response => response.arrayBuffer())
    .then(buffer => {
      console.log("buffer: ", buffer);
      console.log("context: ", context);
      context.decodeAudioData(buffer, decoded => {
        console.log("decoded: ", decoded);
        this.sampleBuffers[0] = decoded ;
      }).catch(e => {
        console.log("error: ", e);
      });
    })
    .catch(e => {
      console.log("error: ", e);
    });

    fetch(sampleURLs[1])
    .then(response => response.arrayBuffer())
    .then(buffer => {
      console.log("buffer: ", buffer);
      console.log("context: ", context);
      context.decodeAudioData(buffer, decoded => {
        console.log("decoded: ", decoded);
        this.sampleBuffers[1] = decoded ;
      }).catch(e => {
        console.log("error: ", e);
      });
    })
    .catch(e => {
      console.log("error: ", e);
    });

    fetch(sampleURLs[2])
    .then(response => response.arrayBuffer())
    .then(buffer => {
      console.log("buffer: ", buffer);
      console.log("context: ", context);
      context.decodeAudioData(buffer, decoded => {
        console.log("decoded: ", decoded);
        this.sampleBuffers[2] = decoded ;
      }).catch(e => {
        console.log("error: ", e);
      });
    })
    .catch(e => {
      console.log("error: ", e);
    });

    fetch(sampleURLs[3])
    .then(response => response.arrayBuffer())
    .then(buffer => {
      console.log("buffer: ", buffer);
      console.log("context: ", context);
      context.decodeAudioData(buffer, decoded => {
        console.log("decoded: ", decoded);
        this.sampleBuffers[3] = decoded ;
      }).catch(e => {
        console.log("error: ", e);
      });
    })
    .catch(e => {
      console.log("error: ", e);
    });

  }

  tick() {
    if (!this.state.isPlaying){
      return;
    }

    for (var sampleIndex = 0; sampleIndex < this.state.noteGrid.length; sampleIndex++) {
      if (this.state.noteGrid[sampleIndex][this.state.currentBeat]) {
        var source = context.createBufferSource();
        source.buffer = this.sampleBuffers[sampleIndex];
        source.connect(context.destination);
        source.start();
      }
    }
    this.setState({
      currentBeat: (this.state.currentBeat + 1) % 16
    });

    setTimeout(
      () => this.tick(),
      (60 *1000/ this.state.bpm)
    );
  }

  handleNoteClick(sampleIndex, currentBeat){

    var newNoteGrid = this.state.noteGrid;
    newNoteGrid[sampleIndex][currentBeat] = !newNoteGrid[sampleIndex][currentBeat];
    this.setState({
      noteGrid: newNoteGrid
    });
  }

  handleSampleClick(sampleIndex){
    var source = context.createBufferSource();
    source.buffer = this.sampleBuffers[sampleIndex];
    source.connect(context.destination);
    source.start();

  }
  handleStopClick() {
    this.setState({
      currentBeat: 0,
      isPlaying: false
    });
  }
  handlePlayClick(){
    this.setState({
      isPlaying:true
    })
    setTimeout(
      () => this.tick(),
      (60 *1000/ this.state.bpm)
    );
  }

  handleBPMChange(e){
    this.setState({
      bpm:parseInt(e.target.value)
    });
  }

  render() {
    return (
      <div>
        <label>BPM: </label><input type="number" onChange={this.handleBPMChange} value={this.state.bpm} min="60" max="1000"></input>
        <Player onStopClick={this.handleStopClick} onPlayClick={this.handlePlayClick}/>

        <SampleSequence name="A" sequence={this.state.noteGrid[0]} sampleIndex={0} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick} />
        <SampleSequence name="B" sequence={this.state.noteGrid[1]} sampleIndex={1} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="C" sequence={this.state.noteGrid[2]} sampleIndex={2} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="D" sequence={this.state.noteGrid[3]} sampleIndex={3} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>

      </div>
    );
  }
}

class Player extends React.Component {
  constructor(props){
    super(props);
    this.handleStopClick = this.handleStopClick.bind(this);
    this.handlePlayClick = this.handlePlayClick.bind(this);

  }
  handleStopClick(e){
    this.props.onStopClick();
  }
  handlePlayClick(e){
    this.props.onPlayClick();
  }
  render() {
    return(
      <div>
        <button title="Play" onClick={this.handlePlayClick}> &#9658; </button>
        <button title="Stop" onClick={this.handleStopClick}> &#9632; </button>
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
