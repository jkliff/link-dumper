import cherrypy
import psycopg2
import psycopg2.pool
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

        self.template_path = os.path.join (TEMPLATE_PATH, template)
        if not os.path.exists (self.template_path):
            raise Exception ('Template [%s] not found at [%s].' % (self.template_path, os.path.abspath (self.template_path)))

        with (open (self.template_path)) as f:
            self.template = jinja2.Template (f.read ())

    def __call__ (self, fn):
        def w (*args):

            d = fn (*args)
            print 'data', d
            return self.template.render ()
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
        if q is None:
            return {}
        return {}

    @expose
    def save_link (self, url, notes):
        self.repository.save_link (url, notes)

    @expose
    @output_json
    def list_meta (self):
        r = {    'actions': self.repository.list_actions (),
                    'tags': self.repository.list_tags ()
            }
        print r
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

