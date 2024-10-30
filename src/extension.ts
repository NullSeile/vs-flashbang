import * as vscode from 'vscode';
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
	

	let disposable = vscode.commands.registerCommand('vs-flashbang.deploy', () => {
		deployFlashbang(context);
	});
	context.subscriptions.push(disposable);

	setTimeout(() => {
		f(context);
	}, getRandomInterval());
}

export function deactivate() {}
