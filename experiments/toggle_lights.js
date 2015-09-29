var execute = function(args) {
	var bgColor = $('body').css('background-color');
	var textColor = $('body').css('color');

	$('body').css('background-color', textColor);
	$('body').css('color', bgColor);
};