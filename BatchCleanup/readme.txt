The file clean.bat is meant to delete .zip files that are the output of the Servir Clip & Ship.  .zip files of the travel time zones are copied from the scratch workspace to c:/inetpub/wwwroot/dnld so users can download them.
This batch file should be set up using windows scheduler to run every day to clean up files older than 1 day.  The file only looks for .zip files.
The batch file relies on FORFILES.  If it isn't already installed on the Windows server, get it here: ftp://ftp.microsoft.com/ResKit/y2kfix/x86/.

For details about usage, see this URL: http://stackoverflow.com/questions/51054/batch-file-to-delete-files-older-than-n-days

10/4/2010 Ryan Whitley