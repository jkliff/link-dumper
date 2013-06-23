import os

import cherrypy
import yaml

from lib.repository import Repository
from lib.controller import RootController, LinkController


CHERRYPY_CONF = {
    '/': {'tools.encode.on': True, 'tools.encode.encoding': 'utf-8'},
    '/static': {'tools.staticdir.on': True, 'tools.staticdir.dir': os.path.abspath('static')},

}


class Settings:
    def __init__(self):
        self.db_connection = None
        self.bind = None
        self.port = None
        self.base_url = None

    def __repr__(self):
        return str(self.__dict__)


def read_config(path):
    settings = Settings()
    d = {}
    with (open(path)) as f:
        d = yaml.load(f)

    settings.db_connection = d['db_connection']
    settings.bind = d['bind']
    settings.port = d['port']
    settings.base_url = d['base_url']
    if not settings.base_url.endswith('/'):
        settings.base_url += '/'

    if None in (settings.bind, settings.port, settings.db_connection):
        raise Exception("Configuration incomplete. Can't start: [%s]" % settings)

    return settings


def main():
    global BASE_URL
    from argparse import ArgumentParser

    parser = ArgumentParser(description='link_dump')
    parser.add_argument('-c', '--config', help='Path to config file.', dest='config', required=True)

    args = parser.parse_args()
    settings = read_config(args.config)

    BASE_URL = settings.base_url

    cherrypy.config.update({
        'server.socket_host': settings.bind,
        'server.socket_port': settings.port,
        'tools.encode.on': True,
        'tools.encode.encoding': 'utf-8'
    })

    repository = Repository(settings.db_connection)

    cherrypy.tree.mount(RootController(repository, settings), '/', config=CHERRYPY_CONF)
    cherrypy.tree.mount(LinkController(repository, settings), '/link', config=CHERRYPY_CONF)

    cherrypy.engine.start()
    cherrypy.engine.block()


if __name__ == '__main__':
    main()

