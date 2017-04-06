# VSCodeTFEverywhere 

Automatically checkes out files you are writing to, along with asking to add or delete a file from TFS as you add or delete a file.

## Requirements

Currently needs "tf" to be in your PATH variable, will add a setting for changing this later.

This can be downloaded from [here](https://msdn.microsoft.com/en-us/library/hh873092(v=vs.120).aspx)

You currently will still need to map the TF workspace from the command line.

```shell
tf workspace -new -server:<url to your tfs server> '<workspace-name>'
tf workfold -map -workspace:'<workspace-name>' '$/<tfs-path>'
```
## Release Notes

### 0.0.1

Basic support for seeing when files change and to do a checkout, along with asking if a file should be deleted or added to TFS.
