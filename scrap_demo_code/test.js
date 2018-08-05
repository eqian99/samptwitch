
(function( $ ){
'use strict';

///
/// Some global-ish variables.
///
var audioCtx = new( window.AudioContext || window.webkitAudioContext )();
var source = audioCtx.createBufferSource();
var counterNode = audioCtx.createScriptProcessor( 512, 3, 2 );
var sample_position = 0.0;
var sample_rate = 44100.0;
var audio_end = 0.0;
var audio_start = 0.0;



///
/// Some temporary functions for building the audio graph, adjusting parameters, and testing it.
///
/// Connect the slider to control the playback rate.
$( document ).ready(function() {
    var slider = document.getElementById( "playSpeed" );
    slider.oninput = function()
    {
        console.log( this.value );
        source.playbackRate.value = this.value;
    }
});
/// Set the script processor to update the sample position.
counterNode.onaudioprocess = function( e )
{
    var inputBuffer = e.inputBuffer;
    var outputBuffer = e.outputBuffer;

    // Loop through the output channels
    for (var channel = 0; channel < 2; channel++)
    {
        var inputData = outputBuffer.getChannelData(channel).set(inputBuffer.getChannelData(channel), 0);
    }

    var countData = inputBuffer.getChannelData(channel);
    sample_position = countData[0]; // TODO [matthew.mccallum 01.14.17]: This should really grab the position at the end of the buffer to account for at least some of the latency in the audio graph.
}
/// Function for loading in the audio and connecting the audio graph
function LoadAudio() {
    var request = new XMLHttpRequest();
    request.open('GET', '/static/assets/Test.wav', true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        var audioData = request.response;
        audioCtx.decodeAudioData(audioData, function(buffer) {

            // Copy audio into buffer
            source.buffer = audioCtx.createBuffer( buffer.numberOfChannels+1, buffer.length, buffer.sampleRate );
            source.buffer.getChannelData(0).set(buffer.getChannelData(0), 0);
            source.buffer.getChannelData(1).set(buffer.getChannelData(1), 0);

            // Create third counting channel...
            var countData = new Float32Array( buffer.length );
            for( var i=0; i<buffer.length; i++)
            {
                countData[i] = i;
            }
            source.buffer.getChannelData(2).set(countData, 0);

            // Connect audio graph
            source.connect(counterNode);
            counterNode.connect(audioCtx.destination);
            source.start(0);
        },
        function(e){  console.log("Error decoding audio data: " + e.err); });
    }
    request.send();
}



class viewSegment
///
/// A class for holding a portion of the waveform display
///
{

    constructor( time, canvas, load_callback )
    ///
    /// Constructor.
    ///
    /// @param time (float):
    ///     The audio-time in seconds to request the waveform segment for.
    ///
    /// @param canvas (HTLMCanvas):
    ///     The canvas element on which to draw the waveform segment.
    ///
    /// @param load_callback (function):
    ///     A callback to execute once the waveform data has been received from the server.
    ///
    {
        this.canvas = canvas;
        this.div = '#Palette'
        this._load_callback = load_callback;
        if ( typeof( load_callback )==='undefined' ) this._load_callback = function(){}
        this.start_time = 0.0;
        this.end_time = 0.0;
        this.length = 0.0;
        this.image = new Image();
        this.id = '';
        this.absoluteOffset = 0.0;
        this.width = 0.0;

        this.loadImage( time );
    }

    loadImage( time )
    ///
    /// Reads in the image data from the server.
    ///
    /// @param time
    ///     The audio time in seconds to request the waveform segment for.
    ///
    {
        var request = new XMLHttpRequest();
        var time_string = time % 1 == 0 ? time + '.0' : time.toString();
        request.open( 'GET', '/WaveformInfo/'+time_string, true );
        request.responseType = 'json';
        request.parent = this;
        request.onload = function()
        {
            if ( this.status === 200 )
            {
                var data = request.response;
                this.parent.start_time = data['start_bound'];
                this.parent.end_time = data['end_bound'];
                this.parent.image.url = data['url'];
                this.parent.id = 'waveform' + this.parent.start_time;
                this.parent.length = this.parent.end_time - this.parent.start_time;
                this.parent.addToDiv( this.parent.div );
                console.log( 'LOADED IMAGE: ' + this.parent.id );
                this.parent._load_callback( true );
            }
            else
            {
                console.log( 'FAILED TO LOAD IMAGE AT ' + time + ' SECONDS.' );
                this.parent._load_callback( false );
            }

        }
        request.send();
    }

    addToDiv()
    ///
    /// Adds the image to a div element. This is typically done so that we may draw the
    /// image invisibly, and get parameters from the drawn image.
    ///
    {
        $( this.div ).prepend( '<img id=' + this.id + ' src=' + this.image.url + '>' );
        this.image = document.getElementById( this.id );
        this.width = $( '#' + this.id ).width();
    }

    removeFromDiv()
    ///
    /// Removes the image from the div it has previously been added to.
    ///
    {
        // TODO [matthew.mccallum 01.24.18]: This should really check if the image has been added to the div before removing it.
        $( this.div ).remove( $( '#' + this.id ) );
    }

    updateOffset( time )
    ///
    /// Updates the position of the image in the canvas according to a given audio time offset.
    ///
    /// @param time
    ///     The audio-time in seconds to update the image segment's corresponding offset to.
    ///
    {
        var pixels_per_second = this.image.width/this.length;
        var total_offset = this.absoluteOffset + pixels_per_second*( this.start_time - time );// whatever is the correct offset according to time and image width...
        this.canvas.drawImage(this.image, total_offset, 0);
    }
}



class viewSegmentCollection
///
/// An object that manages and stores the waveform segments to be displayed on an HTML canvas.
///
{

    constructor( start_time )
    ///
    /// Constructor.
    ///
    /// @param start_time
    ///     The audio-time in seconds to centre the object's collection of waveform segments
    ///     around. The segment corresponding to this time, the segment after and the segment
    ///     before are loaded.
    ///
    {
        if ( typeof( start_time )==='undefined' ) start_time = 0.0;

        this.before = null;
        this.current = null;
        this.after = null;
        this.leeway = 0.3;  // For hysteresis to stop vicious updating of images when moving back and forth over an image boundary
        this.canvas = document.getElementById('waveformCanvas').getContext('2d');

        var context = this;

        function updateAuxSegments( success )
        {
            console.log( 'using current' )
            if( success )
            {
                console.log(context)
                context.after = new viewSegment( context.current.end_time + 0.01, this.canvas );
                context.before = new viewSegment( context.current.start_time - 0.01, this.canvas );
            }
        }

        this.current = new viewSegment( start_time, this.canvas, updateAuxSegments );
    }

    UpdateForTime( time )
    ///
    /// Update the set of waveform view segments held in this collection to those centered
    /// around the provided time.
    ///
    /// @param time (float):
    ///     The audio-time in seconds to centre the collection of waveform segments held by this
    ///     object around. Currently, there will be one segment at this time, one segment after,
    ///     and one segment before.
    ///
    {
        // Get the new view segment if necessary...
        // TODO [matthew.mccallum 01.14.17]: I need hysteresis here, otherwise, if you scratch around the image boundary, you're going to cause issues.
        if( time > this.current.end_time + this.leeway )
        {
            if ( this.before ) this.before.removeFromDiv();
            this.before = this.current;
            this.current = this.after;
            this.after = new viewSegment( time, this.canvas );
        }
        else if( time < this.current.start_time - this.leeway )
        {
            if ( this.after ) this.after.removeFromDiv();
            this.after = this.current;
            this.current = this.before;
            this.before = new viewSegment( time, this.canvas );
        }

        this.canvas.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if ( this.before && this.before.length ) this.before.updateOffset( time );
        if ( this.current && this.current.length ) this.current.updateOffset( time );
        if ( this.after && this.after.length ) this.after.updateOffset( time );
    }
}



// Just do the couple of things this demo does.
LoadAudio();

var theViewSegments = new viewSegmentCollection( 0.0 );

function updateImage()
{
    requestAnimationFrame( updateImage );
    theViewSegments.UpdateForTime( sample_position/sample_rate );
}

updateImage();

})( jQuery );
