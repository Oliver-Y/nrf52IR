Translation = function(){}
Translation.lan;
Translation.strings = {}

Translation.setLanguage = function (callback){
	let languages = ['en', 'fr'];
	let lan  = languages.indexOf(iOS.lan) < 0 ? 'en' : iOS.lan;
	//console.log (lan, iOS.lan)
	Translation.loadLanguage (lan, callback);
}

Translation.loadLanguage = function (lan, fcn){
	Translation.lan =  lan;
	iOS.resourceToString("languages/",lan, "txt", doNext)
	function doNext (b64) {
		let str = iOS.b64ToUtf8(b64);	
		Translation.strings = JSON.parse(str);
		if (fcn) fcn(lan);
	}	
}


