<?php
  /***************************************************************************
   * USAGE
   * [1] http://<this-proxy-url>?<arcgis-service-url>
   * [2] http://<this-proxy-url>?<arcgis-service-url> (with POST body)
   * [3] http://<this-proxy-url>?<arcgis-service-url>?token=ABCDEFGH
   * 
   * note: [3] is used when fetching tiles from a secured service and the 
   * JavaScript app sends the token instead of being set in this proxy
   * 
   * REQUIREMENTS
   *  - cURL extension for PHP must be installed and loaded. To load it, 
   *    add the following lines to your php.ini file:
   *     extension_dir = "<your-php-install-location>/ext"
   *     extension = php_curl.dll
   *     
   *  - Turn OFF magic quotes for incoming GET/POST data: add/modify the
   *    following line to your php.ini file:
   *     magic_quotes_gpc = Off 
   * 
   ***************************************************************************/

  /***************************************************************************
   * <true> to only proxy to the sites listed in '$serverUrls'
   * <false> to proxy to any site (are you sure you want to do this?)
   */
  $mustMatch = true;
  
  /***************************************************************************
   * ArcGIS Server services this proxy will forward requests to
   * 
   * 'url'      = location of the ArcGIS Server, either specific URL or stem
   * 'matchAll' = <true> to forward any request beginning with the URL
   *              <false> to forward only the request that exactly matches the url
   * 'token'    = token to include for secured service, if any, otherwise leave it
   *              empty
   */
  $serverUrls = array(
    array( 'url' => 'http://tiles1.arcgis.com/tiles/', 'matchAll' => true, 'token' => '' ),
    array( 'url' => 'http://tiles2.arcgis.com/tiles/', 'matchAll' => true, 'token' => '' ),
    array( 'url' => 'http://tiles3.arcgis.com/tiles/', 'matchAll' => true, 'token' => '' ),
    array( 'url' => 'http://tiles4.arcgis.com/tiles/', 'matchAll' => true, 'token' => '' ),
    array( 'url' => 'http://www.mapabase.es/ArcGIS/', 'matchAll' => true, 'token' => '' ),
    array( 'url' => 'http://server.arcgisonline.com/ArcGIS/rest/services/', 'matchAll' => true, 'token' => '' ),
    array( 'url' => 'http://services.arcgisonline.com/ArcGIS/rest/services/', 'matchAll' => true, 'token' => '' ),
    array( 'url' => 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/', 'matchAll' => true, 'token' => '' ),
    array( 'url' => 'http://sampleserver2.arcgisonline.com/ArcGIS/rest/services/', 'matchAll' => true, 'token' => '' ),
    array( 'url' => 'http://sampleserver5.arcgisonline.com/ArcGIS/rest/services/', 'matchAll' => true, 'token' => '' ),
    array( 'url' => 'http://sampleserver1a.arcgisonline.com/arcgisoutput/',        'matchAll' => true, 'token' => '' ),
    array( 'url' => 'http://sampleserver1b.arcgisonline.com/arcgisoutput/',        'matchAll' => true, 'token' => '' ),
    array( 'url' => 'http://sampleserver1c.arcgisonline.com/arcgisoutput/',        'matchAll' => true, 'token' => '' )
  );
  /***************************************************************************/
  
  function is_url_allowed($allowedServers, $url) {
    $isOk = false;
    $url = trim($url, "\/");
    for ($i = 0, $len = count($allowedServers); $i < $len; $i++) {
      $value = $allowedServers[$i];
      $allowedUrl = trim($value['url'], "\/");
      if ($value['matchAll']) {
        if (stripos($url, $allowedUrl) === 0) {
          $isOk = $i; // array index that matched
          break;
        }
      }
      else {
        if ((strcasecmp($url, $allowedUrl) == 0)) {
          $isOk = $i; // array index that matched
          break;
        }
      }
    }
    return $isOk;
  }
  
  // check if the curl extension is loaded
  if (!extension_loaded("curl")) {
    header('Status: 500', true, 500);
    echo 'cURL extension for PHP is not loaded! <br/> Add the following lines to your php.ini file: <br/> extension_dir = &quot;&lt;your-php-install-location&gt;/ext&quot; <br/> extension = php_curl.dll';
    return;
  }
  
  $targetUrl = $_SERVER['QUERY_STRING'];
  if (!$targetUrl) {
    header('Status: 400', true, 400); // Bad Request
    echo 'Target URL is not specified! <br/> Usage: <br/> http://&lt;this-proxy-url&gt;?&lt;target-url&gt;';
    return;
  }
  
  $parts = preg_split("/\?/", $targetUrl);
  $targetPath = $parts[0];
  
  // check if the request URL matches any of the allowed URLs
  if ($mustMatch) {
    $pos = is_url_allowed($serverUrls, $targetPath);
    if ($pos === false) {
      header('Status: 403', true, 403); // Forbidden
      echo 'Target URL is not allowed! <br/> Consult the documentation for this proxy to add the target URL to its Whitelist.';
      return;
    }
  }
  
  // add token (if any) to the url
  $token = $serverUrls[$pos]['token'];
  if ($token) {
    $targetUrl .= (stripos($targetUrl, "?") !== false ? '&' : '?').'token='.$token;
  }
  
  // open the curl session
  $session = curl_init();
  
  // set the appropriate options for this request
  $options = array(
    CURLOPT_URL => $targetUrl,
    CURLOPT_HEADER => false,
    CURLOPT_HTTPHEADER => array(
      'Content-Type: ' . $_SERVER['CONTENT_TYPE'],
      'Referer: ' . $_SERVER['HTTP_REFERER']
    ),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true
  );
  
  // put the POST data in the request body
  $postData = file_get_contents("php://input");
  if (strlen($postData) > 0) {
    $options[CURLOPT_POST] = true;
    $options[CURLOPT_POSTFIELDS] = $postData;
  }
  curl_setopt_array($session, $options);
  
  // make the call
  $response = curl_exec($session);
  $code = curl_getinfo($session, CURLINFO_HTTP_CODE);
  $type = curl_getinfo($session, CURLINFO_CONTENT_TYPE);
  curl_close($session);
  
  // set the proper Content-Type
  header("Status: ".$code, true, $code);
  header("Content-Type: ".$type);
  
  echo $response;
?>
