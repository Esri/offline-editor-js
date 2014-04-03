"use strict"

define([], function()
{
	var AttachmentStore = function()
	{

		this.isSupported = function()
		{
			return true;
		}

		this.init = function()
		{
			console.log("init AttachmentStore");
		}

		/* what should the API be? */

		// add new attachment to new feature
		// add new attachment to existing feature
		// delete new attachment from feature
		// delete existing attachment (how do we know about it if we are offline?)
		// get attachments of a feature (only those that we know about it)

		this.add = function(attachmentId, attachmentFile)
		{
		}

		this.get = function(attachmentId)
		{
		}

		this.delete = function(attachmentId)
		{
		}
	};
	return AttachmentStore;
})
