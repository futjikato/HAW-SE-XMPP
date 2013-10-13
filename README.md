HAW-SE-XMPP
===========

Building the app
------------

1. [Download node-webkit binaries](https://github.com/rogerwang/node-webkit#downloads)
1. [Install nodejs](http://nodejs.org/download/)
1. Install bower ( ``` npm install -g bower ``` )
1. Run ``` bower install ```
1. Run ``` npm install ```
1. Run ``` ./build.sh ```

Now the app.nw file is generated and must be copied into the node-webkit application.<br>
How this is done depends on your OS.<br>
After the initial installation you only need to run the build.sh script again to generate an updated app.nw file.

OSX
---

In the downloaded node-webkit binaries is and node-webkit.app. Right click an open the package. A new finder window will open up with the content of the .app file.<br>
Copy the generated app.nw into the `Contents/Resource`  directory within the node-webkit.app Package.<br>
Now start the node-webkit.app normally.

Windows
-------

Building the app.nw with 7-zip: ``` 7z.exe a -tzip app.nw * -r ```<br>
Start nw.exe via cmd ``` nw.exe <path to app.nw> ``` or drag ``` app.nw ``` to ``` nw.exe ``` to open it.

Linux
-----

TODO
Build on Linux and write documentation