__author__ = 'john'

import json
import re

import cherrypy
import jinja2


BASE_URL = ''
TEMPLATE_PATH = 'templates'


class CherryPyCallRenderWrapper(object):
    def __init__(self, template):
        print 'Initializing wrapper with template %s' % template

        env = jinja2.environment.Environment()
        env.loader = jinja2.FileSystemLoader(TEMPLATE_PATH)
        self.template = env.get_template(template)

    def __call__(self, fn):
        def w(*args, **kw):
            d = fn(*args, **kw)
            d['base'] = BASE_URL

            return self.template.render(d)

        return w


def cherrypy_json_output_wrapper(fn):
    def w(*args, **kw):
        return json.dumps(fn(*args, **kw))

    return w


render = CherryPyCallRenderWrapper
output_json = cherrypy_json_output_wrapper
expose = cherrypy.expose


class RootController:
    def __init__(self, repo, settings):
        self.repository = repo

    @expose
    @render(template='base.jtml')
    def index(self, q=None):
        return {}

    @expose
    #@render (template='edit_link.jtml')
    @output_json
    def edit_link(self, l_id=None):
        link = self.repository.load_link(l_id)
        return {'link': link}

    @expose
    @output_json
    def save_link(self, url, notes, link_id=None):
        # FIXME: handle encoding properly (through cherrypy itself)
        print url.encode('utf-8'), notes.encode('utf-8'), link_id
        notes = notes.encode('utf-8')
        url = url.encode('utf-8')

        tags = []
        actions = []
        attributes = []
        for s in [x.strip() for x in ' '.join(notes.split('\n')).split(' ')]:
            if s.startswith('#'):
                tags.append(s[1:])
            elif s.startswith('!'):
                actions.append(s[1:])

        if len(tags) == 0:
            tags = None
        if len(actions) == 0:
            actions = None

        print 'link id:', link_id

        resp = self.repository.save_link(url, notes, link_id=link_id, tags=tags, actions=actions, attributes=attributes)
        print resp
        return resp

    @expose
    @output_json
    def list_meta(self):
        r = {'actions': self.repository.list_actions(),
             'tags': self.repository.list_tags()
        }
        return r

    @expose
    @output_json
    def search(self, q=None):

        params = [x.strip() for x in q.split(' ')]
        tags = []
        actions = []
        terms = []
        for p in params:
            if p.startswith('#'):
                tags.append(p)
            elif p.startswith('!'):
                actions.append(p)
            else:
                terms.append(p)

        r = {'links': self.repository.search(terms, tags, actions) or []}
        return r

    #@expose
    #@render (template='bulk_import.jtml')
    #def bulk_import (self):
    #    return {}

    @expose
    @output_json
    def perform_bulk_import(self, mode=None, q=None):

        if q is None:
            return {}

        q = q.encode('utf-8')

        s = [x.strip() for x in re.split(r'[\n| \"\']', q)]

        r = re.compile(r'(http.*)')
        urls = set()
        non_urls = set()
        existing = set()

        for i in s:
            if r.match(i) is None:
                continue

            urls.add(i)

            if self.repository.get_link(None, i) is not None:
                existing.add(i)

        if mode == 'perform':
            ids = []
            for i in urls:
                idx = self.repository.save_link(i, 'auto imported (bulk)')
                ids.append(idx)

            raise cherrypy.HTTPRedirect(BASE_URL)

        return {'urls': list(urls), 'non_urls': list(non_urls), 'existing': list(existing)}
