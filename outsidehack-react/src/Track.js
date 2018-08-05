var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var audio_samples = [];
var pre = document.querySelector('pre');
var audio_data_left;
var audio_data_right;
var sample_info_endpoint = 'http://127.0.0.1:5000/trackinfo/';
var samp_rate = 44100;
function snippet(start, stop, source) {
    thisbuffer = audioCtx.createBuffer(2, audioCtx.sampleRate * 5, audioCtx.sampleRate);
    thisbuffer.copyToChannel(audio_data_left.slice(Math.floor(samp_rate*start),Math.floor(samp_rate*stop)), 0);
    thisbuffer.copyToChannel(audio_data_right.slice(Math.floor(samp_rate*start),Math.floor(samp_rate*stop)), 1);
    return thisbuffer;
}
function playsnippet(numb) {
  source = audioCtx.createBufferSource();
  snippet(audio_samples[numb].sampstart, audio_samples[numb].sampend, source);
  source.connect(audioCtx.destination);
  source.start(0);
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getAllIndexes(arr, val) {
    var indexes = [], i = -1;
    while ((i = arr.indexOf(val, i+1)) != -1){
        indexes.push(i);
    }
    return indexes;
}
function getData(url, cb) {
  request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onload = function() {
    var audioData = request.response;
    audioCtx.decodeAudioData(audioData, function(buffer) {
        myBuffer = buffer;
        audio_data_left = myBuffer.getChannelData(0);
        audio_data_right = myBuffer.getChannelData(1);
        console.log(audio_data_left.length);
        samples = [];
        for(i=0;i<30;i++)
        {
            samp = audio_samples[i];
            samples.push(snippet(samp.sampstart, samp.sampend));
        }
        sampdata = {};
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
    url = sample_info_endpoint + trackid;
    request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = function() {
        var trackdata = JSON.parse(request.response);
        getData(trackdata.url, cb);
        trackbpm = trackdata.bpm;
        for(i=0; i<30; i++) {
            beat_number = trackdata.beat_selections[i];
            // getAllIndexes(trackdata.beat_labels, i);
            // beat_number = getRandomInt(0, beats.length-1);
            x = {};
            x.sampstart = trackdata.beat_times[beat_number];
            x.sampend = trackdata.beat_times[beat_number+2];
            audio_samples.push(x);
        }
        console.log(audio_samples);
    }
    request.send();
}
