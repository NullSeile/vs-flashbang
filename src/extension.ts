import * as vscode from 'vscode';
import axios from 'axios';

const player = require("play-sound")({});

const min2ms = 60 * 1000;

async function deployFlashbang(context: vscode.ExtensionContext) {
    console.log('Deploying flashbang...');

    const config = vscode.workspace.getConfiguration('vs-flashbang');
    const length = config.get<number>('length')!;

    player.play(vscode.Uri.joinPath(context.extensionUri, 'flashbang.mp3').fsPath);

    await new Promise(resolve => setTimeout(resolve, 1400));

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
    if (vscode.window.state.focused) {
        await deployFlashbang(context);
    }

    setTimeout(() => {
        f(context);
    }, getRandomInterval());
}


function sendFlashbang(username: string, message: string) {

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
}

class UserQuickPickItem implements vscode.QuickPickItem {
    label: string;
    description: string;
    username: string;

    constructor(username: string, displayname: string, active: boolean) {
        this.username = username;
        this.label = `${displayname} (${username})`;
        this.description = active ? 'Active' : '';
    }
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('vs-flashbang.register', () => {
        // Ask for username
        vscode.window.showInputBox({
            prompt: 'Enter your username',
            placeHolder: 'Username'
        }).then((username) => {
            if (!username) {
                return;
            }
            // Ask for display name
            vscode.window.showInputBox({
                prompt: 'Enter your display name',
                placeHolder: 'Display name'
            }).then((displayname) => {
                if (!displayname) {
                    vscode.window.showErrorMessage('Display name is required');
                    return;
                }

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
            if (!username) {
                return;
            }
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
            if (!username) {
                return;
            }
            // Ask for message
            vscode.window.showInputBox({
                prompt: 'Enter the message',
                placeHolder: 'Message'
            }).then((message) => {
                if (!message) {
                    return;
                }
                sendFlashbang(username!, message!);
            });
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand('vs-flashbang.active-users', () => {
        const config = vscode.workspace.getConfiguration('vs-flashbang');
        const apiUrl = config.get<string>('apiUrl');

        axios.get(`${apiUrl}/get_users_active`).then((response) => {
            console.log(response.data);
            let users = response.data.users;

            const items: UserQuickPickItem[] = users.sort((u1: any, u2: any) => {
                // Sort by active status then by username
                if (u1.active && !u2.active) {
                    return -1;
                } else if (!u1.active && u2.active) {
                    return 1;
                } else {
                    return u1.username.localeCompare(u2.username);
                }
            }).map((user: any) => {
                return new UserQuickPickItem(user.username, user.displayname, user.active);
            });

            vscode.window.showQuickPick(items).then((selectedUser) => {
                if (!selectedUser) {
                    return;
                }

                const username = selectedUser.username;

                vscode.window.showInputBox({
                    prompt: 'Enter the message',
                    placeHolder: 'Message'
                }).then((message) => {
                    if (!message) {
                        return;
                    }
                    sendFlashbang(username, message!);
                });
            });

        }).catch((error) => {
            console.error(error);
            vscode.window.showErrorMessage(`Failed to get active users: ${error}`);
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

        const recieveWhenUnfocused = config.get<boolean>('recieveWhenUnfocused');
        if (!recieveWhenUnfocused && !vscode.window.state.focused) {
            return;
        }

        const recieveWhenNotActive = config.get<boolean>('recieveWhenNotActive');
        if (!recieveWhenNotActive && !vscode.window.state.active) {
            return;
        }

        const username = config.get<string>('username');
        const apiUrl = config.get<string>('apiUrl');

        if (!username || !apiUrl) {
            return;
        }

        const result = await axios.get(`${apiUrl}/get_unread?username=${username}`);
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

export function deactivate() { }
