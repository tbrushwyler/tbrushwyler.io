var execute = function(args, errorMessage) {
	if (!args || !args.length) {
		return "Usage: \"alert {message}\"";
	}

	alert(args.join(' '));
};