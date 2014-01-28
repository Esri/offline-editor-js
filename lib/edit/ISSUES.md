- complete offline editing workflow
	- updates: OK
	- adds: OK
	- deletes: OK
- change pushEdit() to pushEdits(), NO
- control QuotaError error gracefully, OK
- try and fill localStorage to see what happens... OK, localStorage.setItem() throws error
- prevent attributeEditor to appear after replaying the stored edits, OK
- rename offlineFeatureService to offlineFeaturesManager, OK
- be careful with updates for features added offline (replace tmp id by final id), ONGOING
	- updates/deletes of features added offline (not yet in the server) are not updated correctly in the local layer

- goOnline()/goOffline() automatically
- unit tests
- feedback graphics layer
- add timestamp to edits
- undo
- attachments

- store the original layers in localStorage?
