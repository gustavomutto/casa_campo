# ZAP Scanning Report

ZAP by [Checkmarx](https://checkmarx.com/).


## Summary of Alerts

| Risk Level | Number of Alerts |
| --- | --- |
| High | 0 |
| Medium | 2 |
| Low | 2 |
| Informational | 2 |




## Insights

| Level | Reason | Site | Description | Statistic |
| --- | --- | --- | --- | --- |
| Info | Informational | https://gustavomutto.github.io | Percentage of responses with status code 4xx | 100 % |
| Info | Informational | https://gustavomutto.github.io | Percentage of endpoints with content type text/html | 100 % |
| Info | Informational | https://gustavomutto.github.io | Percentage of endpoints with method GET | 100 % |
| Info | Informational | https://gustavomutto.github.io | Count of total endpoints | 5    |
| Info | Informational | https://gustavomutto.github.io | Percentage of slow responses | 37 % |







## Alerts

| Name | Risk Level | Number of Instances |
| --- | --- | --- |
| CSP: Failure to Define Directive with No Fallback | Medium | Systemic |
| CSP: style-src unsafe-inline | Medium | 5 |
| Permissions Policy Header Not Set | Low | 5 |
| Strict-Transport-Security Header Not Set | Low | 5 |
| Retrieved from Cache | Informational | 6 |
| Storable and Cacheable Content | Informational | 5 |




## Alert Detail



### [ CSP: Failure to Define Directive with No Fallback ](https://www.zaproxy.org/docs/alerts/10055/)



##### Medium (High)

### Description

The Content Security Policy fails to define one of the directives that has no fallback. Missing/excluding them is the same as allowing anything.

* URL: https://gustavomutto.github.io/casa_campo/
  * Node Name: `https://gustavomutto.github.io/casa_campo/`
  * Method: `GET`
  * Parameter: `Content-Security-Policy`
  * Attack: ``
  * Evidence: `default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`
  * Other Info: `The directive(s): frame-ancestors, form-action is/are among the directives that do not fallback to default-src.
The response contained 2 Content-Security-Policy policies (header and/or meta). They were analyzed together using browser-style intersection (a resource is allowed only if every policy allows it):
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`
* URL: https://gustavomutto.github.io/robots.txt
  * Node Name: `https://gustavomutto.github.io/robots.txt`
  * Method: `GET`
  * Parameter: `Content-Security-Policy`
  * Attack: ``
  * Evidence: `default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`
  * Other Info: `The directive(s): frame-ancestors, form-action is/are among the directives that do not fallback to default-src.
The response contained 2 Content-Security-Policy policies (header and/or meta). They were analyzed together using browser-style intersection (a resource is allowed only if every policy allows it):
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`

Instances: Systemic


### Solution

Ensure that your web server, application server, load balancer, etc. is properly configured to set the Content-Security-Policy header.

### Reference


* [ https://www.w3.org/TR/CSP/ ](https://www.w3.org/TR/CSP/)
* [ https://caniuse.com/#search=content+security+policy ](https://caniuse.com/#search=content+security+policy)
* [ https://content-security-policy.com/ ](https://content-security-policy.com/)
* [ https://github.com/HtmlUnit/htmlunit-csp ](https://github.com/HtmlUnit/htmlunit-csp)
* [ https://web.dev/articles/csp#resource-options ](https://web.dev/articles/csp#resource-options)


#### CWE Id: [ 693 ](https://cwe.mitre.org/data/definitions/693.html)


#### WASC Id: 15

#### Source ID: 3

### [ CSP: style-src unsafe-inline ](https://www.zaproxy.org/docs/alerts/10055/)



##### Medium (High)

### Description

Content Security Policy (CSP) is an added layer of security that helps to detect and mitigate certain types of attacks. Including (but not limited to) Cross Site Scripting (XSS), and data injection attacks. These attacks are used for everything from data theft to site defacement or distribution of malware. CSP provides a set of standard HTTP headers that allow website owners to declare approved sources of content that browsers should be allowed to load on that page — covered types are JavaScript, CSS, HTML frames, fonts, images and embeddable objects such as Java applets, ActiveX, audio and video files.

* URL: https://gustavomutto.github.io/
  * Node Name: `https://gustavomutto.github.io/`
  * Method: `GET`
  * Parameter: `Content-Security-Policy`
  * Attack: ``
  * Evidence: `default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`
  * Other Info: `style-src includes unsafe-inline.
The response contained 2 Content-Security-Policy policies (header and/or meta). They were analyzed together using browser-style intersection (a resource is allowed only if every policy allows it):
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`
* URL: https://gustavomutto.github.io/casa_campo
  * Node Name: `https://gustavomutto.github.io/casa_campo`
  * Method: `GET`
  * Parameter: `Content-Security-Policy`
  * Attack: ``
  * Evidence: `default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`
  * Other Info: `style-src includes unsafe-inline.
The response contained 2 Content-Security-Policy policies (header and/or meta). They were analyzed together using browser-style intersection (a resource is allowed only if every policy allows it):
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`
* URL: https://gustavomutto.github.io/casa_campo/
  * Node Name: `https://gustavomutto.github.io/casa_campo/`
  * Method: `GET`
  * Parameter: `Content-Security-Policy`
  * Attack: ``
  * Evidence: `default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`
  * Other Info: `style-src includes unsafe-inline.
The response contained 2 Content-Security-Policy policies (header and/or meta). They were analyzed together using browser-style intersection (a resource is allowed only if every policy allows it):
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`
* URL: https://gustavomutto.github.io/robots.txt
  * Node Name: `https://gustavomutto.github.io/robots.txt`
  * Method: `GET`
  * Parameter: `Content-Security-Policy`
  * Attack: ``
  * Evidence: `default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`
  * Other Info: `style-src includes unsafe-inline.
The response contained 2 Content-Security-Policy policies (header and/or meta). They were analyzed together using browser-style intersection (a resource is allowed only if every policy allows it):
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`
* URL: https://gustavomutto.github.io/sitemap.xml
  * Node Name: `https://gustavomutto.github.io/sitemap.xml`
  * Method: `GET`
  * Parameter: `Content-Security-Policy`
  * Attack: ``
  * Evidence: `default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`
  * Other Info: `style-src includes unsafe-inline.
The response contained 2 Content-Security-Policy policies (header and/or meta). They were analyzed together using browser-style intersection (a resource is allowed only if every policy allows it):
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'
default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'`


Instances: 5

### Solution

Ensure that your web server, application server, load balancer, etc. is properly configured to set the Content-Security-Policy header.

### Reference


* [ https://www.w3.org/TR/CSP/ ](https://www.w3.org/TR/CSP/)
* [ https://caniuse.com/#search=content+security+policy ](https://caniuse.com/#search=content+security+policy)
* [ https://content-security-policy.com/ ](https://content-security-policy.com/)
* [ https://github.com/HtmlUnit/htmlunit-csp ](https://github.com/HtmlUnit/htmlunit-csp)
* [ https://web.dev/articles/csp#resource-options ](https://web.dev/articles/csp#resource-options)


#### CWE Id: [ 693 ](https://cwe.mitre.org/data/definitions/693.html)


#### WASC Id: 15

#### Source ID: 3

### [ Permissions Policy Header Not Set ](https://www.zaproxy.org/docs/alerts/10063/)



##### Low (Medium)

### Description

Permissions Policy Header is an added layer of security that helps to restrict from unauthorized access or usage of browser/client features by web resources. This policy ensures the user privacy by limiting or specifying the features of the browsers can be used by the web resources. Permissions Policy provides a set of standard HTTP headers that allow website owners to limit which features of browsers can be used by the page such as camera, microphone, location, full screen etc.

* URL: https://gustavomutto.github.io/
  * Node Name: `https://gustavomutto.github.io/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://gustavomutto.github.io/casa_campo
  * Node Name: `https://gustavomutto.github.io/casa_campo`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://gustavomutto.github.io/casa_campo/
  * Node Name: `https://gustavomutto.github.io/casa_campo/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://gustavomutto.github.io/robots.txt
  * Node Name: `https://gustavomutto.github.io/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://gustavomutto.github.io/sitemap.xml
  * Node Name: `https://gustavomutto.github.io/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``


Instances: 5

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

### [ Strict-Transport-Security Header Not Set ](https://www.zaproxy.org/docs/alerts/10035/)



##### Low (High)

### Description

HTTP Strict Transport Security (HSTS) is a web security policy mechanism whereby a web server declares that complying user agents (such as a web browser) are to interact with it using only secure HTTPS connections (i.e. HTTP layered over TLS/SSL). HSTS is an IETF standards track protocol and is specified in RFC 6797.

* URL: https://gustavomutto.github.io/
  * Node Name: `https://gustavomutto.github.io/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://gustavomutto.github.io/casa_campo
  * Node Name: `https://gustavomutto.github.io/casa_campo`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://gustavomutto.github.io/casa_campo/
  * Node Name: `https://gustavomutto.github.io/casa_campo/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://gustavomutto.github.io/robots.txt
  * Node Name: `https://gustavomutto.github.io/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://gustavomutto.github.io/sitemap.xml
  * Node Name: `https://gustavomutto.github.io/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``


Instances: 5

### Solution

Ensure that your web server, application server, load balancer, etc. is configured to enforce Strict-Transport-Security.

### Reference


* [ https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html ](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)
* [ https://owasp.org/www-community/Security_Headers ](https://owasp.org/www-community/Security_Headers)
* [ https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security ](https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security)
* [ https://caniuse.com/stricttransportsecurity ](https://caniuse.com/stricttransportsecurity)
* [ https://datatracker.ietf.org/doc/html/rfc6797 ](https://datatracker.ietf.org/doc/html/rfc6797)


#### CWE Id: [ 319 ](https://cwe.mitre.org/data/definitions/319.html)


#### WASC Id: 15

#### Source ID: 3

### [ Retrieved from Cache ](https://www.zaproxy.org/docs/alerts/10050/)



##### Informational (Medium)

### Description

The content was retrieved from a shared cache. If the response data is sensitive, personal or user-specific, this may result in sensitive information being leaked. In some cases, this may even result in a user gaining complete control of the session of another user, depending on the configuration of the caching components in use in their environment. This is primarily an issue where caching servers such as "proxy" caches are configured on the local network. This configuration is typically found in corporate or educational environments, for instance.

* URL: https://gustavomutto.github.io/
  * Node Name: `https://gustavomutto.github.io/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `HIT`
  * Other Info: ``
* URL: https://gustavomutto.github.io/casa_campo/
  * Node Name: `https://gustavomutto.github.io/casa_campo/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `HIT`
  * Other Info: ``
* URL: https://gustavomutto.github.io/
  * Node Name: `https://gustavomutto.github.io/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `Age: 0`
  * Other Info: `The presence of the 'Age' header indicates that a HTTP/1.1 compliant caching server is in use.`
* URL: https://gustavomutto.github.io/casa_campo
  * Node Name: `https://gustavomutto.github.io/casa_campo`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `Age: 0`
  * Other Info: `The presence of the 'Age' header indicates that a HTTP/1.1 compliant caching server is in use.`
* URL: https://gustavomutto.github.io/robots.txt
  * Node Name: `https://gustavomutto.github.io/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `Age: 0`
  * Other Info: `The presence of the 'Age' header indicates that a HTTP/1.1 compliant caching server is in use.`
* URL: https://gustavomutto.github.io/sitemap.xml
  * Node Name: `https://gustavomutto.github.io/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `Age: 0`
  * Other Info: `The presence of the 'Age' header indicates that a HTTP/1.1 compliant caching server is in use.`


Instances: 6

### Solution

Validate that the response does not contain sensitive, personal or user-specific information. If it does, consider the use of the following HTTP response headers, to limit, or prevent the content being stored and retrieved from the cache by another user:
Cache-Control: no-cache, no-store, must-revalidate, private
Pragma: no-cache
Expires: 0
This configuration directs both HTTP 1.0 and HTTP 1.1 compliant caching servers to not store the response, and to not retrieve the response (without validation) from the cache, in response to a similar request.

### Reference


* [ https://datatracker.ietf.org/doc/html/rfc7234 ](https://datatracker.ietf.org/doc/html/rfc7234)
* [ https://datatracker.ietf.org/doc/html/rfc7231 ](https://datatracker.ietf.org/doc/html/rfc7231)
* [ https://www.rfc-editor.org/rfc/rfc9110.html ](https://www.rfc-editor.org/rfc/rfc9110.html)


#### CWE Id: [ 525 ](https://cwe.mitre.org/data/definitions/525.html)


#### Source ID: 3

### [ Storable and Cacheable Content ](https://www.zaproxy.org/docs/alerts/10049/)



##### Informational (Medium)

### Description

The response contents are storable by caching components such as proxy servers, and may be retrieved directly from the cache, rather than from the origin server by the caching servers, in response to similar requests from other users. If the response data is sensitive, personal or user-specific, this may result in sensitive information being leaked. In some cases, this may even result in a user gaining complete control of the session of another user, depending on the configuration of the caching components in use in their environment. This is primarily an issue where "shared" caching servers such as "proxy" caches are configured on the local network. This configuration is typically found in corporate or educational environments, for instance.

* URL: https://gustavomutto.github.io/
  * Node Name: `https://gustavomutto.github.io/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: `In the absence of an explicitly specified caching lifetime directive in the response, a liberal lifetime heuristic of 1 year was assumed. This is permitted by rfc7234.`
* URL: https://gustavomutto.github.io/casa_campo
  * Node Name: `https://gustavomutto.github.io/casa_campo`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: `In the absence of an explicitly specified caching lifetime directive in the response, a liberal lifetime heuristic of 1 year was assumed. This is permitted by rfc7234.`
* URL: https://gustavomutto.github.io/casa_campo/
  * Node Name: `https://gustavomutto.github.io/casa_campo/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: `In the absence of an explicitly specified caching lifetime directive in the response, a liberal lifetime heuristic of 1 year was assumed. This is permitted by rfc7234.`
* URL: https://gustavomutto.github.io/robots.txt
  * Node Name: `https://gustavomutto.github.io/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: `In the absence of an explicitly specified caching lifetime directive in the response, a liberal lifetime heuristic of 1 year was assumed. This is permitted by rfc7234.`
* URL: https://gustavomutto.github.io/sitemap.xml
  * Node Name: `https://gustavomutto.github.io/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: `In the absence of an explicitly specified caching lifetime directive in the response, a liberal lifetime heuristic of 1 year was assumed. This is permitted by rfc7234.`


Instances: 5

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


