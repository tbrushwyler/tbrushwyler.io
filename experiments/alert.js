var execute = function(args) {
	if (!args || !args.length) {
		return "Usage: \"alert {message}\"";
	}

	alert(args.join(' '));
};