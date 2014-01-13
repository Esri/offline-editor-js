- [x] change the tmp url to avoid needing "loading.php"		**FIXED**
- [x] review init() method of database						**FIXED**
- [x] review base64	encoding								**FIXED**
- [x] test code in https://hacks.mozilla.org/2012/02/storing-images-and-files-in-indexeddb/		**DONE**, doesn't work in Chrome
- [x] show remaining time when downloading
- [x] remove blue border
- [x] show stored tiles
- [x] succesfully tested in Android Chrome v31
- [x] remove ts from URL http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/16/24410/32606?_ts=1386853358867
- [x] test with www.mapabase.es services... tilingScheme is confused with tile levels => no it didn't... I think the problem was the ?_ts thing
- [x] IndexedDB not supported in iOS Safari (see https://developer.mozilla.org/en-US/docs/IndexedDB#Browser_compatibility and https://github.com/axemclion/IndexedDBShim, or http://nparashuram.com/IndexedDBShim/)
- [x] Andy: We may want to look at limiting the tiles to two or three levels to help manage size/performance issues.
	+ limit maxLevel to current zoomLevel + 3 (no problem to include all levels up to level 0, it will be only 1 or 2 tiles per level)
- [x] reorganize code
	+ partially done
	+ better dependency management
- [x] remove unused files (ioWorker, OfflineTileStore)
- [x] test iPad/iPhone **DONE**, it works!
- [x] unit testing
- [x] keep on downloading tiles even if one of them fails
- [x] add message telling that something failed while initing the indexedDB
- [x] update README.md
- [x] save/load to/from csv file
	+ http://www.html5rocks.com/es/tutorials/file/dndfiles/

- [ ] better UI for selecting file to load
	+ drag & drop
	+ test in iPad (save / load)

- [ ] include FileSaver.js and Blob.js as submodules? https://github.com/eligrey/Blob.js and https://github.com/eligrey/FileSaver.js

- [ ] search for CDN included files and bring them to local
- [ ] better tile estimation and limits

- [ ] allow naming caches?
- [ ] more general proxy.php

- [ ] non-rectangular area
