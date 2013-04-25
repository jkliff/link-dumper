import cherrypy
import jinja2
import json
import os
from lib.repository import Repository

expose = cherrypy.expose

CHERRYPY_CONF = {
    '/': {'tools.encode.on': True, 'tools.encode.encoding': 'utf-8'},
    '/static': {'tools.staticdir.on': True, 'tools.staticdir.dir': os.path.abspath ('static')},

}

TEMPLATE_PATH = 'templates'

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
            print 'data', d
            return self.template.render (d)
        return w


def cherrypy_json_output_wrapper (fn):
    def w (*args):
        return json.dumps (fn (*args))
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

        print q
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

class Settings:
    db_connection = None

def read_config (path):
    settings = Settings ()
    settings.db_connection = 'dbname=linkdump_dev user=linkdump_dev host=pg_local_dev password=linkdump_dev'

    return settings

def main ():
    from argparse import ArgumentParser

    parser = ArgumentParser(description='Order Cockpit')
    parser.add_argument('-c', '--config', help='Path to config file.', dest='config', required=True)
    parser.add_argument('-p', '--port', help='Port number to listen on', required=True)
    parser.add_argument('-b', '--bind', default='0.0.0.0', help='Bind IP', required=True)

    args = parser.parse_args()
    settings = read_config (args.config)

    cherrypy.config.update({'server.socket_host': args.bind, 'server.socket_port': int(args.port)})

    repository = Repository (settings.db_connection)

    cherrypy.tree.mount(RootController(repository, settings), '/', config=CHERRYPY_CONF)

    cherrypy.engine.start()
    cherrypy.engine.block()


if __name__ == '__main__':
    main ()

