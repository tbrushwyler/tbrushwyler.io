var Console = React.createClass({displayName: "Console",
	loadStructureFromServer: function() {
		$.ajax({
			url: this.props.structureUrl,
			dataType: 'json',
			success: function(data) {
				var lines = this.state.lines;
				lines.push({directory: ''});

				this.setState({
					lines: lines,
					structure: data
				});
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.structureUrl, status, err.toString());
			}.bind(this)
		});
	},
	getInitialState: function() {
		return { 
			lines: [],
			currentDirectory: ''
		};
	},
	getContext: function(path, baseContext) {
		return this.getObject(path, baseContext);
	},
	getObject: function(path, baseContext) {
		var context = baseContext || this.state.structure;
		var directories = path.trim().split("/");
		for (var i = 0; i < directories.length; i++) {
			var dir = directories[i];
			if (dir === "")
				continue;

			if (!context.isDirectory)
				return false;

			if (dir === "..") {
				var index = context.path.lastIndexOf("/");
				if (index < 0)
					return false;

				// go up a level and continue
				context = this.getObject(context.path.substring(0, index));
				continue;
			}

			var containsObject = context.contents.some(function(el, i) {
				return el.name === dir ? ((context = el), true) : false;
			});

			if (!context || !containsObject)
				return false;
		}

		return context;
	},
	newLine: function(path) {
		if (path !== "" && !path)
			path = this.state.currentDirectory;

		var lines = this.state.lines;
		lines.push({
			directory: path
		});

		this.setState({
			lines: lines
		});
	},
	clear: function() {
		this.setState({
			lines: [
				{ directory: this.state.currentDirectory }
			]
		});
	},
	onChangeDirectory: function(context) {
		this.setState({
			currentDirectory: context.path
		});
	},
	render: function() {
		var consoleLines = this.state.lines.map(function(consoleLine) {
			return (
				React.createElement(ConsoleLine, {newLine:  this.newLine, context:  this.getContext(consoleLine.directory), onChangeDirectory:  this.onChangeDirectory, getObject:  this.getObject, clear:  this.clear})
			);
		}, this);

		return (
			React.createElement("div", null, 
				 consoleLines 
			)
		);
	},
	componentDidMount: function() {
		this.loadStructureFromServer();
	}
});

var ConsoleLine = React.createClass({displayName: "ConsoleLine",
	onEnter: function(userInput) {
		var commands = [];
		if (Cookies.get('commands')) {
			commands = JSON.parse(Cookies.get('commands'));
		}
		commands.push(userInput);

		Cookies.set('commands', commands);

		var split = userInput.trim().split(" ");
		var command = split[0];
		var args = split.slice(1, split.length);

		switch (command) {
			case "help":
				this.setState({
					response: ( React.createElement("div", null, 
									React.createElement("p", null, " help: available commands: cd, ls, cat "), 
									React.createElement("p", null, "Some things to try:"), 
									React.createElement("p", null, "  - cat about.md"), 
									React.createElement("p", null, "  - experiments/toggle_lights")
								) )
				})

				this.props.newLine();

				break;
			case "cd":
				var newDir = this.props.context.path;
				if (args.length === 0) {
					newDir = "";
				} else {
					var path = args[0].trim();
					var obj = this.props.getObject(path, this.props.context);
					if (!obj) {
						this.setState({
							error: true,
							response: ( React.createElement("p", null, " cd: ", path, ": No such file or directory") )
						});
					} else if (!obj.isDirectory) {
						this.setState({
							error: true,
							response: ( React.createElement("p", null, " cd: ",  path, ": Not a directory") )
						})
					} else {
						this.props.onChangeDirectory(obj);
						newDir = obj.path;
					}
				}

				this.props.newLine(newDir);

				break;
			case "ls":
				var response = [];
				if (args && args.length) {
					for (var i = 0; i < args.length; i++) {
						var path = args[i].trim();
						if (path.indexOf('-') || path.indexOf('-') > 1) {
							if (i > 0) {
								response.push((React.createElement("p", null, " ")));
							}

							var obj = this.props.getObject(path, this.props.context);
							if (!obj) {
								response.push(( React.createElement("p", null, " ",  command, ": ",  path, ": No such file or directory ") ));
							} else if (obj.isDirectory) {
								if (args.length > 1) {
									response.push((React.createElement("p", null, obj.name, ":")));
								}

								response = response.concat(obj.contents.map(function(sub) {
									return (React.createElement("p", null, " ",  sub.name, " "));
								}));
							} else {
								response.push((React.createElement("p", null, " ",  obj.name, " ")));
							}
						}
					}
				} else {
					response = response.concat(this.props.context.contents.map(function(sub) {
						return (React.createElement("p", null, " ",  sub.name, " "));
					}));
				}

				this.setState({
					response: response
				});

				this.props.newLine();
				break;
			case "cat":
				var error = false;

				var response = args.map(function(arg) {
					var obj = this.props.getObject(arg.trim(), this.props.context);
					if (obj) {
						if (obj.isDirectory) {
							error = true;
							return ( React.createElement("p", null, "cat: ", arg, ": Is a directory"));
						} else {
							if (obj.contents) {
								return ( React.createElement("pre", null,  obj.contents) );
							} else {
								var response = $.ajax({
									url: obj.url,
									async: false,
									success: function(data, status, xhr) {
										return ( React.createElement("pre", null,  xhr.responseText) );
									}.bind(this),
									error: function(xhr, status, err) {
										console.error(obj.url, status, err.toString());

										return ( React.createElement("p", null,  command, ": ",  err.toString() ) );
									}.bind(this)
								});

								return (React.createElement("pre", null,  response.responseText));
							}
						}
					} else {
						error = true;
						return ( React.createElement("p", null,  command, ": ",  arg, ": No such file or directory") );
					}
				}.bind(this));

				this.setState({
					response: response,
					error: error
				});

				this.props.newLine();
				break;
			case "clear":
				this.props.clear();
				break;
			default:
				var app = command;
				if (app.indexOf(".app") < 0)
					app += ".app";

				var obj = this.props.getObject(app, this.props.context);
				if (obj && obj.isExecutable) {
					if (obj.contents) {
						eval(obj.contents);
						this.props.newLine();
					} else {
						$.ajax({
							url: obj.url,
							success: function(data) {
								var errorMessage = eval("execute(args)");
								if (errorMessage) {
									this.setState({
										error: true,
										response: ( React.createElement("p", null,  command, ": ",  errorMessage ) )
									});
								}

								this.props.newLine();
							}.bind(this),
							error: function(xhr, status, err) {
								console.error(obj.url, status, err.toString());

								this.setState({
									error: true,
									response: ( React.createElement("p", null,  command, ": ",  err.toString() ) )
								});

								this.props.newLine();
							}.bind(this)
						});
					}
				} else {
					this.setState({
						error: true,
						response: ( React.createElement("p", null,  command, ": command not found") )
					});

					this.props.newLine();
				}
		}
	},
	render: function() {
		var response;
		if (this.state && this.state.response) {
			response = this.state.response
		}
		return (
			React.createElement("div", null, 
				React.createElement("p", {className: "console-line"}, 
				  React.createElement(ConsolePrompt, {directory:  this.props.context.path}), 
				  " ", 
				  React.createElement(ConsoleCommand, {onEnter:  this.onEnter})
				), 
				 response 
			)
		);
	}
});

