var Console = React.createClass({
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
		})
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
	onChangeDirectory: function(context) {
		this.setState({
			currentDirectory: context.path
		});
	},
	render: function() {
		var consoleLines = this.state.lines.map(function(consoleLine) {
			return (
				<ConsoleLine newLine={ this.newLine } context={ this.getContext(consoleLine.directory) } onChangeDirectory={ this.onChangeDirectory } getObject={ this.getObject }></ConsoleLine>
			);
		}, this);

		return (
			<div>
				{ consoleLines }
			</div>
		);
	},
	componentDidMount: function() {
		this.loadStructureFromServer();
	}
});

var ConsoleLine = React.createClass({
	onEnter: function(userInput) {
		var split = userInput.trim().split(" ");
		var command = split[0];
		var arguments = split.slice(1, split.length);

		switch (command) {
			case "cd":
				var newDir = this.props.context.path;
				if (arguments.length === 0) {
					newDir = "";
				} else {
					var path = arguments[0].trim();
					var obj = this.props.getObject(path, this.props.context);
					if (!obj) {
						this.setState({
							error: true,
							response: ( <p> cd: {path }: No such file or directory</p> )
						});
					} else if (!obj.isDirectory) {
						this.setState({
							error: true,
							response: ( <p> cd: { path }: Not a directory</p> )
						})
					} else {
						this.props.onChangeDirectory(obj);
						newDir = obj.path;
					}
				}

				this.props.newLine(newDir);

				break;
			case "ls":
				var response = this.props.context.contents.map(function(obj) {
					return (<p> { obj.name }</p>);
				});

				this.setState({
					response: response
				});

				this.props.newLine();
				break;
			case "cat":
				var error = false;

				var response = arguments.map(function(arg) {
					var obj = this.props.getObject(arg.trim(), this.props.context);
					if (obj) {
						if (obj.isDirectory) {
							error = true;
							return ( <p>cat: {arg}: Is a directory</p>);
						} else {
							return ( <pre>{ obj.contents }</pre> );
						}
					} else {
						error = true;
						return ( <p>cat: { arg }: No such file or directory</p> );
					}
				}.bind(this));

				this.setState({
					response: response,
					error: error
				});

				this.props.newLine();
				break;
			default:
				var obj = this.props.getObject(command, this.props.context);
				if (obj && obj.isExecutable) {
					eval(obj.contents);
				} else {
					this.setState({
						error: true,
						response: ( <p>{ command }: command not found</p> )
					})
				}

				this.props.newLine();
		}
	},
	render: function() {
		var response;
		if (this.state && this.state.response) {
			response = this.state.response
		}
		return (
			<div>
				<p className="console-line">
				  <ConsolePrompt directory={ this.props.context.path } />
				  &nbsp;
				  <ConsoleCommand onEnter={ this.onEnter } />
				</p>
				{ response }
			</div>
		);
	}
});

var ConsolePrompt = React.createClass({
	render: function() {
		return (
			<span className="console-prompt">tbrushwyler.io{ this.props.directory }$</span>
		);
	}
});

var ConsoleCommand = React.createClass({
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
			<span className="console-command">
				<input className="console-command-input" 
					   ref="_input"
					   onChange={this.handleChange}
					   onKeyUp={this.handleChange}
					   value={this.state.userInput}
					   onBlur={this.focus} />
				<ConsoleCommandText characters={ this.state.userInput.split('') } cursorIndex={ this.state.cursorIndex } focusable={ this.state.focusable } />
			</span>
		);
	},
	componentDidMount: function() {
		this.focus();
	}
});

var ConsoleCommandText = React.createClass({
	render: function() {
		var cursor;
		if (this.props.focusable && this.props.cursorIndex === this.props.characters.length)
			cursor = <span className="console-cursor"></span>

		var characters = this.props.characters.map(function(char, index) {
			return (
				<ConsoleCharacter active={ this.props.focusable && index === this.props.cursorIndex }>{ char }</ConsoleCharacter>
			);
		}, this);

		return (
			<span className="console-command-text">
				{ characters }
				{ cursor }
			</span>
		);
	}
});

var ConsoleCharacter = React.createClass({
	render: function() {
		var className = "char ";
		if (this.props.active)
			className += "active";

		var character = this.props.children;
		if (character === " ")
			character = "&nbsp;"

		return (
			<span className={ className } dangerouslySetInnerHTML={{ __html: character }}></span>
		);
	}
});

React.render(
	<Console structureUrl={ "structure.json" }/>,
	document.getElementById('console')
);