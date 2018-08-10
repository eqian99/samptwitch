import React, { Component } from 'react';
import './App.css';
import SearchInput, {createFilter} from 'react-search-input';
import Tuna from 'tunajs';
import 'bootstrap/dist/css/bootstrap.min.css';

const KEYS_TO_FILTERS = ['artist', 'title']

const context = new AudioContext();
var tuna = new Tuna(context);

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var audio_samples = [];
var audio_data_left;
var audio_data_right;
var samp_rate = 44100;
function snippet(start, stop, source) {
  var samp_start = Math.floor(samp_rate*start);
  var samp_stop = Math.floor(samp_rate*stop);
  var buff_len = samp_stop - samp_start;
  var thisbuffer = audioCtx.createBuffer(2, buff_len, audioCtx.sampleRate);
  thisbuffer.copyToChannel(audio_data_left.slice(samp_start,samp_stop), 0);
  thisbuffer.copyToChannel(audio_data_right.slice(samp_start,samp_stop), 1);
  return thisbuffer;
}

function getData(url, trackbpm, cb) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onload = function() {
    var audioData = request.response;
    audioCtx.decodeAudioData(audioData, function(buffer) {
        var myBuffer = buffer;
        audio_data_left = myBuffer.getChannelData(0);
        audio_data_right = myBuffer.getChannelData(1);
        var samples = [];
        var playspeeds = [];
        for(var i=0;i<30;i++)
        {
          var samp = audio_samples[i];
          samples.push(snippet(samp.sampstart, samp.sampend));
          var expected_beatlength = (60.0/trackbpm);
          var actual_length = (samples[samples.length-1].length)/samp_rate;
          var num_beats = Math.round(actual_length/expected_beatlength);
          var expected_samplelength = num_beats*expected_beatlength;
          playspeeds.push(actual_length/expected_samplelength);
        }
        var sampdata = {};
        sampdata.bpm = trackbpm;
        sampdata.samples = samples;
        sampdata.playspeeds = playspeeds;
        cb(sampdata);
      });
  }
  request.send();
}

function getTrackData(trackid, cb) {
}

class App extends Component {
  constructor(props) {
    super(props);
    this.handleNoteClick = this.handleNoteClick.bind(this);
    this.handleSampleClick = this.handleSampleClick.bind(this);
    this.handleStopClick = this.handleStopClick.bind(this);
    this.handlePlayClick = this.handlePlayClick.bind(this);
    this.handleBPMChange = this.handleBPMChange.bind(this);
    this.handleClearClick = this.handleClearClick.bind(this);
    this.searchUpdated = this.searchUpdated.bind(this)
    this.handleLoClick = this.handleLoClick.bind(this);
    this.handleHiClick = this.handleHiClick.bind(this);
    this.handleReverbClick = this.handleReverbClick.bind(this);
    this.handleDoubleTimeClick = this.handleDoubleTimeClick.bind(this);
    this.handleHalfTimeClick = this.handleHalfTimeClick.bind(this);

    this.state = {
      currentBeat: -1,
      noteGrid: [
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false]
      ],
      bpm: 148,
      lastNote: 0,
      isPlaying: false,
      searchTerm: '',
      library: [],
      loPass: false,
      hiPass: false,
      reverb: false,
      songName: "Search for a song"
    };

    this.effectChains = [];
    for (var i = 0; i < this.state.noteGrid.length; ++i) {
        var loPassFilter = new tuna.Filter({
            frequency: 900, //20 to 22050
            Q: 1, //0.001 to 100
            gain: 0, //-40 to 40 (in decibels)
            filterType: "lowpass", //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
            bypass: 0
        });
        var hiPassFilter = new tuna.Filter({
            frequency: 2000, //20 to 22050
            Q: 1, //0.001 to 100
            gain: 0, //-40 to 40 (in decibels)
            filterType: "highpass", //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
            bypass: 0
        });
        var reverbFilter = (function() {
            var convolver = context.createConvolver(),
                noiseBuffer = context.createBuffer(2, 0.1 * context.sampleRate, context.sampleRate),
                left = noiseBuffer.getChannelData(0),
                right = noiseBuffer.getChannelData(1);
            for (var i = 0; i < noiseBuffer.length; i++) {
                left[i] = Math.random() * 2 - 1;
                right[i] = Math.random() * 2 - 1;
            }
            convolver.buffer = noiseBuffer;
            return convolver;
        })();
        this.effectChains.push([loPassFilter, hiPassFilter, reverbFilter]);
    }

