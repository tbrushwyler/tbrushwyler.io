var Console = React.createClass({
	getInitialState: function() {
		return { 
			data: [{ directory: '' }],
			currentDirectory: ''
		};
	},
	onDefault: function() {
		var data = this.state.data;
		data.push({
			directory: this.state.currentDirectory
		});

		this.setState({
			data: data
		});
	},
	onChangeDirectory: function(directory) {
		this.setState({
			currentDirectory: directory
		});

		var data = this.state.data;
		data.push({
			directory: directory
		});

		this.setState({
			data: data
		});
	},
	render: function() {
		var consoleLines = this.state.data.map(function(consoleLine) {
			return (
				<ConsoleLine directory={consoleLine.directory} onDefault={ this.onDefault } onChangeDirectory={ this.onChangeDirectory }></ConsoleLine>
			);
		}, this);

		return (
			<div>
				{ consoleLines }
			</div>
		);
	}
});

var ConsoleLine = React.createClass({
	onEnter: function(userInput) {
		var split = userInput.trim().split(" ");
		var command = split[0];
		var arguments = split.slice(1, split.length);

		var directory = this.props.directory;
		switch (command) {
			case "cd":
				if (arguments.length === 0) {
					directory = "";
				} else {
					var gotos = arguments[0].trim().split("/");
					for (var i = 0; i < gotos.length; i++) {
						var gotoFolder = gotos[i];
						if (gotoFolder === "..") {
							if (directory.indexOf("/") >= 0) {
								directory = directory.substring(0, directory.lastIndexOf("/"));
							}
						} else {
							directory += "/" + gotoFolder;
						}
					}
				}
				
				this.props.onChangeDirectory(directory);

				break;
			default:
				this.props.onDefault();
		}
	},
	render: function() {
		return (
			<p className="console-line">
			  <ConsolePrompt directory={ this.props.directory } />
			  &nbsp;
			  <ConsoleCommand onEnter={ this.onEnter } />
			</p>
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
	<Console />,
	document.getElementById('console')
);