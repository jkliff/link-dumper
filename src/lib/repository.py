import psycopg2
import psycopg2.pool

if '2.5' > psycopg2.__version__:
    raise Exception ('SEVERE: psycopg version 2.5 or greater is required. Version in use was %s' % psycopg2.__version__)

SQL = {
    'save_link' : 'select * from linkdump_api.save_link (%s::integer, %s, %s, %s::text[], %s::text[], %s::text[])',

    'get_link' : 'select * from linkdump_api.get_link (%s::integer, %s::text) t(integer, text)',

    'search': """
with links as (
select distinct l_id
from linkdump_data.link
    left join linkdump_data.link_tag on lt_link_id = l_id
    left join linkdump_data.tag on t_id = lt_tag_id
where t_name = ANY(%s)
    or l_notes like ANY (%s)
    or l_url ilike ANY (%s)
)
select link.l_id, l_url, ARRAY (select t_name
                    from linkdump_data.link_tag
                        left join linkdump_data.tag on lt_tag_id = t_id
                    where lt_link_id = link.l_id)
from linkdump_data.link
    join links on links.l_id = link.l_id
""",

    'load_link': """
select l_id, l_url, l_notes,
    ARRAY ( select t_name
            from linkdump_data.link_tag
                left join linkdump_data.tag on lt_tag_id = t_id
            where lt_link_id = l_id),
    ARRAY ( select a_name
            from linkdump_data.link_action
                left join linkdump_data.action on la_action_id = a_id
            where la_link_id = l_id),
    l_created::text,
    l_last_modified::text
from linkdump_data.link
where l_id = %s"""

}


class Repository(object):
    def __init__ (self, db_conn_str):

        self.db = psycopg2.pool.ThreadedConnectionPool(0, 10, db_conn_str)

    class Connection:
        def __init__ (self, db):
            self.db = db

        def cursor ():
            return self.conn.cursor ()

        def __enter__ (self):
            self.conn = self.db.getconn ()
            return self.conn

        def __exit__(self, type, value, traceback):
            self.conn.commit ()
            self.db.putconn (self.conn)

    def getconn (self):
        return self.Connection (self.db)


    def get_link (self, link_id, url):
        with (self.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute (SQL ['get_link'], (link_id, url))
                r = c.fetchall ()[0]
                return r [0]



    def save_link (self, url, notes, link_id=None, tags=None, actions=None, attributes=None):

        resp = {}

        tag_rel = []
        with (self.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute (SQL ['get_link'], (None, url))
                r = c.fetchall ()[0]
                if link_id is None and r[0] is not None:
                    resp ['exists'] = True
                else:
                    c.execute (SQL ['save_link'], (link_id, url, notes, tags, actions, attributes))
                    resp ['link_id'] = c.fetchone () [0]

        return resp

    def list_tags (self):
        with (self.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute ('select * from linkdump_data.tag order by t_name;')
                return c.fetchall()

    def list_actions (self):
         with (self.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute ('select * from linkdump_data.action order by a_name;')
                return c.fetchall ()


    def load_link (self, l_id):
        q = SQL ['load_link']
        with (self.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute (q, (l_id, ))
                return c.fetchone ()

    def search (self, terms, tags, actions):

        q = SQL ['search']
        # remove # from tag name
        tags = remove_selector (tags)
        actions = remove_selector (actions)
        terms = to_like_expression (terms)

        with (self.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute (q, (tags, terms, terms)) #actions))
                return c.fetchall()


to_like_expression = lambda l: ['%%%s%%' % x for x in l]
remove_selector = lambda l: [x [1:] for x in l]