    this.sampleURLs = [
      "samples/you_know.wav",
      "samples/couple_days.wav",
      "samples/so_cold.wav",
      "samples/hat.wav",
      "samples/tom.wav",
      "samples/snare.wav",
      "samples/kick.wav",
      "samples/bass.wav"
    ];
    this.sampleBuffers = ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""];
    this.playSpeeds = [1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0];

    for (var sampleIndex = 0; sampleIndex < this.sampleURLs.length; sampleIndex++) {
      this.loadSample(sampleIndex);
    }
  }

  loadSample(sampleIndex){
    fetch(this.sampleURLs[sampleIndex])
    .then(response => response.arrayBuffer())
    .then(buffer => {
      context.decodeAudioData(buffer, decoded => {
        this.sampleBuffers[sampleIndex] = decoded ;
      }).catch(e => {
        console.log("error: ", e);
      });
    })
    .catch(e => {
      console.log("error: ", e);
    });
  }

  tick() {
    if (!this.state.isPlaying)  {
      return;
    }
    var d = new Date();
    var currTime = d.getTime();
    if ((currTime - this.state.lastNote) > (60 *1000/ this.state.bpm)){
      this.setState({
        currentBeat: (this.state.currentBeat + 1) % 8,
        lastNote: currTime
      });
      for (var sampleIndex = 0; sampleIndex < this.state.noteGrid.length; sampleIndex++) {
        if (this.state.noteGrid[sampleIndex][this.state.currentBeat] && this.sampleBuffers[sampleIndex]) {
          this.playNote(sampleIndex);
        }
      }
    }

    setTimeout(
      () => this.tick(), 0);
  }

  playNote(sampleIndex) {

    var source = context.createBufferSource();
    source.buffer = this.sampleBuffers[sampleIndex];
    // source.playbackRate.value = this.playSpeeds[sampleIndex];
    var currentLastNode = context.destination;

    if (this.state.loPass) {
      this.effectChains[sampleIndex][0].connect(currentLastNode);
      currentLastNode = this.effectChains[sampleIndex][0];
    }
    if (this.state.hiPass) {
        this.effectChains[sampleIndex][1].connect(currentLastNode);
        currentLastNode = this.effectChains[sampleIndex][1];
    }
    if (this.state.reverb) {
        this.effectChains[sampleIndex][2].connect(currentLastNode);
        currentLastNode = this.effectChains[sampleIndex][2];
    }
    source.connect(currentLastNode);
    source.start();
  }

  componentDidMount() {

  }

  handleNoteClick(sampleIndex, currentBeat){

    var newNoteGrid = this.state.noteGrid;
    newNoteGrid[sampleIndex][currentBeat] = !newNoteGrid[sampleIndex][currentBeat];
    this.setState({
      noteGrid: newNoteGrid
    });
  }

  handleSampleClick(sampleIndex){
    if (this.sampleBuffers[sampleIndex]){
      var source = context.createBufferSource();
      source.buffer = this.sampleBuffers[sampleIndex];
      // source.playbackRate.value = this.playSpeeds[sampleIndex];
      source.connect(context.destination);
      source.start();
    }
  }
  handleStopClick() {
    this.setState({
      currentBeat: -1,
      isPlaying: false
    });
  }
  handlePlayClick(){

    if (this.state.isPlaying) { return; }

    this.setState({
      isPlaying:true
    });
    setTimeout(
      () => this.tick(),
      (60 *1000/ this.state.bpm)
    );
  }

  handleBPMChange(e){
    this.setState({
      bpm:parseInt(e.target.value, 10)
    });
  }

  handleClearClick() {
    var newNoteGrid = [];
    for (var i = 0; i < 8; i++){
      var row = [];
      for (var j = 0; j < 8; j++) {
        row.push(false);
      }
      newNoteGrid.push(row);
    }
    this.setState({
      noteGrid: newNoteGrid
    });
  }
  searchUpdated (term) {
    this.setState({
      searchTerm: term,
      isPlaying: false,
      currentBeat: -1
    })
  }

  handleLoClick() {
    this.setState({
      loPass: !this.state.loPass
    });
  }
  handleHiClick() {
    this.setState({
      hiPass: !this.state.hiPass
    });
  }
  handleReverbClick() {
    this.setState({
      reverb: !this.state.reverb
    });
  }
  handleHalfTimeClick() {
    this.setState({
      bpm: this.state.bpm / 2
    });
  }
  handleDoubleTimeClick() {
    this.setState({
      bpm: this.state.bpm * 2
    });
  }
  render() {
    var filteredSearchResults = this.state.library.filter(createFilter(this.state.searchTerm, KEYS_TO_FILTERS))
    if (filteredSearchResults.length === this.state.library.length){
      filteredSearchResults = [];
    }
    filteredSearchResults = filteredSearchResults.slice(0, 7);

    var hiPassButtonStyle = {};
    if (this.state.hiPass){
      hiPassButtonStyle["backgroundColor"] = "#c5bade"
    } else {
      hiPassButtonStyle["backgroundColor"] = "white"
    }

    var loPassButtonStyle = {};
    if (this.state.loPass){
      loPassButtonStyle["backgroundColor"] = "#c5bade"

    } else {
      loPassButtonStyle["backgroundColor"] = "white"
    }

    var reverbButtonStyle = {};
    // reverbButtonStyle["width"] = 40
    if (this.state.reverb){
      reverbButtonStyle["backgroundColor"] = "#c5bade"
    } else {
      reverbButtonStyle["backgroundColor"] = "white"
    }

    var headerStyle = {};
    headerStyle["marginLeft"] = "30px";


    return (
      <div className="container">
        <div className="row top-row">
          <Player onStopClick={this.handleStopClick} onPlayClick={this.handlePlayClick}/>
          <div className="effects">
            <button onClick={this.handleLoClick} style={loPassButtonStyle} data-toggle="button"><b>LO</b></button>
            <button onClick={this.handleHiClick} style={hiPassButtonStyle} data-toggle="button"><b>HI</b></button>
          </div>
        </div>
        <SampleSequence name="A" sequence={this.state.noteGrid[0]} sampleIndex={0} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick} />
        <SampleSequence name="B" sequence={this.state.noteGrid[1]} sampleIndex={1} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="C" sequence={this.state.noteGrid[2]} sampleIndex={2} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="D" sequence={this.state.noteGrid[3]} sampleIndex={3} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="E" sequence={this.state.noteGrid[4]} sampleIndex={4} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick} />
        <SampleSequence name="F" sequence={this.state.noteGrid[5]} sampleIndex={5} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="G" sequence={this.state.noteGrid[6]} sampleIndex={6} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="H" sequence={this.state.noteGrid[7]} sampleIndex={7} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <a href="https://fanlink.to/wake-up">Listen to Wake Up by Doji</a>
        <p>Created by Matt McCallum, Andrew Silverman, Isaac Chien, Emma Qian, </p>
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
      <div className="player" >
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
    this.props.onSampleClick(this.props.sampleIndex);
  }
  render() {
    var buttonStyle = {}
    if (this.props.name < "I") {
      buttonStyle["backgroundColor"] = "#ff9933";
      buttonStyle["borderColor"] = "#604896";

    } else {
      buttonStyle["backgroundColor"] = "#8cc5cc";
      buttonStyle["borderColor"] = "#604896";
    }
    var noteButtonStyle = {}
    if (this.props.name < "I") {
      noteButtonStyle["backgroundColor"] = "#fce5cf";
      noteButtonStyle["borderColor"] = "#604896";

    } else {
      noteButtonStyle["backgroundColor"] = "#cce2e5";
      noteButtonStyle["borderColor"] = "#604896";
    }

    const counts = [0, 1, 2, 3, 4, 5, 6, 7];
    var sampleSequenceJSX = [];
    for(var i = 0; i < this.props.sequence.length; i++) {
        var row = [];
        var count = counts[i];
        var isPlaying = false;
        if (this.props.currentBeat === count){
          isPlaying = true;
        }
        row.push(<Note style={noteButtonStyle} key={count.toString()} sampleIndex={this.props.sampleIndex} isPlaying={isPlaying} isOn={this.props.sequence[i]} onNoteClick={this.handleNoteClick} count={count}>
        </Note>);
        sampleSequenceJSX.push(row);
    }
    return (
      <div className="row">

        <button className="btn-sample" style={buttonStyle} type="button" onClick={() => {this.handleSampleClick(this.props.sampleIndex)}}> {this.props.name} </button>
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
    var styleButton = JSON.parse(JSON.stringify(this.props.style));
    if (this.props.isPlaying) {
      styleButton["backgroundColor"] = "#ff8080";
      styleButton["color"] = "white";

    }
    if (this.props.isOn) {
      styleButton['backgroundColor'] = "#c5bade"
    }

    var text="";
    if (((this.props.count % 4) + 1) === 1) {
      text="\u2022";
    }

    return (
      <button type="button" onClick={this.handleNoteClick} style={styleButton}>{text}</button>
    );

  }

}

export default App;
