import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import SearchInput, {createFilter} from 'react-search-input';
import Tuna from 'tunajs';

const KEYS_TO_FILTERS = ['artist', 'track']

const context = new AudioContext();
var tuna = new Tuna(context);

const localServer = "http://127.0.0.1:5000";
const remoteServer = "http://35.166.222.57:5000";

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var audio_samples = [];
var pre = document.querySelector('pre');
var audio_data_left;
var audio_data_right;
var sample_info_endpoint = remoteServer + '/trackinfo/';
var samp_rate = 44100;
function snippet(start, stop, source) {
    var thisbuffer = audioCtx.createBuffer(2, audioCtx.sampleRate * 5, audioCtx.sampleRate);
    thisbuffer.copyToChannel(audio_data_left.slice(Math.floor(samp_rate*start),Math.floor(samp_rate*stop)), 0);
    thisbuffer.copyToChannel(audio_data_right.slice(Math.floor(samp_rate*start),Math.floor(samp_rate*stop)), 1);
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
        console.log(audio_data_left.length);
        var samples = [];
        for(var i=0;i<30;i++)
        {
            var samp = audio_samples[i];
            samples.push(snippet(samp.sampstart, samp.sampend));
        }
        var sampdata = {};
        sampdata.bpm = trackbpm;
        sampdata.samples = samples;
        console.log(sampdata);
        cb(sampdata);
      },
      function(e){"Error with decoding audio data" + e.error});
  }
  request.send();
}

function getTrackData(trackid, cb) {
    var url = sample_info_endpoint + trackid;
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = function() {
        var trackdata = JSON.parse(request.response);
        getData(trackdata.url, trackdata.bpm, cb);
        var trackbpm = trackdata.bpm;
        for(var i=0; i<30; i++) {
            var beat_number = trackdata.beat_selections[i];
            var x = {};
            x.sampstart = trackdata.beat_times[beat_number];
            x.sampend = trackdata.beat_times[beat_number+4];
            audio_samples.push(x);
        }
    }
    request.send();
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
    this.handleSearchResultClick = this.handleSearchResultClick.bind(this);
    this.handleLoClick = this.handleLoClick.bind(this);
    this.handleHiClick = this.handleHiClick.bind(this);

    this.state = {
      currentBeat: 0,
      noteGrid: [
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
      ],
      bpm: 120,
      isPlaying: false,
      searchTerm: '',
      library: [],
      loPass: false,
      hiPass: false
    };

    this.loPassFilter = new tuna.Filter({
      frequency: 440, //20 to 22050
      Q: 1, //0.001 to 100
      gain: 0, //-40 to 40 (in decibels)
      filterType: "lowpass", //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
      bypass: 0
    });

    this.sampleURLs = [
      "samples/ashanti.wav",
      "samples/hello.wav",
      "samples/marley_chord_1.wav",
      "samples/marley_chord_2.wav",
      "samples/be_there_crash.wav",
      "samples/hat.wav",
      "samples/mj_snare.wav",
      "samples/thump_kick.wav"
    ];
    this.sampleBuffers = ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""];

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
    console.log("isPlaying: ", this.state.isPlaying);
    if (!this.state.isPlaying){
      return;
    }

    for (var sampleIndex = 0; sampleIndex < this.state.noteGrid.length; sampleIndex++) {
      if (this.state.noteGrid[sampleIndex][this.state.currentBeat] && this.sampleBuffers[sampleIndex]) {
        this.playNote(sampleIndex);
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

  playNote(sampleIndex) {

    var source = context.createBufferSource();
    source.buffer = this.sampleBuffers[sampleIndex];
    var currentLastNode = context.destination;

    if (this.state.loPass) {
      this.loPassFilter.connect(currentLastNode);
      currentLastNode = this.loPassFilter;
    }

    source.connect(currentLastNode);
    source.start();
  }

  componentDidMount() {
    fetch(remoteServer + "/getlibrary")
    .then((response) => {
      console.log("response: ", response);
      return response.json();
    })
    .then((json) => {
      this.setState({
        library:json
      })
    });
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
      source.connect(context.destination);
      source.start();
    }
  }
  handleStopClick() {
    this.setState({
      currentBeat: 0,
      isPlaying: false
    });
  }
  handlePlayClick(){
    console.log("this.state: ", this.state);

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
      bpm:parseInt(e.target.value)
    });
  }

  handleClearClick() {
    var newNoteGrid = [];
    for (var i = 0; i < 16; i++){
      var row = [];
      for (var j = 0; j < 16; j++) {
        row.push(false);
      }
      newNoteGrid.push(row);
    }
    this.setState({
      noteGrid: newNoteGrid
    });
  }
  searchUpdated (term) {
    this.setState({searchTerm: term})
  }

  handleSearchResultClick(trackid){
    let self = this;
    getTrackData(trackid, function(return_data){
      for (var i = 8; i < 16; i++){
        self.sampleBuffers[i] = return_data.samples[i];
      }
      self.setState({
        bpm: return_data.bpm
      })
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
  render() {

    var filteredSearchResults = this.state.library.filter(createFilter(this.state.searchTerm, KEYS_TO_FILTERS))
    if (filteredSearchResults.length == this.state.library.length){
      filteredSearchResults = [];
    }
    filteredSearchResults = filteredSearchResults.slice(0, 5);

    return (
      <div>


        <label>BPM: </label><input type="number" onChange={this.handleBPMChange} value={this.state.bpm} min="60" max="1000"></input>
        <Player onStopClick={this.handleStopClick} onPlayClick={this.handlePlayClick}/>
        <button onClick={this.handleLoClick}><b>LO</b></button>
        <button onClick={this.handleHiClick}><b>HI</b></button>

        <SampleSequence name="A" sequence={this.state.noteGrid[0]} sampleIndex={0} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick} />
        <SampleSequence name="B" sequence={this.state.noteGrid[1]} sampleIndex={1} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="C" sequence={this.state.noteGrid[2]} sampleIndex={2} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="D" sequence={this.state.noteGrid[3]} sampleIndex={3} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="E" sequence={this.state.noteGrid[4]} sampleIndex={4} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick} />
        <SampleSequence name="F" sequence={this.state.noteGrid[5]} sampleIndex={5} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="G" sequence={this.state.noteGrid[6]} sampleIndex={6} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="H" sequence={this.state.noteGrid[7]} sampleIndex={7} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="I" sequence={this.state.noteGrid[8]} sampleIndex={8} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick} />
        <SampleSequence name="J" sequence={this.state.noteGrid[9]} sampleIndex={9} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="K" sequence={this.state.noteGrid[10]} sampleIndex={10} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="L" sequence={this.state.noteGrid[11]} sampleIndex={11} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="M" sequence={this.state.noteGrid[12]} sampleIndex={12} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick} />
        <SampleSequence name="N" sequence={this.state.noteGrid[13]} sampleIndex={13} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="O" sequence={this.state.noteGrid[14]} sampleIndex={14} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>
        <SampleSequence name="P" sequence={this.state.noteGrid[15]} sampleIndex={15} currentBeat={this.state.currentBeat} onSampleClick={this.handleSampleClick} onNoteClick={this.handleNoteClick}/>

        <button onClick={this.handleClearClick}><b>X</b></button>
        <SearchInput className="search-input" onChange={this.searchUpdated} />
        {filteredSearchResults.map(searchResult => {
          return (
            <div key={searchResult.trackid} onClick={()=>{this.handleSearchResultClick(searchResult.trackid)}}>{searchResult.artist} - {searchResult.title}</div>
          )
        })}
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
          isPlaying = true;
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
