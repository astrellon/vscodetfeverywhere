'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
let spawnCMD = require('spawn-command');
let commandOutput = null;
let filesystemWatcher = null;

class CheckedFiles {
    checkedFiles: object = {};

    constructor() {

    }

    needToCheckoutFile(filename: string) {
        return this.checkedFiles[filename] != null;
    }

    addCheckedFile(filename: string) {
        this.checkedFiles[filename] = true;
    }

    removeCheckedFile(filename: string) {
        delete this.checkedFiles[filename];
    }
}

let checkedFiles = new CheckedFiles();

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    commandOutput = vscode.window.createOutputChannel('Shell');
    context.subscriptions.push(commandOutput);

    filesystemWatcher = vscode.workspace.createFileSystemWatcher("{**/*.js,**/*.cs}");
    filesystemWatcher.onDidChange((e) => {
        //console.log('File changed:', e.fsPath);
        tfCheckout(e.fsPath);
    });
    filesystemWatcher.onDidCreate((e) => {
        vscode.window.showInformationMessage('Add to Tfs?', 'Yes', 'No')
            .then((val) => {
                if (val === 'Yes') {
                    tfAdd(e.fsPath);
                }
            });
    });
    filesystemWatcher.onDidDelete((e) => {
        vscode.window.showInformationMessage('Delete from Tfs?', 'Yes', 'No')
            .then((val) => {
                if (val === 'Yes') {
                    tfDelete(e.fsPath);
                }
            });
    });

    context.subscriptions.push(filesystemWatcher);

    function registerCommand(command: string, callback: (...arg:any []) => any)
    {
        context.subscriptions.push(vscode.commands.registerCommand(command, callback));
    }

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscodetfeverywhere" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    registerCommand('extension.tfCheckout', () => {
        tfCheckout(getCurrentFilename());
    });
    
    registerCommand('extension.tfInfo', () => {
        tfInfo(getCurrentFilename());
    });
    
    registerCommand('extension.tfAdd', () => {
        tfAdd(getCurrentFilename());
    });

    registerCommand('extension.tfUndo', () => {
        tfUndo(getCurrentFilename());
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function getCurrentFilename() {
    return vscode.window.activeTextEditor.document.fileName;
}

function tfCheckout(filename: string) {
    if (checkedFiles.needToCheckoutFile(filename)) {
        checkedFiles.addCheckedFile(filename);

        run(`tf checkout "${filename}"`, '')
            .then(() => {
                vscode.window.showInformationMessage(`Checked out file ${filename}`);
            })
            .catch((reason) => {
                vscode.window.showErrorMessage(`Failed to checkout ${filename} because ${reason}`);
            });
    }
}

function tfDelete(filename: string) {
    // First need to check if the file was added
    tfInfo(filename)
        .then((data:any) => {
            if (data.info == 'add') {
                console.log('Undoing add instead of deleting');
                tfUndo(filename);
                return;
            }

            run(`tf delete ${filename}`, '')
                .then(() => {
                    vscode.window.showInformationMessage(`Deleted file ${filename}`);
                })
                .catch((reason) => {
                    vscode.window.showErrorMessage(`Failed to delete file from TFS because ${reason}`);
                });
        })
        .catch((reason) => {
            vscode.window.showErrorMessage(`Failed to get info for delete file from TFS because ${reason}`);
        })
}

function tfAdd(filename: string) {
    run(`tf add ${filename}`, '')
        .then(() => {
            checkedFiles.addCheckedFile(filename);
            vscode.window.showInformationMessage(`Added file ${filename}`);
        })
        .catch((reason) => {
            vscode.window.showErrorMessage(`Failed to add file to TFS because ${reason}`);
        });
}

function tfUndo(filename: string) {
    run(`tf undo ${filename}`, '')
        .then(() => {
            checkedFiles.removeCheckedFile(filename);
            vscode.window.showInformationMessage(`Undone file ${filename}`);
        })
        .catch((reason) => {
            vscode.window.showErrorMessage(`Failed to undo file to TFS because ${reason}`);
        });
}

function tfInfo(filename: string) {
    return new Promise((accept, reject) => {
        run(`tf info ${filename}`, '', (data) => {
            var output = data.toString();
            if (output.indexOf('Change:') < 0) {
                return;
            }
            var lines = output.split('\n');
            var changeLine = lines.filter(x => {return x.indexOf('Change:') >= 0});
            if  (changeLine.length === 0) {
                reject('Unable to parse tf info response');
                return;
            }
            
            var info = changeLine[0].substr(changeLine[0].indexOf(':') + 1).trim();
            accept({"info": info});
        }).catch((reason) => {
            reject(reason);
        });
    });
}


function run(cmd: string, cwd: string, stdout: Function = null, stderr: Function = null) {
    return new Promise((accept, reject) => {
        var opts: any = {};
        if (vscode.workspace) {
            opts.cwd = cwd;
        }
        process = spawnCMD(cmd, opts);

        function printOutput(data) 
        { 
            console.log('Output [', cmd, ']: ', data.toString());
        }

        process.stdout.on('data', stdout || printOutput);
        process.stderr.on('data', stderr || printOutput);
        process.on('close', (status) => {
            if (status) {
                reject(`Command \`${cmd}\` exited with status code ${status}.`);
            } else {
                accept();
            }
            process = null;
        });
    });
}