DO $$
BEGIN
    PERFORM 1
    FROM information_schema.schemata
    WHERE schema_name = 'linkdump_api';

  IF NOT found
  THEN
    CREATE SCHEMA linkdump_api;
  END IF;
END $$;

SET search_path TO linkdump_api;

CREATE OR REPLACE FUNCTION save_link(
  p_link_id    INTEGER,
  p_url        TEXT,
  p_notes      TEXT,
  p_tags       TEXT [],
  p_actions    TEXT [],
  p_attributes TEXT []
)
  RETURNS INTEGER AS
  $BODY$

  DECLARE
    l_link_id INTEGER;
    l_n       TEXT;
  BEGIN
      PERFORM 1
      FROM linkdump_data.link
      WHERE l_id = p_link_id;

    IF NOT found
    THEN

      INSERT INTO linkdump_data.link (l_url, l_notes)
        VALUES (p_url, p_notes)
      RETURNING l_id
        INTO l_link_id;

    ELSE
      UPDATE linkdump_data.link
      SET l_url = p_url,
        l_notes = p_notes,
        l_last_modified = now()
      WHERE l_id = p_link_id;

      l_link_id := p_link_id;

    END IF;

    RAISE INFO 'setting tags';

    INSERT INTO linkdump_data.tag (t_name)
      SELECT
        name
      FROM linkdump_data.tag
        RIGHT JOIN (
                     SELECT
                       name
                     FROM unnest(p_tags) t (name)
                   ) t
          ON t.name = t_name
      WHERE t_name IS null;

    DELETE FROM linkdump_data.link_tag
    WHERE lt_link_id = l_link_id;

    INSERT INTO linkdump_data.link_tag (lt_link_id, lt_tag_id)
      SELECT
        l_link_id,
        t_id
      FROM (SELECT
              t_id
            FROM (
                   SELECT
                     name
                   FROM unnest(p_tags) t(name)
                 ) t
              JOIN linkdump_data.tag ON t.name = t_name
              LEFT JOIN linkdump_data.link_tag ON lt_tag_id = t_id
                                                  AND lt_link_id = l_link_id
            WHERE lt_tag_id IS null
           ) t;

    RAISE INFO 'setting actions';

    INSERT INTO linkdump_data.action (a_name)
      SELECT
        name
      FROM linkdump_data.action
        RIGHT JOIN (
                     SELECT
                       name
                     FROM unnest(p_actions) t (name)
                   ) t
          ON t.name = a_name
      WHERE a_name IS null;

    DELETE FROM linkdump_data.link_action
    WHERE la_link_id = l_link_id;

    INSERT INTO linkdump_data.link_action (la_link_id, la_action_id)
      SELECT
        l_link_id,
        a_id
      FROM (SELECT
              a_id
            FROM (
                   SELECT
                     name
                   FROM unnest(p_actions) t(name)
                 ) t
              JOIN linkdump_data.action ON t.name = a_name
              LEFT JOIN linkdump_data.link_action ON la_action_id = a_id
                                                     AND la_link_id = l_link_id
            WHERE la_action_id IS null
           ) t;

    RETURN l_link_id;

  END

  $BODY$
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER;


CREATE OR REPLACE FUNCTION get_link(
  INTEGER, -- id
      TEXT, -- url
  OUT INTEGER,
  OUT TEXT,
  OUT BOOLEAN
)
  RETURNS RECORD AS
  $BODY$

  SELECT
    l_id,
    l_url,
    ld_id IS NOT null AS has_data
  FROM linkdump_data.link
    LEFT JOIN linkdump_data.link_data ON ld_id = l_id
  WHERE l_id = $1
        OR l_url = $2;

  $BODY$
LANGUAGE SQL
VOLATILE
SECURITY DEFINER;


CREATE OR REPLACE FUNCTION save_link_data(
  p_link_id INTEGER,
  p_body    TEXT,
  p_raw     TEXT
)
  RETURNS void AS
  $BODY$

  BEGIN
      PERFORM 1
      FROM linkdump_data.link_data
      WHERE ld_id = p_link_id;
    IF NOT found
    THEN
      INSERT INTO linkdump_data.link_data (ld_link_id, ld_body, ld_raw)
        VALUES (p_link_id, p_body, p_raw);
    ELSE

      IF p_body IS NOT null
      THEN
        UPDATE linkdump_data.link_data
        SET ld_body = p_body
        WHERE ld_id = p_link_id;
      END IF;

      IF p_raw IS NOT null
      THEN
        UPDATE linkdump_data.link_data
        SET ld_raw = p_raw
        WHERE ld_id = p_link_id;
      END IF;


    END IF;
  END;

  $BODY$
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER;


RESET search_path;
