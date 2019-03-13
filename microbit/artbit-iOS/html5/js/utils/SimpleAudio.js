/* Paula Bontá 2017 */

////////////////////////////////////////////////////
/// Sound Playing
////////////////////////////////////////////////////

SimpleAudio = function() {};

SimpleAudio.uiSounds ={};
SimpleAudio.isNative = false;

SimpleAudio.defaultSounds=["tap", "delete", "snap"];

SimpleAudio.init = function (isIpad){
	SimpleAudio.isNative = isIpad;
//	console.log (SimpleAudio.isNative);
	if (isIpad) {
 		for (var i=0; i < SimpleAudio.defaultSounds.length; i++) iOS.registerSound("mp3/",  SimpleAudio.defaultSounds[i], "SimpleAudio.addiOSSound");  
 	}
 	else {
 		for (var i=0; i < SimpleAudio.defaultSounds.length; i++) SimpleAudio.addSound("mp3/",SimpleAudio.defaultSounds[i], SimpleAudio.uiSounds);  
 	}
}

SimpleAudio.addSound = function (dir, snd, dict, fcn){
	var audio = document.createElement('audio');
	audio.src = dir+snd+".mp3";
	dict[snd] = audio;
	audio.type="audio/mpeg";
	audio.preload ="auto";
	audio.addEventListener("canplaythrough", done);
	audio.addEventListener("error",  transferFailed);

	function done(e) {
		if (fcn) fcn (snd);
	}
  function transferFailed(e){
    console.log ("Failed Loading", snd, e);
  	e.preventDefault();  e.stopPropagation(); 
  	dict[snd] = undefined;
  	}
}

SimpleAudio.addWAVSound = function (dir, snd, dict, fcn){
	var audio = document.createElement('audio');
	audio.src = dir+snd+".wav";
	dict[snd] = audio;
	audio.type="audio/vnd.wav";
	audio.preload ="auto";
	audio.addEventListener("canplaythrough", done);
	audio.addEventListener("error",  transferFailed);

	function done(e) {
		if (fcn) fcn (snd);
	}
  function transferFailed(e){
    console.log ("Failed Loading", snd, e);
  	e.preventDefault();  e.stopPropagation(); 
  	dict[snd] = undefined;
  	}
}


SimpleAudio.addiOSSound = function(name,dur){
	SimpleAudio.uiSounds[name] = {name: name, duration: dur};
//	console.log (name, dur);
}

SimpleAudio.play = function(name){
	if (SimpleAudio.isNative) iOS.playSndFX(name);
	else {
		if (SimpleAudio.uiSounds[name]) SimpleAudio.uiSounds[name].play();
		else SimpleAudio.init(false);
	}
}


