import cherrypy
import jinja2
import json
import os
from lib.repository import Repository
import re
import yaml

expose = cherrypy.expose

CHERRYPY_CONF = {
    '/': {'tools.encode.on': True, 'tools.encode.encoding': 'utf-8'},
    '/static': {'tools.staticdir.on': True, 'tools.staticdir.dir': os.path.abspath ('static')},

}

TEMPLATE_PATH = 'templates'

BASE_URL = ''

class CherryPyCallRenderWrapper (object):
    def __init__ (self, template):
        print 'Initializing wrapper with template %s' % template

        env = jinja2.environment.Environment()
        env.loader = jinja2.FileSystemLoader(TEMPLATE_PATH)
        self.template = env.get_template(template)


    def __call__ (self, fn):
        def w (*args, **kw):
            print 'wrapper...', args, kw
            d = fn (*args, **kw)
            d ['base'] = BASE_URL
            print 'data', d

            return self.template.render (d)
        return w


def cherrypy_json_output_wrapper (fn):
    def w (*args, **kw):
        return json.dumps (fn (*args, **kw))
    return w

render = CherryPyCallRenderWrapper
output_json = cherrypy_json_output_wrapper

class RootController:
    def __init__ (self, repo, settings):
        self.repository = repo

    @expose
    @render (template='index.jtml')
    def index (self, q=None):
        r = {'links': self.repository.list_last_links (10) or []
            }
        return r

    @expose
    @render (template='edit_link.jtml')
    def edit_link (self, l_id=None):
        print l_id
        return {}

    @expose
    def save_link (self, url, notes):

        tags = []
        actions = []
        for s in [x.strip() for x in ' '.join (notes.split ('\n')).split (' ')]:
            if s.startswith ('#'):
                tags.append (s [1:])
            elif s.startswith ('!'):
                actions.append (s [1:])

        if len (tags) == 0:
            tags = None
        if len (actions) == 0:
            actions = None

        self.repository.save_link (url, notes, tags, actions)

    @expose
    @output_json
    def list_meta (self):
        r = {   'actions': self.repository.list_actions (),
                'tags': self.repository.list_tags ()
            }
        return r

    @expose
    @render (template='index.jtml')
    def search (self, q=None):

        params = [x.strip() for x in q.split (' ')]
        tags = []
        actions = []
        terms = []
        for p in params:
            if p.startswith ('#'):
                tags.append (p)
            elif p.startswith ('!'):
                actions.append (p)
            else:
                terms.append (p)

        r = { 'links': self.repository.search (terms, tags, actions) or []}
        return r

    @expose
    @render (template='bulk_import.jtml')
    def bulk_import (self):
        return {}

    @expose
    @output_json
    def perform_bulk_import (self, mode=None, q=None):

        if q is None:
            return {}

        s = [x.strip () for x in re.split (r'\n| ', q)]

        r = re.compile (r'(http.*)')
        urls = []
        non_urls = []
 
        for i in s:
            if r.match (i) is None:
                non_urls.append (i)
            else:
                urls.append (i)
        if mode == 'perform':
            ids = []
            for i in urls:
                idx = self.repository.save_link (i, 'auto imported (bulk)')
                ids.append (idx)

            raise cherrypy.HTTPRedirect ('/')

        return {'urls': urls, 'non_urls': non_urls}


class Settings:

    def __init__ (self):

        self.db_connection = None
        self.bind = None
        self.port = None

    def __repr__ (self):
        return str (self.__dict__)

def read_config (path):
    settings = Settings ()
    d = {}
    with (open (path)) as f:
        d = yaml.load (f)

    settings.db_connection = d ['db_connection']
    settings.bind = d ['bind']
    settings.port = d ['port']
    settings.base_url = d ['base_url']

    if None in (settings.bind, settings.port, settings.db_connection):
        raise Exception ("Configuration incomplete. Can't start: [%s]" % settings)

    return settings

def main ():
    global BASE_URL
    from argparse import ArgumentParser

    parser = ArgumentParser(description='Order Cockpit')
    parser.add_argument('-c', '--config', help='Path to config file.', dest='config', required=True)

    args = parser.parse_args()
    settings = read_config (args.config)

    BASE_URL = settings.base_url

    cherrypy.config.update({'server.socket_host': settings.bind, 'server.socket_port': settings.port})

    repository = Repository (settings.db_connection)

    cherrypy.tree.mount(RootController(repository, settings), '/', config=CHERRYPY_CONF)

    cherrypy.engine.start()
    cherrypy.engine.block()


if __name__ == '__main__':
    main ()

