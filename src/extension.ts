import * as vscode from 'vscode';
import axios from 'axios';

const player = require("sound-play");

const min2ms = 60 * 1000;

async function deployFlashbang(context: vscode.ExtensionContext) {
	console.log('Deploying flashbang...');

	const config = vscode.workspace.getConfiguration('vs-flashbang');
	const length = config.get<number>('length')!;

	player.play(vscode.Uri.joinPath(context.extensionUri, 'flashbang.mp3').fsPath);
	await player.play(vscode.Uri.joinPath(context.extensionUri, 'flashbang-dummy.mp3').fsPath, 0.0);

	await vscode.commands.executeCommand('workbench.action.toggleLightDarkThemes');
	
	await new Promise(resolve => setTimeout(resolve, length * 1000));

	await vscode.commands.executeCommand('workbench.action.toggleLightDarkThemes');
}

function getRandomInterval() {
	const config = vscode.workspace.getConfiguration('vs-flashbang');
	const min = config.get<number>('minInterval')! * min2ms;
	const max = config.get<number>('maxInterval')! * min2ms;

	const returnVal = Math.random() * (max - min) + min;
	console.log(`Flashbang random interval: ${returnVal}`);
	return returnVal;
}

async function f(context: vscode.ExtensionContext) {
	await deployFlashbang(context);
	setTimeout(() => {
		f(context);
	}, getRandomInterval());
}

export function activate(context: vscode.ExtensionContext) {
	
	context.subscriptions.push(vscode.commands.registerCommand('vs-flashbang.register', () => {
		// Ask for username
		vscode.window.showInputBox({
			prompt: 'Enter your username',
			placeHolder: 'Username'
		}).then((username) => {
			// Ask for display name
			vscode.window.showInputBox({
				prompt: 'Enter your display name',
				placeHolder: 'Display name'
			}).then((displayname) => {
				
				const config = vscode.workspace.getConfiguration('vs-flashbang');
				const apiUrl = config.get<string>('apiUrl');

				axios.get(`${apiUrl}/register?username=${username}&displayname=${displayname}`).then((response) => {
					console.log(response.data);
				}).catch((error) => {
					console.error(error);

					vscode.window.showErrorMessage(`Failed to register user ${username}: ${error}`);
				});
			});
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vs-flashbang.login', () => {
		// Ask for username
		vscode.window.showInputBox({
			prompt: 'Enter your username',
			placeHolder: 'Username'
		}).then((username) => {
			// Store the username
			const config = vscode.workspace.getConfiguration('vs-flashbang');
			config.update('username', username, vscode.ConfigurationTarget.Global);
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vs-flashbang.send', () => {
		// Ask for username
		vscode.window.showInputBox({
			prompt: 'Enter the username of the recipient',
			placeHolder: 'Username'
		}).then((username) => {
			// Ask for message
			vscode.window.showInputBox({
				prompt: 'Enter the message',
				placeHolder: 'Message'
			}).then((message) => {
				// Send flashbang
				const config = vscode.workspace.getConfiguration('vs-flashbang');
				let sender = config.get<string>('username');
				const apiUrl = config.get<string>('apiUrl');

				if (!sender) {
					vscode.window.showErrorMessage('You must be logged in to send a flashbang');
					return;
				}

				message = encodeURIComponent(message!);
				username = encodeURIComponent(username!);
				sender = encodeURIComponent(sender!);

				axios.get(`${apiUrl}/send?sender=${sender}&receiver=${username}&message=${message}`).then((response) => {
					console.log(response.data);
				}).catch((error) => {
					console.error(error);
					vscode.window.showErrorMessage(`Failed to send flashbang to ${username}: ${error}`);
				});
			});
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vs-flashbang.deploy', () => {
		deployFlashbang(context);
	}));

	setTimeout(() => {
		f(context);
	}, getRandomInterval());

	setInterval(async () => {
		const config = vscode.workspace.getConfiguration('vs-flashbang');
		const username = config.get<string>('username');
		const apiUrl = config.get<string>('apiUrl');

		if (!username || !apiUrl) {
			return;
		}

		const result = await axios.get(`${apiUrl}/get_unread?username=${username}`);
		console.log(result.data);
		const messages = result.data.messages;
		for (const flashbang of messages) {
			console.log(flashbang);
			const message = flashbang.message;
			const sender = flashbang.displayname;
			vscode.window.showInformationMessage(`${sender}: ${message}`);
			await deployFlashbang(context);
		}
	}, 2000);
}

export function deactivate() {}
