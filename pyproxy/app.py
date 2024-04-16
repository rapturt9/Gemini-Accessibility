from flask import Flask, request, Response, stream_with_context
import requests
from bs4 import BeautifulSoup
import urllib.parse

app = Flask(__name__)

# Assuming proxy.py is running on the same machine but on a different port
PROXY_PORT = '8899'  # Port where proxy.py is running

# Base URL to rewrite URLs to be fetched through Flask app itself
FLASK_HOST = 'localhost'
FLASK_PORT = '5000'
PROXY_BASE_URL = f"http://{FLASK_HOST}:{FLASK_PORT}/fetch?url="

@app.route('/proxy')
def proxy():
    target_url = request.args.get('url')
    if not target_url:
        return "URL parameter is required.", 400
    
    try:
        resp = requests.get(target_url, verify=False)
        
        # Parse the HTML content
        soup = BeautifulSoup(resp.content, 'html.parser')
        # Add this before returning the modified_content in your /proxy route
        # Initialize your script code
        script_code = f"""
document.addEventListener('DOMContentLoaded', (event) => {{
    const proxyPrefix = '{PROXY_BASE_URL}';
    const originalSiteDomain = '{target_url}'; // Pass the target_url from Python to JS
    const proxyURL = 'http://{FLASK_HOST}:{FLASK_PORT}';

    // Function to check if the URL is already rewritten
    function isUrlRewritten(url) {{
        return url.startsWith(proxyPrefix);
    }}

    // Function to rewrite image source URLs and remove srcset
    function rewriteImageSrc(img) {{
        if (img.src && !isUrlRewritten(img.src)) {{
            let originalSrc = img.src;

            // If src starts with "/", prepend the domain of the original site
            if (originalSrc.startsWith('/')) {{
                originalSrc = originalSiteDomain + originalSrc;
            }} else if (originalSrc.startsWith(proxyURL)) {{
                originalSrc = originalSrc.replace(proxyURL, originalSiteDomain);
            }}


            img.src = proxyPrefix + encodeURIComponent(originalSrc);
        }}

        // Remove the srcset attribute to prevent browser default loading
        if (img.hasAttribute('srcset')) {{
            img.removeAttribute('srcset');
        }}
    }}

    // Immediately rewrite URLs for all existing images and remove srcset
    document.querySelectorAll('img').forEach(rewriteImageSrc);

    // Use a MutationObserver to handle dynamically added or modified images
    const observer = new MutationObserver((mutations) => {{
        mutations.forEach((mutation) => {{
            mutation.addedNodes.forEach((node) => {{
                if(node.tagName === 'IMG') {{
                    rewriteImageSrc(node);
                }}
            }});
        }});
    }});

    observer.observe(document.body, {{
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src'],
    }});
}});
"""

# The rest of your Flask route code...


        # print the modified content
        # print(soup.prettify())
        #
        # Add the script code to the end of the body tag
        body_tag = soup.body
        script_tag = soup.new_tag('script')
        script_tag.string = script_code
        if body_tag:
            body_tag.append(script_tag)
        else:
            soup.append(script_tag)


        # Rewrite URLs in <a>, <link>, <script>, and <img> tags, including srcset attributes
        for tag in soup.find_all(['a', 'link', 'script', 'img'], href=True) + soup.find_all('img', src=True) + soup.find_all('script', src=True) + soup.find_all('img', srcset=True):
            url_attr = 'href' if tag.name in ['a', 'link'] else 'src'
            if tag.has_attr(url_attr):
                original_url = tag[url_attr]
                if original_url:
                    new_url = urllib.parse.urljoin(target_url, original_url)
                    tag[url_attr] = PROXY_BASE_URL + urllib.parse.quote(new_url, safe='')

            # Handling srcset attributes
            if tag.has_attr('srcset'):
                del tag['srcset']

        modified_content = str(soup)
        return Response(modified_content, mimetype="text/html")
    except Exception as e:
        return f"Failed to fetch content: {e}", 500


@app.route('/fetch')
def fetch_resource():
    resource_url = request.args.get('url')
    if not resource_url:
        return "Resource URL parameter is required.", 400

    try:
        resource_resp = requests.get(resource_url, stream=True, verify=False)
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in resource_resp.raw.headers.items() if name.lower() not in excluded_headers]
        return Response(resource_resp.content, resource_resp.status_code, headers)
    except requests.RequestException as e:
        return f"Failed to fetch resource: {e}", 500

"""@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    # Construct the full URL of the original resource
    original_url = urllib.parse.urljoin('https://original-website.com/', path)
    query_string = request.query_string.decode("utf-8")
    if query_string:
        original_url += "?" + query_string

    # Proxy the request
    resp = requests.get(original_url, stream=True, allow_redirects=True)
    
    excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
    headers = {name: value for (name, value) in resp.raw.headers.items() if name.lower() not in excluded_headers}

    return Response(stream_with_context(resp.iter_content()), content_type=resp.headers['Content-Type'], headers=headers)"""

if __name__ == '__main__':
    app.run(debug=True, port=FLASK_PORT)