var ConsolePrompt = React.createClass({displayName: "ConsolePrompt",
	render: function() {
		return (
			React.createElement("span", {className: "console-prompt"}, "tbrushwyler.io",  this.props.directory, "$")
		);
	}
});

var ConsoleCommand = React.createClass({displayName: "ConsoleCommand",
	getInitialState: function() {
		return {
			userInput: '',
			cursorIndex: 0,
			focusable: true
		};
	},
	handleChange: function(e) {
		var cursorIndex = e.target.selectionStart;
		var userInput = e.target.value;

		if (e.keyCode === 38 || e.keyCode == 40) {
			// up or down arrow, respectively
			var commands = [];
			if (Cookies.get('commands')) {
				commands = JSON.parse(Cookies.get('commands'));
			}

			var index = this.state.index;
			if (typeof index === 'undefined')
				index = commands.length;
			index += (e.keyCode - 39);

			if (index < 0)
				index = 0;
			if (index >= commands.length)
				index = commands.length;

			this.setState({ index: index });
			if (index < commands.length)
				userInput = commands[index];
			else
				userInput = '';
		}

		var enterPushed = e.keyCode === 13;

		this.setState({
			userInput: userInput,
			cursorIndex: cursorIndex,
			focusable: this.state.focusable && !enterPushed
		});

		if (enterPushed) {
			this.props.onEnter(userInput);
			React.findDOMNode(this.refs._input).blur();
		}
	},
	focus: function() {
		if (this.state.focusable)
			React.findDOMNode(this.refs._input).focus();
	},
	render: function() {
		return (
			React.createElement("span", {className: "console-command"}, 
				React.createElement("input", {className: "console-command-input", 
					   ref: "_input", 
					   onChange: this.handleChange, 
					   onKeyUp: this.handleChange, 
					   value: this.state.userInput, 
					   onBlur: this.focus}), 
				React.createElement(ConsoleCommandText, {characters:  this.state.userInput.split(''), cursorIndex:  this.state.cursorIndex, focusable:  this.state.focusable})
			)
		);
	},
	componentDidMount: function() {
		this.focus();
	}
});

var ConsoleCommandText = React.createClass({displayName: "ConsoleCommandText",
	render: function() {
		var cursor;
		if (this.props.focusable && this.props.cursorIndex === this.props.characters.length)
			cursor = React.createElement("span", {className: "console-cursor"})

		var characters = this.props.characters.map(function(char, index) {
			return (
				React.createElement(ConsoleCharacter, {active:  this.props.focusable && index === this.props.cursorIndex},  char )
			);
		}, this);

		return (
			React.createElement("span", {className: "console-command-text"}, 
				 characters, 
				 cursor 
			)
		);
	}
});

var ConsoleCharacter = React.createClass({displayName: "ConsoleCharacter",
	render: function() {
		var className = "char ";
		if (this.props.active)
			className += "active";

		var character = this.props.children;
		if (character === " ")
			character = "&nbsp;"

		return (
			React.createElement("span", {className:  className, dangerouslySetInnerHTML: { __html: character}})
		);
	}
});

React.render(
	React.createElement(Console, {structureUrl:  "structure.json" }),
	document.getElementById('console')
);
