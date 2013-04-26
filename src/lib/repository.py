import psycopg2
import psycopg2.pool


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
            self.db.putconn (self.conn)


    def getconn (self):
        return self.Connection (self.db)


    def add_tag (self, link_id, tag):
        print link_id, tag
        with (self.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute ('insert into linkdump_data.link_tag (lt_link_id, lt_tag_id) values (%s, %s)', (link_id[0], tag [0]))


    def save_link (self, url, notes, tags=None, actions=None):

        tag_rel = []
        with (self.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute ('insert into linkdump_data.link (l_url, l_notes) values (%s, %s) returning l_id', (url, notes))

                link_id = c.fetchone () [0]
                conn.commit ()
                if tags is not None:
                    c.execute ("""
with all_tags as (
    select t_id, t.name as name
    from linkdump_data.tag
        right join (select name
                    from unnest (%s) t (name)
                   ) t on t.name = t_name
),
inserted as (
    insert into linkdump_data.tag (t_name)
    select name
    from all_tags
    where t_id is null
    returning t_id, t_name as name
)

select *
from inserted
union
select *
from all_tags
where t_id is not null

""", (tags,))
                    tag_rel = c.fetchall ()
                    for t in tag_rel:
                        self.add_tag (link_id, t)


        return link_id

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
        q = """
select l_url, ARRAY (select t_name
                    from linkdump_data.link_tag
                        left join linkdump_data.tag on lt_tag_id = t_id
                    where lt_link_id = l_id)
from linkdump_data.link
where l_id = %s"""
        with (self.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute (q, (l_id, ))
                return c.fetchone ()

    def list_last_links (self, limit):
        q = """select l_id, l_url, ARRAY(select t_name 
                    from linkdump_data.link_tag 
                        join linkdump_data.tag on t_id = lt_tag_id 
                    where lt_link_id = l_id)
from linkdump_data.link
order by l_last_modified
limit %s"""

        with (self.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute (q, (limit,))
                return c.fetchall()

    def search (self, terms, tags, actions):

        q = """with links as (
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
"""
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


