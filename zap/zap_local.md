# ZAP Scanning Report

ZAP by [Checkmarx](https://checkmarx.com/).


## Summary of Alerts

| Risk Level | Number of Alerts |
| --- | --- |
| High | 0 |
| Medium | 1 |
| Low | 3 |
| Informational | 1 |




## Insights

| Level | Reason | Site | Description | Statistic |
| --- | --- | --- | --- | --- |
| Info | Informational | http://localhost:8080 | Percentage of responses with status code 4xx | 100 % |
| Info | Informational | http://localhost:8080 | Percentage of endpoints with content type text/html | 100 % |
| Info | Informational | http://localhost:8080 | Percentage of endpoints with method GET | 100 % |
| Info | Informational | http://localhost:8080 | Count of total endpoints | 6    |







## Alerts

| Name | Risk Level | Number of Instances |
| --- | --- | --- |
| Content Security Policy (CSP) Header Not Set | Medium | Systemic |
| In Page Banner Information Leak | Low | Systemic |
| Permissions Policy Header Not Set | Low | Systemic |
| Server Leaks Version Information via "Server" HTTP Response Header Field | Low | Systemic |
| Storable and Cacheable Content | Informational | Systemic |




## Alert Detail



### [ Content Security Policy (CSP) Header Not Set ](https://www.zaproxy.org/docs/alerts/10038/)



##### Medium (High)

### Description

Content Security Policy (CSP) is an added layer of security that helps to detect and mitigate certain types of attacks, including Cross Site Scripting (XSS) and data injection attacks. These attacks are used for everything from data theft to site defacement or distribution of malware. CSP provides a set of standard HTTP headers that allow website owners to declare approved sources of content that browsers should be allowed to load on that page — covered types are JavaScript, CSS, HTML frames, fonts, images and embeddable objects such as Java applets, ActiveX, audio and video files.

* URL: http://localhost:8080/
  * Node Name: `http://localhost:8080/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: http://localhost:8080/casa_campo/
  * Node Name: `http://localhost:8080/casa_campo/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: http://localhost:8080/robots.txt
  * Node Name: `http://localhost:8080/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: http://localhost:8080/sitemap.xml
  * Node Name: `http://localhost:8080/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``

Instances: Systemic


### Solution

Ensure that your web server, application server, load balancer, etc. is configured to set the Content-Security-Policy header.

### Reference


* [ https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
* [ https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html ](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
* [ https://www.w3.org/TR/CSP/ ](https://www.w3.org/TR/CSP/)
* [ https://w3c.github.io/webappsec-csp/ ](https://w3c.github.io/webappsec-csp/)
* [ https://web.dev/articles/csp ](https://web.dev/articles/csp)
* [ https://caniuse.com/#feat=contentsecuritypolicy ](https://caniuse.com/#feat=contentsecuritypolicy)
* [ https://content-security-policy.com/ ](https://content-security-policy.com/)


#### CWE Id: [ 693 ](https://cwe.mitre.org/data/definitions/693.html)


#### WASC Id: 15

#### Source ID: 3

### [ In Page Banner Information Leak ](https://www.zaproxy.org/docs/alerts/10009/)



##### Low (High)

### Description

The server returned a version banner string in the response content. Such information leaks may allow attackers to further target specific issues impacting the product and version in use.

* URL: http://localhost:8080/
  * Node Name: `http://localhost:8080/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.28.3`
  * Other Info: `There is a chance that the highlight in the finding is on a value in the headers, versus the actual matched string in the response body.`
* URL: http://localhost:8080/casa_campo
  * Node Name: `http://localhost:8080/casa_campo`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.28.3`
  * Other Info: `There is a chance that the highlight in the finding is on a value in the headers, versus the actual matched string in the response body.`
* URL: http://localhost:8080/casa_campo/
  * Node Name: `http://localhost:8080/casa_campo/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.28.3`
  * Other Info: `There is a chance that the highlight in the finding is on a value in the headers, versus the actual matched string in the response body.`
* URL: http://localhost:8080/robots.txt
  * Node Name: `http://localhost:8080/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.28.3`
  * Other Info: `There is a chance that the highlight in the finding is on a value in the headers, versus the actual matched string in the response body.`
* URL: http://localhost:8080/sitemap.xml
  * Node Name: `http://localhost:8080/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.28.3`
  * Other Info: `There is a chance that the highlight in the finding is on a value in the headers, versus the actual matched string in the response body.`

Instances: Systemic


### Solution

Configure the server to prevent such information leaks. For example:
Under Tomcat this is done via the "server" directive and implementation of custom error pages.
Under Apache this is done via the "ServerSignature" and "ServerTokens" directives.

### Reference


* [ https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/08-Testing_for_Error_Handling/ ](https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/08-Testing_for_Error_Handling/)


#### CWE Id: [ 497 ](https://cwe.mitre.org/data/definitions/497.html)


#### WASC Id: 13

#### Source ID: 3

### [ Permissions Policy Header Not Set ](https://www.zaproxy.org/docs/alerts/10063/)



##### Low (Medium)

### Description

Permissions Policy Header is an added layer of security that helps to restrict from unauthorized access or usage of browser/client features by web resources. This policy ensures the user privacy by limiting or specifying the features of the browsers can be used by the web resources. Permissions Policy provides a set of standard HTTP headers that allow website owners to limit which features of browsers can be used by the page such as camera, microphone, location, full screen etc.

* URL: http://localhost:8080/
  * Node Name: `http://localhost:8080/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: http://localhost:8080/casa_campo
  * Node Name: `http://localhost:8080/casa_campo`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: http://localhost:8080/casa_campo/
  * Node Name: `http://localhost:8080/casa_campo/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: http://localhost:8080/robots.txt
  * Node Name: `http://localhost:8080/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: http://localhost:8080/sitemap.xml
  * Node Name: `http://localhost:8080/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``

Instances: Systemic


### Solution

Ensure that your web server, application server, load balancer, etc. is configured to set the Permissions-Policy header.

### Reference


* [ https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy)
* [ https://developer.chrome.com/blog/feature-policy/ ](https://developer.chrome.com/blog/feature-policy/)
* [ https://scotthelme.co.uk/a-new-security-header-feature-policy/ ](https://scotthelme.co.uk/a-new-security-header-feature-policy/)
* [ https://w3c.github.io/webappsec-feature-policy/ ](https://w3c.github.io/webappsec-feature-policy/)
* [ https://www.smashingmagazine.com/2018/12/feature-policy/ ](https://www.smashingmagazine.com/2018/12/feature-policy/)


#### CWE Id: [ 693 ](https://cwe.mitre.org/data/definitions/693.html)


#### WASC Id: 15

#### Source ID: 3

### [ Server Leaks Version Information via "Server" HTTP Response Header Field ](https://www.zaproxy.org/docs/alerts/10036/)



##### Low (High)

### Description

The web/application server is leaking version information via the "Server" HTTP response header. Access to such information may facilitate attackers identifying other vulnerabilities your web/application server is subject to.

* URL: http://localhost:8080/
  * Node Name: `http://localhost:8080/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.28.3`
  * Other Info: ``
* URL: http://localhost:8080/casa_campo
  * Node Name: `http://localhost:8080/casa_campo`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.28.3`
  * Other Info: ``
* URL: http://localhost:8080/casa_campo/
  * Node Name: `http://localhost:8080/casa_campo/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.28.3`
  * Other Info: ``
* URL: http://localhost:8080/robots.txt
  * Node Name: `http://localhost:8080/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.28.3`
  * Other Info: ``
* URL: http://localhost:8080/sitemap.xml
  * Node Name: `http://localhost:8080/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.28.3`
  * Other Info: ``

Instances: Systemic


### Solution

Ensure that your web server, application server, load balancer, etc. is configured to suppress the "Server" header or provide generic details.

### Reference


* [ https://httpd.apache.org/docs/current/mod/core.html#servertokens ](https://httpd.apache.org/docs/current/mod/core.html#servertokens)
* [ https://learn.microsoft.com/en-us/previous-versions/msp-n-p/ff648552(v=pandp.10) ](https://learn.microsoft.com/en-us/previous-versions/msp-n-p/ff648552(v=pandp.10))
* [ https://www.troyhunt.com/shhh-dont-let-your-response-headers/ ](https://www.troyhunt.com/shhh-dont-let-your-response-headers/)


#### CWE Id: [ 497 ](https://cwe.mitre.org/data/definitions/497.html)


#### WASC Id: 13

#### Source ID: 3

### [ Storable and Cacheable Content ](https://www.zaproxy.org/docs/alerts/10049/)



##### Informational (Medium)

### Description

The response contents are storable by caching components such as proxy servers, and may be retrieved directly from the cache, rather than from the origin server by the caching servers, in response to similar requests from other users. If the response data is sensitive, personal or user-specific, this may result in sensitive information being leaked. In some cases, this may even result in a user gaining complete control of the session of another user, depending on the configuration of the caching components in use in their environment. This is primarily an issue where "shared" caching servers such as "proxy" caches are configured on the local network. This configuration is typically found in corporate or educational environments, for instance.

* URL: http://localhost:8080/
  * Node Name: `http://localhost:8080/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: `In the absence of an explicitly specified caching lifetime directive in the response, a liberal lifetime heuristic of 1 year was assumed. This is permitted by rfc7234.`
* URL: http://localhost:8080/casa_campo
  * Node Name: `http://localhost:8080/casa_campo`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: `In the absence of an explicitly specified caching lifetime directive in the response, a liberal lifetime heuristic of 1 year was assumed. This is permitted by rfc7234.`
* URL: http://localhost:8080/casa_campo/
  * Node Name: `http://localhost:8080/casa_campo/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: `In the absence of an explicitly specified caching lifetime directive in the response, a liberal lifetime heuristic of 1 year was assumed. This is permitted by rfc7234.`
* URL: http://localhost:8080/robots.txt
  * Node Name: `http://localhost:8080/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: `In the absence of an explicitly specified caching lifetime directive in the response, a liberal lifetime heuristic of 1 year was assumed. This is permitted by rfc7234.`
* URL: http://localhost:8080/sitemap.xml
  * Node Name: `http://localhost:8080/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: `In the absence of an explicitly specified caching lifetime directive in the response, a liberal lifetime heuristic of 1 year was assumed. This is permitted by rfc7234.`

Instances: Systemic


### Solution

Validate that the response does not contain sensitive, personal or user-specific information. If it does, consider the use of the following HTTP response headers, to limit, or prevent the content being stored and retrieved from the cache by another user:
Cache-Control: no-cache, no-store, must-revalidate, private
Pragma: no-cache
Expires: 0
This configuration directs both HTTP 1.0 and HTTP 1.1 compliant caching servers to not store the response, and to not retrieve the response (without validation) from the cache, in response to a similar request.

### Reference


* [ https://datatracker.ietf.org/doc/html/rfc7234 ](https://datatracker.ietf.org/doc/html/rfc7234)
* [ https://datatracker.ietf.org/doc/html/rfc7231 ](https://datatracker.ietf.org/doc/html/rfc7231)
* [ https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html ](https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html)


#### CWE Id: [ 524 ](https://cwe.mitre.org/data/definitions/524.html)


#### WASC Id: 13

#### Source ID: 3


