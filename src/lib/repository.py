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
        with (self.db.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute ('insert into linkdump_data.link_tag (lt_link_id, lt_tag_id) values (%s, %s)', (link_id[0], tag [0]))


    def save_link (self, url, notes, tags=None, actions=None):

        print tags, actions, url, notes

        tag_rel = []
        with (self.db.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute ('insert into linkdump_data.link (l_url, l_notes) values (%s, %s) returning l_id', (url, notes))

                link_id = c.fetchone ()
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


    def list_tags (self):
        with (self.db.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute ('select * from linkdump_data.tag order by t_name;')

    def list_actions (self):
         with (self.db.getconn ()) as conn:
            with (conn.cursor ()) as c:
                c.execute ('select * from linkdump_data.action order by a_name;')


    def load_link (self, l_id):
        q = """
select l_url, ARRAY (select t_name
                    from linkdump_data.link_tag
                        left join linkdump_data.tag on lt_tag_id = t_id
                    where lt_link_id = l_id)
from  linkdump_data.link """
