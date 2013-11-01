import re

import urllib2
from urllib2 import URLError
from urllib2 import HTTPError


def save_file(page_title, data):
    """
    >>> re.sub ('[^-a-zA-Z0-9_. ]+', '',\
        re.sub ('[/(): ]+', '_',\
        re.sub ('\.html?$', '', 'http://iua.de/hrf-/,3420%=af?re&a\df_&aer=iuah/rsi:f')))

"""
    file_name = re.sub('[^-a-zA-Z0-9_. ]+', '',
                       re.sub('[/(): ]+', '_',
                              re.sub('\.html?$', '', page_title)
                       ))
    with (open(file_name, 'w')) as f:
        f.write(data)


def fetch(url):
    """
    >>> fetch ('http://localhost:8000/test_page.html')
    >>> fetch ('http://localhost:8000/not_here.html')
    >>> fetch ('http://nowhere.h7r:8000/test_page.html')
    #>>> fetch ('http://docs.python.org/2/howto/urllib2.html')

"""

    try:
        resp = urllib2.urlopen(url)
        data = resp.read()

        return data

    except URLError as e:
        print e
    except HTTPError as e:
        print e




