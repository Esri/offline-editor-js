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

- [ ] better tile estimation and limits
- [ ] Andy: We may want to look at limiting the tiles to two or three levels to help manage size/performance issues.
- [ ] unit testing
- [ ] reorganize code
	+ partially done
	+ better dependency management
- [ ] remove unused files (ioWorker, OfflineTileStore)

- [ ] allow naming caches?
- [ ] test iPad/iPhone
- [ ] more general proxy.php

- [ ] non-rectangular area
