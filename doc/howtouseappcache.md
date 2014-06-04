Tips on using application cache
===============================

If you have a requirement to reload your application or restart the browser while offline then you will need to use the [application cache](http://appcachefacts.info/). 

The application cache will allow you to store any file that is required for offline use. The list includes html files, JavaScript libraries, CSS and images. Any file that your application requires to run normally will have to be referenced in the application cache.

###Configuring your web server
Your web server must be able to serve up the MIME TYPE `TEXT/cache-manifest`. 

###Support
Most modern browsers support application cache including IE v10 and v11, Firefox v28+, Chrome v33+, Safari v7+, iOS Safari v3.2+, and Android browser 2.1+. For more detailed info refer to [caniuse.com](http://caniuse.com/#search=appcache).

### References

[Support for application cache](http://caniuse.com/#search=appcache)

[Appcache Facts](http://appcachefacts.info/) 

[Using the application cache - Mozilla Developer Network](https://developer.mozilla.org/en-US/docs/Web/HTML/Using_the_application_cache)